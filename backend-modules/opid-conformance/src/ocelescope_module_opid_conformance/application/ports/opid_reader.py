from typing import Protocol

from ocelescope_module_opid_conformance.domain.models.opid import OPID


class OPIDReader(Protocol):
    """Reads an OPID from a file."""

    def read(self, content: bytes) -> OPID:
        """The OPID in the file; raises InvalidOPID if it holds none."""
        ...
