from ocelescope_backend.app.internal.exceptions import NotFound
from ocelescope_backend.app.internal.model.resource import ResourceStore
from ocelescope_backend.app.internal.session import Session

from ocelescope_module_opid_conformance.domain.exceptions import UnknownOPID
from ocelescope_module_opid_conformance.domain.models.opid import OPID, OPIDSummary
from ocelescope_module_opid_conformance.infrastructure.opid_resource import OPIDResource


class OcelescopeOPIDRepository:
    """OPIDs kept as Ocelescope resources of the session: the host lists, shows, exports
    and imports them like any other resource."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, opid: OPID, name: str) -> OPIDSummary:
        resource = OPIDResource.from_opid(opid)
        opid_id = self._session.add_resource(ResourceStore.from_resource(resource, name=name))
        return OPIDSummary.of(opid_id, name, opid)

    def replace(self, opid_id: str, opid: OPID, name: str) -> OPIDSummary:
        # The host has no update of a resource: the stored one gets the new data, and renaming
        # it tells the frontend that the resources changed.
        stored = self._stored(opid_id)
        stored.data = ResourceStore.from_resource(OPIDResource.from_opid(opid), name=name).data
        self._session.rename_resource(opid_id, name)
        return OPIDSummary.of(opid_id, name, opid)

    def get(self, opid_id: str) -> tuple[str, OPID]:
        stored = self._stored(opid_id)
        return stored.name, _to_opid(stored)

    def _stored(self, opid_id: str) -> ResourceStore:
        try:
            stored = self._session.get_resource(opid_id)
        except NotFound as error:
            raise UnknownOPID(opid_id) from error
        if stored.schema_hash != OPIDResource.get_schema_hash():
            raise UnknownOPID(opid_id)
        return stored

    def list(self) -> tuple[OPIDSummary, ...]:
        return tuple(
            OPIDSummary.of(resource.id, resource.name, self.get(resource.id)[1])
            for resource in self._session.list_resources()
            if resource.schema_hash == OPIDResource.get_schema_hash()
        )


def _to_opid(stored: ResourceStore) -> OPID:
    data = {k: v for k, v in stored.data.items() if not k.startswith("_")}
    return OPIDResource.model_validate(data).to_opid()
