from ocelescope_module_opid_conformance.application.ports.petri_net_source import PetriNetSource
from ocelescope_module_opid_conformance.domain.models.object_centric_net import PetriNetSummary


class ListPetriNets:
    def __init__(self, *, nets: PetriNetSource) -> None:
        self._nets = nets

    def execute(self) -> tuple[PetriNetSummary, ...]:
        return self._nets.list()
