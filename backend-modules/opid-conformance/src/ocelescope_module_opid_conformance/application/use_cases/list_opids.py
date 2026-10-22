from ocelescope_module_opid_conformance.application.ports.opid_repository import OPIDRepository
from ocelescope_module_opid_conformance.domain.models.opid import OPIDSummary


class ListOPIDs:
    def __init__(self, *, opids: OPIDRepository) -> None:
        self._opids = opids

    def execute(self) -> tuple[OPIDSummary, ...]:
        return self._opids.list()
