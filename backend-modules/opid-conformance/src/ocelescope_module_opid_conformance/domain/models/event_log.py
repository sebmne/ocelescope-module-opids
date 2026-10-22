from datetime import datetime
from typing import Self

from pydantic import model_validator

from ocelescope_module_opid_conformance.domain.models.base import Model


class LogEvent(Model):
    """An event, numbered by its position in timestamp order."""

    index: int
    id: str
    activity: str
    timestamp: datetime
    objects: tuple[str, ...]


class EventLog(Model):
    """The events of a log with the objects they involve, in timestamp order."""

    name: str
    events: tuple[LogEvent, ...]
    object_types: dict[str, str]

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        if any(event.index != position for position, event in enumerate(self.events)):
            raise ValueError("Events are numbered 0, 1, ... in timestamp order.")
        untyped = {o for event in self.events for o in event.objects} - self.object_types.keys()
        if untyped:
            raise ValueError(f"Objects without a type: {sorted(untyped)}")
        return self
