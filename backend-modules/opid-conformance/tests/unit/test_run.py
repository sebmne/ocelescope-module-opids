"""The run aggregate, without host or aligner."""

from datetime import UTC, datetime

import pytest

from ocelescope_module_opid_conformance.domain.exceptions import UnknownTraceGraph
from ocelescope_module_opid_conformance.domain.models.alignment import Alignment, Move
from ocelescope_module_opid_conformance.domain.models.event_log import EventLog, LogEvent
from ocelescope_module_opid_conformance.domain.models.run import AlignmentOutcome, Run, TraceGraph

LOG = EventLog(
    name="log",
    events=(
        LogEvent(index=0, id="e1", activity="a", timestamp=datetime(2024, 1, 1, tzinfo=UTC), objects=("o1",)),
        LogEvent(index=1, id="e2", activity="a", timestamp=datetime(2024, 1, 2, tzinfo=UTC), objects=("o2",)),
    ),
    object_types={"o1": "order", "o2": "order"},
)
GRAPHS = (TraceGraph(index=0, events=(0,), objects=("o1",)), TraceGraph(index=1, events=(1,), objects=("o2",)))
LOG_MOVE_ONLY = Alignment(cost=1, run=(), markings=({},), moves=(Move(kind="log", cost=1, step=None, event=0),))


def start() -> Run:
    return Run.start(opid_id="n", opid_name="net", ocel_id="l", log=LOG, timeout_seconds=60)


def statuses(run: Run) -> list[str]:
    return [graph.status for graph in run.summary().trace_graphs]


def test_trace_graphs_are_aligned_one_after_the_other() -> None:
    run = start().with_trace_graphs(GRAPHS)
    assert statuses(run) == ["aligning", "queued"]
    run = run.with_outcome(0, AlignmentOutcome(status="aligned", alignment=LOG_MOVE_ONLY, seconds=0.1))
    assert statuses(run) == ["aligned", "aligning"]
    assert run.summary().trace_graphs[0].cost == 1
    run = run.with_outcome(1, AlignmentOutcome(status="timeout", seconds=60))
    assert statuses(run) == ["aligned", "timeout"]
    run = run.finished()
    assert (run.status, run.summary().finished) == ("done", 2)


def test_a_failing_job_fails_the_open_trace_graphs() -> None:
    run = start().with_trace_graphs(GRAPHS).finished("boom")
    assert (run.status, run.error, statuses(run)) == ("failed", "boom", ["failed", "failed"])


def test_a_cancelled_run_stays_cancelled() -> None:
    run = start().with_trace_graphs(GRAPHS).cancelled()
    assert statuses(run) == ["cancelled", "cancelled"]
    late = run.with_outcome(0, AlignmentOutcome(status="aligned", alignment=LOG_MOVE_ONLY)).finished()
    assert late == run


def test_a_trace_graph_with_its_events() -> None:
    run = start().with_trace_graphs(GRAPHS)
    graph = run.trace_graph(1)
    assert ([e.id for e in graph.log], graph.object_types) == (["e2"], {"o2": "order"})
    with pytest.raises(UnknownTraceGraph):
        run.trace_graph(7)


def test_alignments_are_consistent() -> None:
    with pytest.raises(ValueError, match="sum of its move costs"):
        Alignment(cost=2, run=(), markings=({},), moves=(Move(kind="log", cost=1, step=None, event=0),))
    with pytest.raises(ValueError, match="wrong sides"):
        Move(kind="sync", cost=0, step=None, event=0)
