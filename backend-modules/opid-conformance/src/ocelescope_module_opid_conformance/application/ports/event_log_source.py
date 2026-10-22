from typing import Protocol

from ocelescope_module_opid_conformance.domain.models.event_log import EventLog


class EventLogSource(Protocol):
    """The user's event logs, read as the aligner needs them."""

    def read(self, ocel_id: str) -> EventLog:
        """The log's events and object types; raises UnknownLog if there is none."""
        ...
