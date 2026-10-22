from ocelescope_module_opid_conformance.application.ports.run_repository import RunRepository
from ocelescope_module_opid_conformance.domain.models.run import RunSummary


class ListRuns:
    def __init__(self, *, runs: RunRepository) -> None:
        self._runs = runs

    def execute(self) -> tuple[RunSummary, ...]:
        return tuple(run.summary() for run in self._runs.list())
