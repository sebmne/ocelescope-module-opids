import json
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from ocelescope_module_opid_conformance.application.ports.aligner import AlignmentListener
from ocelescope_module_opid_conformance.domain.exceptions import AlignerUnavailable
from ocelescope_module_opid_conformance.domain.models.aligner import AlignerStatus
from ocelescope_module_opid_conformance.domain.models.alignment import Alignment
from ocelescope_module_opid_conformance.domain.models.event_log import EventLog
from ocelescope_module_opid_conformance.domain.models.opid import OPID
from ocelescope_module_opid_conformance.domain.models.run import AlignmentOutcome, TraceGraph
from ocelescope_module_opid_conformance.infrastructure.cocomot import checkout
from ocelescope_module_opid_conformance.infrastructure.cocomot.ocel1 import to_ocel1
from ocelescope_module_opid_conformance.infrastructure.pnml import write_pnml

_RUNNER = "ocelescope_module_opid_conformance.infrastructure.cocomot.runner"
_STATUSES = {"aligned": "aligned", "timeout": "timeout", "no_alignment": "no_alignment", "error": "failed"}


class CocomotAligner:
    """oCoCoMoT, run in a process of its own per job (`cocomot/runner.py`): Yices keeps
    global state, oCoCoMoT prints to stdout, and a job must be cancellable."""

    def status(self) -> AlignerStatus:
        return AlignerStatus(available=checkout.cocomot_path() is not None, location=str(checkout.configured_path()))

    def start(self, opid: OPID, log: EventLog, timeout_seconds: float, listener: AlignmentListener) -> "_CocomotJob":
        cocomot = checkout.cocomot_path()
        if cocomot is None:
            raise AlignerUnavailable(
                f"oCoCoMoT is not checked out at {checkout.configured_path()}. Run "
                f"`uv run python -m {checkout.__name__}` or set {checkout.ENV_VAR}."
            )
        workdir = Path(tempfile.mkdtemp(prefix="opid_conformance_"))
        (workdir / "net.pnml").write_bytes(write_pnml(opid))
        (workdir / "log.jsonocel").write_text(json.dumps(to_ocel1(log)))
        command = [
            sys.executable, "-m", _RUNNER,
            "--cocomot", str(cocomot),
            "--net", str(workdir / "net.pnml"),
            "--log", str(workdir / "log.jsonocel"),
            "--timeout", str(timeout_seconds),
        ]  # fmt: skip
        return _CocomotJob(command, workdir, listener)


class _CocomotJob:
    def __init__(self, command: list[str], workdir: Path, listener: AlignmentListener) -> None:
        self._workdir = workdir
        self._listener = listener
        self._cancelled = threading.Event()
        self._stderr = (workdir / "stderr.log").open("w")
        self._process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=self._stderr, text=True, cwd=workdir)
        threading.Thread(target=self._follow, daemon=True).start()

    def cancel(self) -> None:
        self._cancelled.set()
        if self._process.poll() is None:
            self._process.terminate()

    def _follow(self) -> None:
        assert self._process.stdout is not None
        for line in self._process.stdout:
            if self._cancelled.is_set():
                break
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                continue
            if message["type"] == "traces":
                self._listener.trace_graphs_found(
                    tuple(
                        TraceGraph(index=t["index"], events=tuple(t["events"]), objects=tuple(t["objects"]))
                        for t in message["traces"]
                    )
                )
            elif message["type"] == "result":
                self._listener.trace_graph_aligned(message["index"], _outcome(message))
        returncode = self._process.wait()
        self._stderr.close()
        error = None
        if returncode != 0 and not self._cancelled.is_set():
            tail = (self._workdir / "stderr.log").read_text(errors="replace").strip().splitlines()[-15:]
            error = "\n".join(tail) or f"oCoCoMoT exited with code {returncode}"
        shutil.rmtree(self._workdir, ignore_errors=True)
        self._listener.finished(error)


def _outcome(message: dict[str, Any]) -> AlignmentOutcome:
    seconds = None
    if "solving_seconds" in message:
        seconds = round(message.get("encoding_seconds", 0) + message["solving_seconds"], 3)
    status = _STATUSES.get(message["status"], "failed")
    if status != "aligned":
        return AlignmentOutcome(status=status, seconds=seconds, error=message.get("error"))  # type: ignore[arg-type]
    try:
        alignment = Alignment.model_validate(
            {
                "cost": message["cost"],
                "run": message["run"],
                "markings": message["markings"],
                "moves": message["moves"],
            }
        )
    except ValidationError as error:
        return AlignmentOutcome(status="failed", seconds=seconds, error=f"Unreadable alignment: {error}")
    return AlignmentOutcome(status="aligned", alignment=alignment, seconds=seconds)
