from typing import Protocol

from ocelescope_module_opid_conformance.domain.models.object_centric_net import ObjectCentricNet, PetriNetSummary


class PetriNetSource(Protocol):
    """The object-centric Petri nets the user has, e.g. discovered ones."""

    def list(self) -> tuple[PetriNetSummary, ...]: ...

    def get(self, net_id: str) -> tuple[str, ObjectCentricNet]:
        """The name and the net; raises UnknownPetriNet if there is none."""
        ...
