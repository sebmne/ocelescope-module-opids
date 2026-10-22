from ocelescope_module_opid_conformance.domain.models.opid import OPID
from ocelescope_module_opid_conformance.infrastructure.pnml import read_pnml


class PnmlOPIDReader:
    """OPIDs from PNML files in oCoCoMoT's dialect."""

    def read(self, content: bytes) -> OPID:
        return read_pnml(content)
