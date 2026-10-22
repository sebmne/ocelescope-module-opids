"""Computes optimal alignments with oCoCoMoT and prints them as JSON lines.

Runs in its own process (see `adapters/cocomot_aligner.py`): Yices keeps global state, oCoCoMoT prints to stdout,
and a run must be cancellable. oCoCoMoT itself only prints its alignments as text, so this
script builds its encoding the same way `objectcentricconformance.py` does and decodes the
solver model into structured data instead.

    python -m ocelescope_module_opid_conformance.infrastructure.cocomot.runner \\
        --cocomot <checkout> --net net.pnml --log log.jsonocel [--timeout 600]

Output, one JSON object per line on stdout:
    {"type": "traces", "traces": [...]}      the trace graphs (connected components), in solving order
    {"type": "result", ...}                   one per trace graph, as soon as it is solved
"""

from __future__ import annotations

import argparse
import contextlib
import ctypes.util
import glob
import importlib.util
import json
import os
import sys
import time
import types
from typing import Any


def _use_bundled_yices() -> None:
    """Point the Yices bindings at the library shipped in the `yices-solver` wheel.

    The bindings look for `libyices.{so,dylib}` in the system paths only.
    """
    spec = importlib.util.find_spec("yices_solver")
    if spec is None or not spec.submodule_search_locations:
        return  # fall back to a system-wide installation
    lib_dir = os.path.join(list(spec.submodule_search_locations)[0], "lib")
    libs = [p for p in glob.glob(os.path.join(lib_dir, "libyices*")) if not p.endswith(".a")]
    if not libs:
        return
    find_library = ctypes.util.find_library
    ctypes.util.find_library = lambda name: libs[0] if name == "yices" else find_library(name)


def _import_cocomot(checkout: str) -> dict[str, Any]:
    _use_bundled_yices()
    sys.path.insert(0, os.path.join(checkout, "src"))
    # `dpn.dpn` imports the Z3 wrapper, which object-centric conformance checking never uses.
    sys.modules.setdefault("smt.z3solver", types.SimpleNamespace(Z3Solver=None))  # type: ignore[arg-type]
    with contextlib.redirect_stdout(sys.stderr):
        from dpn.read import read_pnml_input
        from objectcentric.encoding import Encoding
        from objectcentric.opi import OPI
        from objectcentric.read import ocel as read_ocel
        from smt.ysolver import YicesSolver
    return {
        "Encoding": Encoding,
        "OPI": OPI,
        "YicesSolver": YicesSolver,
        "read_ocel": read_ocel,
        "read_pnml_input": read_pnml_input,
    }


def _emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def _trace_summary(index: int, trace: Any) -> dict[str, Any]:
    return {
        "index": index,
        "events": [e.get_id() for e in trace.get_events()],
        "objects": sorted(trace.get_objects()),
    }


def _create_encoding(cocomot: dict[str, Any], solver: Any, trace: Any, net: Any) -> Any:
    """As `create_encoding` in oCoCoMoT's `objectcentricconformance.py`: a run starts empty
    (transitions with ν create the objects) and ends with at least one token in every final place
    and none in any other."""
    net.reset()
    encoding = cocomot["Encoding"](solver, net, trace)
    encoding.create_variables()
    solver.require(
        [
            encoding.initial_state(False),
            encoding.transition_range(),
            encoding.object_types(),
            encoding.freshness(),
            encoding.moving_tokens(),
            encoding.remaining_tokens(),
            encoding.data_constraints(),
            encoding.final_state(),
        ]
    )
    return encoding


