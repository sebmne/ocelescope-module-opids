from typing import Protocol

from ocelescope_module_opid_conformance.domain.models.aligner import AlignerStatus
from ocelescope_module_opid_conformance.domain.models.event_log import EventLog
from ocelescope_module_opid_conformance.domain.models.opid import OPID
from ocelescope_module_opid_conformance.domain.models.run import AlignmentOutcome, TraceGraph


class AlignmentListener(Protocol):
    """Hears how an alignment job proceeds. Called from the job's own thread."""

    def trace_graphs_found(self, graphs: tuple[TraceGraph, ...]) -> None:
        """The trace graphs, in the order they will be aligned."""
        ...

    def trace_graph_aligned(self, index: int, outcome: AlignmentOutcome) -> None: ...

    def finished(self, error: str | None) -> None:
        """The job ended, normally (no error) or not."""
        ...


class AlignmentJob(Protocol):
    def cancel(self) -> None: ...


class Aligner(Protocol):
    """Computes optimal alignments of an OPID and every trace graph of a log."""

    def status(self) -> AlignerStatus: ...

    def start(self, opid: OPID, log: EventLog, timeout_seconds: float, listener: AlignmentListener) -> AlignmentJob:
        """Starts aligning in the background; raises AlignerUnavailable if it cannot."""
        ...
