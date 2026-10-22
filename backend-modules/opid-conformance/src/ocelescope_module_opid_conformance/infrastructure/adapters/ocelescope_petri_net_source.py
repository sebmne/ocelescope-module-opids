from ocelescope import PetriNet
from ocelescope.resource.default.petri_net import ArcType
from ocelescope_backend.app.internal.exceptions import NotFound
from ocelescope_backend.app.internal.model.resource import ResourceStore
from ocelescope_backend.app.internal.session import Session

from ocelescope_module_opid_conformance.domain.exceptions import UnknownPetriNet
from ocelescope_module_opid_conformance.domain.models.object_centric_net import (
    NetArc,
    NetPlace,
    NetTransition,
    ObjectCentricNet,
    PetriNetSummary,
)


class OcelescopePetriNetSource:
    """The object-centric Petri nets among the session's resources (Ocelescope's `PetriNet`,
    e.g. discovered by the inductive miner)."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list(self) -> tuple[PetriNetSummary, ...]:
        return tuple(
            PetriNetSummary.of(resource.id, resource.name, self.get(resource.id)[1])
            for resource in self._session.list_resources()
            if resource.schema_hash == PetriNet.get_schema_hash()
        )

    def get(self, net_id: str) -> tuple[str, ObjectCentricNet]:
        try:
            stored = self._session.get_resource(net_id)
        except NotFound as error:
            raise UnknownPetriNet(net_id) from error
        if stored.schema_hash != PetriNet.get_schema_hash():
            raise UnknownPetriNet(net_id)
        return stored.name, _to_net(stored)


def _to_net(stored: ResourceStore) -> ObjectCentricNet:
    net = PetriNet.model_validate({k: v for k, v in stored.data.items() if not k.startswith("_")})
    return ObjectCentricNet(
        places=tuple(
            NetPlace(
                id=place.name,
                object_type=place.object_type,
                initial=net.initial_marking.get(place.name, 0) > 0,
                final=net.final_marking.get(place.name, 0) > 0,
            )
            for place in net.places
        ),
        transitions=tuple(NetTransition(id=t.name, label=t.label) for t in net.transitions),
        arcs=tuple(
            NetArc(source=a.source, target=a.target, variable=a.type == ArcType.VARIABLE, weight=a.weight)
            for a in net.arcs
        ),
    )
