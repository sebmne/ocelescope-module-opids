from typing import Protocol

from ocelescope_module_opid_conformance.domain.models.run import RunSummary


class RunNotifier(Protocol):
    """Tells the user that a run has ended."""

    def run_ended(self, run: RunSummary) -> None: ...