def _decode(encoding: Any, model: Any, node_ids: dict[int, str]) -> dict[str, Any]:
    """The model run, its markings and the alignment moves of a solved encoding."""
    net = encoding._net
    trace = encoding._trace
    objects = encoding._objects
    names = encoding._object_name_by_id
    transitions = {t["id"]: t for t in net._transitions}
    run_length = model.eval_int(encoding._run_length_var)

    run = []
    for j in range(run_length):
        transition = transitions[model.eval_int(encoding._transition_vars[j])]
        binding: dict[str, Any] = {}
        for param in net.object_inscriptions_of_transition(transition, objects):
            obj = names.get(model.eval_int(encoding._object_vars[j][param["index"]]))
            if param["needed"]:
                binding[param["name"]] = obj
            elif obj is not None:
                values = binding.setdefault(param["name"], [])
                if obj not in values:
                    values.append(obj)
        run.append(
            {
                "transition": node_ids[transition["id"]],
                "label": transition.get("label"),
                "silent": bool(transition.get("invisible")),
                "binding": binding,
                "objects": sorted({o for v in binding.values() for o in (v if isinstance(v, list) else [v])}),
            }
        )

    markings = []
    for j in range(run_length + 1):
        marking: dict[str, list[list[str]]] = {}
        for place in net._places:
            tokens = encoding._marking_vars[j][place["id"]]
            marked = [list(token) for token, var in tokens.items() if model.eval_bool(var)]
            if marked:
                marking[node_ids[place["id"]]] = sorted(marked)
        markings.append(marking)

    # Walk the edit-distance matrix back from the end, as `Encoding.decode_alignment` does,
    # but keep which run step and which event each move covers.
    distances, moves = encoding._distance_vars, []
    i, j = run_length, len(trace)
    while i >= 0 and j >= 0 and (i > 0 or j > 0):
        cost_here = model.eval_int(distances[i][j])
        if model.eval_bool(encoding._vs_mod_move[i][j]):
            kind, step, event = "model", i - 1, None
            i -= 1
        elif model.eval_bool(encoding._vs_sync_move[i][j]):
            kind, step, event = "sync", i - 1, j - 1
            i, j = i - 1, j - 1
        else:
            kind, step, event = "log", None, j - 1
            j -= 1
        cost = cost_here - model.eval_int(distances[i][j])
        moves.append(
            {
                "kind": kind,
                "cost": cost,
                "step": step,
                "event": trace[event].get_id() if event is not None else None,
            }
        )
    moves.reverse()

    return {
        "cost": encoding.decode_alignment_cost(model),
        "run": run,
        "markings": markings,
        "moves": moves,
    }


def _align(cocomot: dict[str, Any], net: Any, trace: Any, timeout: float, node_ids: dict[int, str]) -> dict[str, Any]:
    solver = cocomot["YicesSolver"](euf=True)
    solver._timeout = timeout
    started = time.perf_counter()
    with contextlib.redirect_stdout(sys.stderr):
        encoding = _create_encoding(cocomot, solver, trace, net)
        distance = encoding.optimization_expression()
        solver.require([encoding.cache_constraints()])
        solver.require([encoding.edit_distance()])
        encoded = time.perf_counter() - started
        bound = encoding.get_step_bound() * encoding.get_max_objs_per_trans()
        model = solver.minimize(distance, max=bound)
    result: dict[str, Any] = {
        "encoding_seconds": round(encoded, 3),
        "solving_seconds": round(solver.t_solve, 3),
        "step_bound": encoding.get_step_bound(),
    }
    if model is None:
        result["status"] = "timeout" if solver.t_solve >= timeout else "no_alignment"
    else:
        result.update(status="aligned", **_decode(encoding, model, node_ids))
        model.destroy()
    solver.destroy()
    return result


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cocomot", required=True, help="checkout of bytekid/cocomot, branch object-centric")
    parser.add_argument("--net", required=True, help="OPID as PNML")
    parser.add_argument("--log", required=True, help="OCEL 1.0 JSON log")
    parser.add_argument("--timeout", type=float, default=600, help="seconds of solving per trace graph")
    parser.add_argument("--only", type=int, action="append", help="only align these trace graphs")
    args = parser.parse_args(argv)

    cocomot = _import_cocomot(args.cocomot)
    with contextlib.redirect_stdout(sys.stderr):
        raw = cocomot["read_pnml_input"](args.net)
        # OPI renumbers places, then transitions, in the order of the file
        original = [p["id"] for p in raw["places"]] + [t["id"] for t in raw["transitions"]]
        net = cocomot["OPI"](raw)
        log = cocomot["read_ocel"](args.log)
        traces = list(log.split_into_traces())
    node_ids = dict(enumerate(original))

    # smallest trace graphs first, as oCoCoMoT does
    traces.sort(key=lambda t: (len(t), len(t.get_objects()), t.smallest_object() or ""))
    _emit({"type": "traces", "traces": [_trace_summary(i, t) for i, t in enumerate(traces)]})

    for index, trace in enumerate(traces):
        if args.only and index not in args.only:
            continue
        try:
            result = _align(cocomot, net, trace, args.timeout, node_ids)
        except Exception as exc:  # report and continue with the next trace graph
            result = {"status": "error", "error": f"{type(exc).__name__}: {exc}"}
        _emit({"type": "result", "index": index, **result})


if __name__ == "__main__":
    main()
