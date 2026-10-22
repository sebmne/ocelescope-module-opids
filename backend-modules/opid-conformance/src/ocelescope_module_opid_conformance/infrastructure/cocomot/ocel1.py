"""The OCEL 1.0 JSON that oCoCoMoT reads."""

from typing import Any

from ocelescope_module_opid_conformance.domain.models.event_log import EventLog


def to_ocel1(log: EventLog) -> dict[str, Any]:
    """oCoCoMoT orders a trace's events by their integer id: the events' indices, which
    follow the timestamps."""
    return {
        "ocel:global-log": {
            "ocel:attribute-names": [],
            "ocel:object-types": sorted(set(log.object_types.values())),
            "ocel:version": ["1.0"],
            "ocel:ordering": ["timestamp"],
        },
        "ocel:events": {
            str(event.index): {
                "ocel:activity": event.activity,
                "ocel:timestamp": event.timestamp.isoformat(),
                "ocel:omap": list(event.objects),
                "ocel:vmap": {},
            }
            for event in log.events
        },
        "ocel:objects": {o: {"ocel:type": t, "ocel:ovmap": {}} for o, t in log.object_types.items()},
    }
