from ocelescope_module_opid_conformance.application.ports.aligner import Aligner
from ocelescope_module_opid_conformance.domain.models.aligner import AlignerStatus


class GetAlignerStatus:
    def __init__(self, *, aligner: Aligner) -> None:
        self._aligner = aligner

    def execute(self) -> AlignerStatus:
        return self._aligner.status()
