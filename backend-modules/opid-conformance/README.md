# OPID Conformance backend module

Object-centric conformance alignments for Ocelescope, mounted at
`/modules/opidConformance/v1`, using FastAPI and hexagonal architecture.

The module aligns every trace graph of a log with an object-centric Petri net with identifiers
(OPID). A trace graph is a connected component of the log's object graph. The alignments are
computed with [oCoCoMoT](https://github.com/bytekid/cocomot/tree/object-centric), the SMT-based
tool of Gianola, Montali, Winkler: *Object-Centric Conformance Alignments with Synchronization*
(CAiSE 2024).

OPIDs are Ocelescope resources of their own type (`OPIDResource`, declared in `module.py`). The
host lists, shows, exports and imports them like any other resource.

```text
src/ocelescope_module_opid_conformance/
├── module.py                Ocelescope module and its resource type
├── domain/
│   ├── models/              Pydantic values, invariants, and owned behavior
│   │   ├── opid.py          OPID (Def. 4): arcs connect places and transitions, inscriptions match place colors
│   │   ├── object_centric_net.py  Object-centric Petri nets, and their OPID by Remark 1
│   │   ├── event_log.py     Events in timestamp order, with their objects
│   │   ├── alignment.py     Moves, the model run, its markings; cost = sum of move costs
│   │   ├── run.py           The run aggregate: trace graphs aligned one after the other
│   │   └── aligner.py
│   └── exceptions.py
├── application/
│   ├── ports/               Every external capability, as a structural protocol
│   ├── workflows/           RecordRunProgress: keeps a run up to date while its job reports
│   └── use_cases/           Entry operations + dataclass commands
├── infrastructure/
│   ├── adapters/            <technology>_<port>.py
│   ├── cocomot/             oCoCoMoT: its checkout, the OCEL 1.0 it reads, the runner process
│   ├── pnml.py              oCoCoMoT's PNML dialect, read and written
│   └── opid_resource.py     The OPID as an Ocelescope resource, with its visualization
└── api/
    ├── dependencies.py      Composition root: which adapter implements which port
    ├── router.py
    ├── exception_handlers.py
    ├── schema.py            Base for HTTP-only models
    └── routes/              One endpoint per file
```

## HTTP resources

| Method and path | Result |
| --- | --- |
| GET `/aligner` | Whether oCoCoMoT is installed, and where it is looked for |
| POST `/opid-drafts/pnml` | A PNML file read as an OPID draft (not kept); `422` if it holds none |
| GET `/petri-nets` | The object-centric Petri nets among the session's resources (Ocelescope's `PetriNet`) |
| POST `/opid-drafts/petri-net` | One of them encoded as an OPID draft by Remark 1: `{petriNetId}`; `422` for arc weights above 1 |
| POST `/opids` | `201`, a draft `{name, opid}` kept as an OPID resource; `422` if it is no OPID |
| PUT `/opids/{opid_id}` | A draft kept in place of an existing OPID |
| GET `/opids` | The OPIDs among the session's resources |
| GET `/opids/{opid_id}` | One OPID |
| POST `/runs` | `201`, a run started in the background: `{opidId, ocelId, timeoutSeconds}` |
| GET `/runs` | The session's runs, newest first, with their trace graphs' status and cost |
| GET `/runs/{run_id}` | One run |
| GET `/runs/{run_id}/trace-graphs/{index}` | A trace graph with its events and, once aligned, its alignment |
| POST `/runs/{run_id}/cancellation` | Stops a run |
| DELETE `/runs/{run_id}` | `204`, the run forgotten (and stopped) |

Unknown OPIDs, Petri nets, logs, runs and trace graphs are `404`. A missing oCoCoMoT is `503`.

An OPID is built in three ways, then edited in the frontend and saved:
- **PNML:** oCoCoMoT's dialect, with node positions (`graphics`) if the editor saved them.
- **An object-centric Petri net** of the session, e.g. a discovered one, encoded by Remark 1 of
  the paper (`ObjectCentricNet.to_opid`): per object type σ a variable v_σ and a list variable
  V_σ (o and O for order); a place of type σ gets the color ⟨σ⟩, an arc ⟨V_σ⟩ if it is variable,
  ⟨v_σ⟩ otherwise; the final marking stays, and initial places get silent ν creators (below).
