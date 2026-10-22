from dataclasses import dataclass

from ocelescope_module_opid_conformance.application.ports.aligner import Aligner
from ocelescope_module_opid_conformance.application.ports.event_log_source import EventLogSource
from ocelescope_module_opid_conformance.application.ports.job_registry import JobRegistry
from ocelescope_module_opid_conformance.application.ports.opid_repository import OPIDRepository
from ocelescope_module_opid_conformance.application.ports.run_notifier import RunNotifier
from ocelescope_module_opid_conformance.application.ports.run_repository import RunRepository
from ocelescope_module_opid_conformance.application.workflows.record_run_progress import RecordRunProgress
from ocelescope_module_opid_conformance.domain.models.run import Run, RunSummary


@dataclass(frozen=True, kw_only=True)
class StartRunCommand:
    opid_id: str
    ocel_id: str
    timeout_seconds: float


class StartRun:
    """Starts aligning every trace graph of a log with an OPID, in the background."""

    def __init__(
        self,
        *,
        opids: OPIDRepository,
        logs: EventLogSource,
        aligner: Aligner,
        runs: RunRepository,
        jobs: JobRegistry,
        notifier: RunNotifier,
    ) -> None:
        self._opids = opids
        self._logs = logs
        self._aligner = aligner
        self._runs = runs
        self._jobs = jobs
        self._notifier = notifier

    def execute(self, command: StartRunCommand) -> RunSummary:
        name, opid = self._opids.get(command.opid_id)
        log = self._logs.read(command.ocel_id)
        run = Run.start(
            opid_id=command.opid_id,
            opid_name=name,
            ocel_id=command.ocel_id,
            log=log,
            timeout_seconds=command.timeout_seconds,
        )
        self._runs.add(run)
        progress = RecordRunProgress(run_id=run.id, runs=self._runs, jobs=self._jobs, notifier=self._notifier)
        try:
            job = self._aligner.start(opid, log, command.timeout_seconds, progress)
        except Exception:
            self._runs.remove(run.id)
            raise
        self._jobs.keep(run.id, job)
        current = self._runs.get(run.id)
        return (current or run).summary()
