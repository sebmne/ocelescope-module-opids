from typing import Protocol

from ocelescope_module_opid_conformance.domain.models.opid import OPID, OPIDSummary


class OPIDRepository(Protocol):
    """The OPIDs the user has, by id."""

    def add(self, opid: OPID, name: str) -> OPIDSummary: ...

    def replace(self, opid_id: str, opid: OPID, name: str) -> OPIDSummary:
        """Keeps the OPID under the id of an existing one; raises UnknownOPID if there is none."""
        ...

    def get(self, opid_id: str) -> tuple[str, OPID]:
        """The name and the OPID; raises UnknownOPID if there is none."""
        ...

    def list(self) -> tuple[OPIDSummary, ...]: ...
