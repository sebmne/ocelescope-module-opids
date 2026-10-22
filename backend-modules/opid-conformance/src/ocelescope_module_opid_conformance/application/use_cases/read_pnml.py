from dataclasses import dataclass

from ocelescope_module_opid_conformance.application.ports.opid_reader import OPIDReader
from ocelescope_module_opid_conformance.domain.models.opid import OPIDDraft


@dataclass(frozen=True, kw_only=True)
class ReadPNMLCommand:
    name: str
    content: bytes


class ReadPNML:
    """Reads an OPID from a PNML file, to be edited before it is kept."""

    def __init__(self, *, reader: OPIDReader) -> None:
        self._reader = reader

    def execute(self, command: ReadPNMLCommand) -> OPIDDraft:
        return OPIDDraft(name=command.name, opid=self._reader.read(command.content))
