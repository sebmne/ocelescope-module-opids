from typing import Any

from fastapi.testclient import TestClient
from httpx import Response


class Api:
    """The module's HTTP operations, by operation id. The paths live here only."""

    def __init__(self, client: TestClient) -> None:
        self._client = client

    def get_aligner_status(self) -> Response:
        return self._client.get("/aligner")

    def read_pnml(self, name: str, content: bytes) -> Response:
        return self._client.post("/opid-drafts/pnml", files={"file": (name, content, "application/xml")})

    def list_petri_nets(self) -> Response:
        return self._client.get("/petri-nets")

    def convert_petri_net(self, petri_net_id: str) -> Response:
        return self._client.post("/opid-drafts/petri-net", json={"petriNetId": petri_net_id})

    def save_opid(self, draft: dict[str, Any]) -> Response:
        return self._client.post("/opids", json=draft)

    def update_opid(self, opid_id: str, draft: dict[str, Any]) -> Response:
        return self._client.put(f"/opids/{opid_id}", json=draft)

    def import_opid(self, name: str, content: bytes) -> Response:
        """Reads a PNML file and saves the OPID as it is: the response of whichever fails, else of
        saving."""
        read = self.read_pnml(name, content)
        return read if read.status_code != 200 else self.save_opid(read.json())

    def list_opids(self) -> Response:
        return self._client.get("/opids")

    def get_opid(self, opid_id: str) -> Response:
        return self._client.get(f"/opids/{opid_id}")

    def start_run(self, opid_id: str, ocel_id: str, **body: Any) -> Response:
        return self._client.post("/runs", json={"opidId": opid_id, "ocelId": ocel_id, **body})

    def list_runs(self) -> Response:
        return self._client.get("/runs")

    def get_run(self, run_id: str) -> Response:
        return self._client.get(f"/runs/{run_id}")

    def get_trace_graph(self, run_id: str, index: int) -> Response:
        return self._client.get(f"/runs/{run_id}/trace-graphs/{index}")

    def cancel_run(self, run_id: str) -> Response:
        return self._client.post(f"/runs/{run_id}/cancellation")

    def delete_run(self, run_id: str) -> Response:
        return self._client.delete(f"/runs/{run_id}")
