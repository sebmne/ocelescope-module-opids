from typing import Protocol

from ocelescope_module_opid_conformance.application.ports.aligner import AlignmentJob


class JobRegistry(Protocol):
    """The jobs of running alignment runs, to cancel them."""

    def keep(self, run_id: str, job: AlignmentJob) -> None: ...

    def take(self, run_id: str) -> AlignmentJob | None: ...
