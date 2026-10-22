from dataclasses import dataclass

from ocelescope_module_opid_conformance.application.ports.run_repository import RunRepository
from ocelescope_module_opid_conformance.domain.exceptions import UnknownRun
from ocelescope_module_opid_conformance.domain.models.run import TraceGraphAlignment


@dataclass(frozen=True, kw_only=True)
class GetTraceGraphCommand:
    run_id: str
    index: int


class GetTraceGraph:
    """A trace graph of a run, with its events and, once aligned, its alignment."""

    def __init__(self, *, runs: RunRepository) -> None:
        self._runs = runs

    def execute(self, command: GetTraceGraphCommand) -> TraceGraphAlignment:
        run = self._runs.get(command.run_id)
        if run is None:
            raise UnknownRun(command.run_id)
        return run.trace_graph(command.index)
