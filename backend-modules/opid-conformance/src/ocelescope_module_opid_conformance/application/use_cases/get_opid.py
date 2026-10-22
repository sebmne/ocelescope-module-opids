from dataclasses import dataclass

from ocelescope_module_opid_conformance.application.ports.opid_repository import OPIDRepository
from ocelescope_module_opid_conformance.domain.models.opid import OPID


@dataclass(frozen=True, kw_only=True)
class GetOPIDCommand:
    opid_id: str


class GetOPID:
    def __init__(self, *, opids: OPIDRepository) -> None:
        self._opids = opids

    def execute(self, command: GetOPIDCommand) -> OPID:
        _, opid = self._opids.get(command.opid_id)
        return opid
