"""Alignments, checked against oCoCoMoT's examples, whose file names end in the expected
alignment cost (trace1_6: cost 6), and against the running example of the paper."""

import pytest
from api import Api
from conftest import finished_run, needs_cocomot
from logs import EXAMPLES, OTESTS, ocel_from_ocel1
from ocelescope import OCEL
from ocelescope_backend.app.internal.session import Session

pytestmark = needs_cocomot


def opid(api: Api, path) -> str:
    response = api.import_opid(path.name, path.read_bytes())
    assert response.status_code == 201, response.text
    return response.json()["id"]


@pytest.mark.parametrize(
    ("case", "log", "cost"),
    [("02", "trace1_6", 6), ("02", "trace2_0", 0), ("03", "trace1_4", 4), ("13", "trace2_5", 5)],
)
def test_alignments_have_the_expected_cost(api: Api, session: Session, case: str, log: str, cost: int) -> None:
    opid_id = opid(api, OTESTS / case / "net.pnml")
    ocel_id = session.add_ocel(ocel_from_ocel1(OTESTS / case / f"{log}.jsonocel"), name=log)
    started = api.start_run(opid_id, ocel_id, timeoutSeconds=120)
    assert started.status_code == 201, started.text
    run = finished_run(api, started.json()["id"])

    assert run["status"] == "done", run
    assert [(g["status"], g["cost"]) for g in run["traceGraphs"]] == [("aligned", cost)]
    assert run["finished"] == 1

    graph = api.get_trace_graph(run["id"], 0).json()
    alignment = graph["alignment"]
    assert sum(move["cost"] for move in alignment["moves"]) == alignment["cost"] == cost
    events = [move["event"] for move in alignment["moves"] if move["event"] is not None]
    assert events == [event["index"] for event in graph["log"]]  # every event once, in order
    for move in alignment["moves"]:
        if move["kind"] == "sync":
            event = next(e for e in graph["log"] if e["index"] == move["event"])
            step = alignment["run"][move["step"]]
            assert step["label"] == event["activity"]
            assert sorted(step["objects"]) == sorted(event["objects"])


def test_the_running_example_of_the_paper(api: Api, session: Session) -> None:
    """Fig. 3 and Example 1 of Gianola et al.: the swapped products cost 8 (Fig. 4)."""
    opid_id = opid(api, EXAMPLES / "orders" / "orders-opid.pnml")
    ocel_id = session.add_ocel(OCEL.read(EXAMPLES / "orders" / "orders-log.jsonocel"), name="orders")
    run = finished_run(api, api.start_run(opid_id, ocel_id).json()["id"])
    assert [(g["objects"], g["cost"]) for g in run["traceGraphs"]] == [(["o1", "o2", "p1", "p2"], 8)]
    assert (run["opidName"], run["ocelName"]) == ("orders-opid", "orders")

    graph = api.get_trace_graph(run["id"], 0).json()
    assert graph["objectTypes"] == {"o1": "order", "o2": "order", "p1": "product", "p2": "product"}
    fresh = graph["alignment"]["run"][0]
    assert fresh["silent"] and list(fresh["binding"]) == ["nu"]
    kinds = [(m["kind"], m["cost"]) for m in graph["alignment"]["moves"] if m["cost"]]
    assert sorted(kinds) == [("log", 2), ("log", 2), ("model", 2), ("model", 2)]


def partial_order_log(pick_first: bool) -> OCEL:
    """examples/partial-order: pick item {p1} and place order {o1} share no object."""
    log = OCEL.read(EXAMPLES / "partial-order" / "log.jsonocel")
    if pick_first:
        return log
    events = log.events.df
    swapped = events.copy()
    first, second = events["ocel:timestamp"].iloc[0], events["ocel:timestamp"].iloc[1]
    swapped.loc[swapped["ocel:activity"] == "pick item", "ocel:timestamp"] = second
    swapped.loc[swapped["ocel:activity"] == "place order", "ocel:timestamp"] = first
    return OCEL.from_frames(events=swapped, objects=log.objects.df, relations=log.e2o.df)


@pytest.mark.parametrize(("pick_first", "cost"), [(True, 2), (False, 0)])
def test_the_solver_misses_alignments_against_the_timestamp_order(
    api: Api, session: Session, pick_first: bool, cost: int
) -> None:
    """examples/partial-order: the net assigns the product to its order (silently) between
    placing the order and picking the product, so place order fires before pick item.

    Read as the proof of the optimality theorem builds alignments (log edges from the trace
    graph, model edges from the run), both logs have a perfect alignment: the trace graph
    leaves pick item and place order unordered. oCoCoMoT aligns the events in timestamp
    order, though, and misses it when the product is picked first: cost 2 instead of 0."""
    opid_id = opid(api, EXAMPLES / "partial-order" / "opid.pnml")
    ocel_id = session.add_ocel(partial_order_log(pick_first), name="partial order")
    run = finished_run(api, api.start_run(opid_id, ocel_id).json()["id"])
    graph = api.get_trace_graph(run["id"], 0).json()
    assert [e["activity"] for e in graph["log"]][:2] == (
        ["pick item", "place order"] if pick_first else ["place order", "pick item"]
    )
    assert graph["cost"] == cost


def test_cancel_and_delete_a_run(api: Api, session: Session) -> None:
    opid_id = opid(api, OTESTS / "02" / "net.pnml")
    ocel_id = session.add_ocel(ocel_from_ocel1(OTESTS / "02" / "trace1_6.jsonocel"), name="log")
    run_id = api.start_run(opid_id, ocel_id).json()["id"]
    cancelled = api.cancel_run(run_id).json()
    assert cancelled["status"] in ("cancelled", "done")
    assert api.delete_run(run_id).status_code == 204
    assert api.list_runs().json() == []
    assert api.get_run(run_id).status_code == 404


def test_unknown_things_are_404(api: Api, session: Session) -> None:
    assert api.start_run("nope", "nope").status_code == 404
    opid_id = opid(api, OTESTS / "02" / "net.pnml")
    assert api.start_run(opid_id, "nope").status_code == 404
    assert api.get_trace_graph("nope", 0).status_code == 404
    assert api.cancel_run("nope").status_code == 404
