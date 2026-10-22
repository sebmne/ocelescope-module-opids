from dataclasses import dataclass

from ocelescope_module_opid_conformance.application.ports.petri_net_source import PetriNetSource
from ocelescope_module_opid_conformance.domain.models.opid import OPIDDraft


@dataclass(frozen=True, kw_only=True)
class ConvertPetriNetCommand:
    net_id: str


class ConvertPetriNet:
    """Encodes an object-centric Petri net as an OPID (Remark 1), to be edited before it is kept."""

    def __init__(self, *, nets: PetriNetSource) -> None:
        self._nets = nets

    def execute(self, command: ConvertPetriNetCommand) -> OPIDDraft:
        name, net = self._nets.get(command.net_id)
        return OPIDDraft(name=name, opid=net.to_opid())
