"""Writes the example logs as the DuckDB files Ocelescope opens as default logs.

    uv run python scripts/build-example-logs.py

The sources are the OCEL 2.0 JSON files in examples/; data/event_logs.json lists the results.
"""

from pathlib import Path

from ocelescope import OCEL

ROOT = Path(__file__).resolve().parents[1]
LOGS = {
    "examples/orders/orders-log.jsonocel": "data/event_logs/orders.db",
    "examples/partial-order/log.jsonocel": "data/event_logs/partial-order.db",
}

for source, target in LOGS.items():
    path = ROOT / target
    path.unlink(missing_ok=True)
    ocel = OCEL.read(ROOT / source)
    ocel.to_duckdb(path)
    ocel.close()
    print(f"{source} -> {target}")
