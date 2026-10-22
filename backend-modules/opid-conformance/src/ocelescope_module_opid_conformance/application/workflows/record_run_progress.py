from ocelescope_module_opid_conformance.application.ports.job_registry import JobRegistry
from ocelescope_module_opid_conformance.application.ports.run_notifier import RunNotifier
from ocelescope_module_opid_conformance.application.ports.run_repository import RunRepository
from ocelescope_module_opid_conformance.domain.models.run import AlignmentOutcome, TraceGraph


class RecordRunProgress:
    """Keeps a run up to date while its job reports, and tells the user when it ends."""

    def __init__(self, *, run_id: str, runs: RunRepository, jobs: JobRegistry, notifier: RunNotifier) -> None:
        self._run_id = run_id
        self._runs = runs
        self._jobs = jobs
        self._notifier = notifier

    def trace_graphs_found(self, graphs: tuple[TraceGraph, ...]) -> None:
        self._runs.change(self._run_id, lambda run: run.with_trace_graphs(graphs))

    def trace_graph_aligned(self, index: int, outcome: AlignmentOutcome) -> None:
        self._runs.change(self._run_id, lambda run: run.with_outcome(index, outcome))

    def finished(self, error: str | None) -> None:
        self._jobs.take(self._run_id)
        run = self._runs.change(self._run_id, lambda run: run.finished(error))
        if run is not None and run.status != "cancelled":
            self._notifier.run_ended(run.summary())
