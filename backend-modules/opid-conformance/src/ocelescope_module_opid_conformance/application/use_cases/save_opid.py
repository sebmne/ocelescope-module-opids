from dataclasses import dataclass

from ocelescope_module_opid_conformance.application.ports.opid_repository import OPIDRepository
from ocelescope_module_opid_conformance.domain.models.opid import OPIDDraft, OPIDSummary


@dataclass(frozen=True, kw_only=True)
class SaveOPIDCommand:
    draft: OPIDDraft
    # the OPID to overwrite; None keeps the draft as a new one
    opid_id: str | None = None


class SaveOPID:
    """Keeps an edited OPID, as a new one or in place of an existing one."""

    def __init__(self, *, opids: OPIDRepository) -> None:
        self._opids = opids

    def execute(self, command: SaveOPIDCommand) -> OPIDSummary:
        if command.opid_id is None:
            return self._opids.add(command.draft.opid, command.draft.name)
        return self._opids.replace(command.opid_id, command.draft.opid, command.draft.name)
