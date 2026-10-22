"""An alignment run: one OPID against one log, a trace graph at a time."""

from datetime import UTC, datetime
from typing import Literal, Self
from uuid import uuid4

from pydantic import computed_field

from ocelescope_module_opid_conformance.domain.exceptions import UnknownTraceGraph
from ocelescope_module_opid_conformance.domain.models.alignment import Alignment
from ocelescope_module_opid_conformance.domain.models.base import Model
from ocelescope_module_opid_conformance.domain.models.event_log import EventLog, LogEvent

RunStatus = Literal["running", "done", "failed", "cancelled"]
TraceGraphStatus = Literal["queued", "aligning", "aligned", "timeout", "no_alignment", "failed", "cancelled"]
Outcome = Literal["aligned", "timeout", "no_alignment", "failed"]
_OPEN: frozenset[TraceGraphStatus] = frozenset({"queued", "aligning"})


class TraceGraph(Model):
    """A connected component of the log's object graph, aligned on its own."""

    index: int
    events: tuple[int, ...]  # LogEvent indices
    objects: tuple[str, ...]


class TraceGraphResult(Model):
    """Where a trace graph stands in a run, without its alignment."""

    index: int
    events: int
    objects: tuple[str, ...]
    object_types: dict[str, str]
    status: TraceGraphStatus
    cost: int | None = None
    seconds: float | None = None
    error: str | None = None


class TraceGraphAlignment(TraceGraphResult):
    """A trace graph with its events and its alignment."""

    log: tuple[LogEvent, ...]
    alignment: Alignment | None


class AlignmentOutcome(Model):
    """How aligning one trace graph ended."""

    status: Outcome
    alignment: Alignment | None = None
    seconds: float | None = None
    error: str | None = None


class _TraceGraphState(Model):
    graph: TraceGraph
    status: TraceGraphStatus = "queued"
    outcome: AlignmentOutcome | None = None

    def result(self, object_types: dict[str, str]) -> TraceGraphResult:
        outcome = self.outcome
        return TraceGraphResult(
            index=self.graph.index,
            events=len(self.graph.events),
            objects=self.graph.objects,
            object_types={o: object_types[o] for o in self.graph.objects if o in object_types},
            status=self.status,
            cost=outcome.alignment.cost if outcome and outcome.alignment else None,
            seconds=outcome.seconds if outcome else None,
            error=outcome.error if outcome else None,
        )


class RunSummary(Model):
    id: str
    opid_id: str
    opid_name: str
    ocel_id: str
    ocel_name: str
    created_at: datetime
    timeout_seconds: float
    status: RunStatus
    error: str | None
    trace_graphs: tuple[TraceGraphResult, ...]

    @computed_field
    @property
    def finished(self) -> int:
        return sum(graph.status not in _OPEN for graph in self.trace_graphs)


class Run(Model):
    """The aggregate: the only way to change a run is through its methods, each returning the
    next state. Trace graphs are aligned one after the other, smallest first."""

    id: str
    opid_id: str
    opid_name: str
    ocel_id: str
    timeout_seconds: float
    log: EventLog
    created_at: datetime
    status: RunStatus = "running"
    error: str | None = None
    graphs: tuple[_TraceGraphState, ...] = ()

    @classmethod
    def start(cls, *, opid_id: str, opid_name: str, ocel_id: str, log: EventLog, timeout_seconds: float) -> Self:
        return cls(
            id=str(uuid4()),
            opid_id=opid_id,
            opid_name=opid_name,
            ocel_id=ocel_id,
            log=log,
            timeout_seconds=timeout_seconds,
            created_at=datetime.now(UTC),
        )

    def with_trace_graphs(self, graphs: tuple[TraceGraph, ...]) -> Self:
        states = tuple(_TraceGraphState(graph=graph) for graph in graphs)
        return self._next(graphs=states)

    def with_outcome(self, index: int, outcome: AlignmentOutcome) -> Self:
        if self.status != "running":
            return self
        graphs = tuple(
            state.model_copy(update={"status": outcome.status, "outcome": outcome})
            if state.graph.index == index
            else state
            for state in self.graphs
        )
        return self._next(graphs=graphs)

    def finished(self, error: str | None = None) -> Self:
        if self.status != "running":
            return self
        graphs = tuple(
            state.model_copy(update={"status": "failed"}) if state.status in _OPEN else state for state in self.graphs
        )
        return self.model_copy(update={"status": "failed" if error else "done", "error": error, "graphs": graphs})

    def cancelled(self) -> Self:
        if self.status != "running":
            return self
        graphs = tuple(
            state.model_copy(update={"status": "cancelled"}) if state.status in _OPEN else state
            for state in self.graphs
        )
        return self.model_copy(update={"status": "cancelled", "graphs": graphs})

    def summary(self) -> RunSummary:
        return RunSummary(
            id=self.id,
            opid_id=self.opid_id,
            opid_name=self.opid_name,
            ocel_id=self.ocel_id,
            ocel_name=self.log.name,
            created_at=self.created_at,
            timeout_seconds=self.timeout_seconds,
            status=self.status,
            error=self.error,
            trace_graphs=tuple(state.result(self.log.object_types) for state in self.graphs),
        )

    def trace_graph(self, index: int) -> TraceGraphAlignment:
        state = next((s for s in self.graphs if s.graph.index == index), None)
        if state is None:
            raise UnknownTraceGraph(self.id, index)
        return TraceGraphAlignment(
            **state.result(self.log.object_types).model_dump(by_alias=False),
            log=tuple(self.log.events[i] for i in state.graph.events),
            alignment=state.outcome.alignment if state.outcome else None,
        )

    def _next(self, graphs: tuple[_TraceGraphState, ...]) -> Self:
        """Marks the first queued trace graph as being aligned, unless one already is."""
        if not any(state.status == "aligning" for state in graphs):
            upcoming = next((i for i, state in enumerate(graphs) if state.status == "queued"), None)
            if upcoming is not None:
                graphs = tuple(
                    state.model_copy(update={"status": "aligning"}) if i == upcoming else state
                    for i, state in enumerate(graphs)
                )
        return self.model_copy(update={"graphs": graphs})
