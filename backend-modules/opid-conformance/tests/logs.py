"""Logs for the tests: oCoCoMoT's OCEL 1.0 examples as Ocelescope OCELs."""

import json
from pathlib import Path

import pandas as pd
from ocelescope import OCEL

from ocelescope_module_opid_conformance.infrastructure.cocomot import checkout

OTESTS = checkout.DEFAULT_PATH / "otests"
EXAMPLES = Path(__file__).resolve().parents[3] / "examples"


def ocel_from_ocel1(path: Path) -> OCEL:
    data = json.loads(path.read_text())
    events = pd.DataFrame(
        [
            {
                "ocel:eid": f"e{eid}",
                # oCoCoMoT's examples share timestamps; keep the order of their ids
                "ocel:timestamp": pd.Timestamp(e["ocel:timestamp"]).tz_convert("UTC")
                + pd.Timedelta(microseconds=int(eid)),
                "ocel:activity": e["ocel:activity"],
            }
            for eid, e in data["ocel:events"].items()
        ]
    )
    objects = pd.DataFrame([{"ocel:oid": o, "ocel:type": d["ocel:type"]} for o, d in data["ocel:objects"].items()])
    types = dict(zip(objects["ocel:oid"], objects["ocel:type"], strict=True))
    relations = pd.DataFrame(
        [
            {"ocel:eid": f"e{eid}", "ocel:oid": o, "ocel:qualifier": "", "ocel:type": types[o]}
            for eid, e in data["ocel:events"].items()
            for o in e["ocel:omap"]
        ]
    )
    return OCEL.from_frames(events=events, objects=objects, relations=relations)