- **By hand**, in the editor.

Markings, as oCoCoMoT reads them:
- **Start:** a run starts empty. Objects are created by transitions with ν, usually silent
  ones (as in Fig. 3 of the paper).
- **End:** a run ends with at least one token in every final place (`Place.final`) and none in
  any other.
- A place that holds objects at the start, i.e. an initial marking in a PNML file (oCoCoMoT's
  "fixed objects", e.g. `otests/09/net2.pnml`) or an initial place of an object-centric Petri net
  (Remark 1), gets a silent transition `create <type>` that creates its objects with ν
  (`OPID.creating_objects_in`). Example 6 of the paper argues for creating objects this way.

## Rules

- Dependencies point inwards: `module → api → infrastructure → application → domain`.
  - Application and domain import no FastAPI, Ocelescope, DuckDB or Yices.
  - The domain does not import the application, including its ports.
  - Routes reach adapters only through `api/dependencies.py`.
  - import-linter enforces all of this (contracts in `pyproject.toml`).
- Models own their invariants. `OPID` rejects arcs whose inscription does not have the color of
  their place, or that have more than one list variable. `Alignment` requires the move costs to
  add up to the cost, and every run step to be covered once, in order.
- `Run` is an aggregate. It changes only through its methods (`with_trace_graphs`,
  `with_outcome`, `finished`, `cancelled`), each returning the next state, so a late result
  cannot reopen a cancelled run. `RunRepository.change` applies them atomically: the job reports
  from its own thread.
- Ports are structural protocols, and adapters do not inherit them. Use cases have
  `execute(command)` with a plain dataclass command beside them.
- oCoCoMoT runs in a process of its own per run (`infrastructure/cocomot/runner.py`), because
  Yices keeps global state, oCoCoMoT prints to stdout, and a run must be cancellable.
  - oCoCoMoT only prints its alignments as text. The runner builds the encoding as oCoCoMoT's
    `objectcentricconformance.py` does, and decodes the solver model into the run, its markings
    and the moves.
  - The OPID reaches oCoCoMoT as PNML written from the resource, and the log as OCEL 1.0 with
    events numbered in timestamp order.

## Setup

oCoCoMoT is not a Python package and its repository has no license file, so it is not copied
into this module. Check it out at the pinned commit (into `vendor/cocomot`, gitignored):

```sh
uv run python -m ocelescope_module_opid_conformance.infrastructure.cocomot.checkout
```

To use a checkout somewhere else, set `OCOCOMOT_PATH`.

Yices comes from the `yices-solver` wheel. That wheel has no build for Linux on ARM, for
example a Docker image on Apple Silicon. There, install Yices 2 system-wide, or build the
image for `linux/amd64`.

Known limitations:
- Event attributes are not exported, so data-aware nets (DOPIDs) are aligned without data.
- Large trace graphs can take hours, as reported in the paper.

## Checks

`pnpm run check:backend` (repository root) runs ruff, pyright, import-linter and pytest. The
HTTP tests use real Ocelescope sessions. The alignment tests run oCoCoMoT's own examples,
whose file names end in the expected cost, and the running example of the paper
(`examples/orders`). They are skipped when oCoCoMoT is not checked out. Pure domain tests run
on their own:

```sh
uv run pytest tests/unit -q
```

## Adding an endpoint

1. Define domain models with their invariants and behavior.
2. For an external capability, add a port in `application/ports/` and an adapter in
   `infrastructure/adapters/`.
3. Add a use case in `application/use_cases/` with `execute(command)` and its dataclass command.
4. Assemble it in `api/dependencies.py`.
5. Add the endpoint in `api/routes/` with a stable operation id, and register it in `router.py`.
6. Run the checks. Then run `pnpm --filter @instance/opid-conformance build` to regenerate the
   frontend client.
