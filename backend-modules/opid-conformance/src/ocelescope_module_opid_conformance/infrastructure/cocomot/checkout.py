"""Where the oCoCoMoT checkout lives, and how to get it.

oCoCoMoT (Gianola, Montali, Winkler: Object-Centric Conformance Alignments with
Synchronization, CAiSE 2024) is not a Python package and its repository has no license file,
so it is not copied into this module. Instead it is checked out at a pinned commit:

    uv run python -m ocelescope_module_opid_conformance.infrastructure.cocomot.checkout

Set OCOCOMOT_PATH to use a checkout elsewhere (e.g. in a Docker image).
"""

import os
import subprocess
import sys
from pathlib import Path

REPOSITORY = "https://github.com/bytekid/cocomot.git"
BRANCH = "object-centric"
COMMIT = "386effa51e746f465ca2d020cef71401fc58e75e"
ENV_VAR = "OCOCOMOT_PATH"
# backend-modules/opid-conformance/vendor/cocomot when run from the workspace
DEFAULT_PATH = Path(__file__).resolve().parents[4] / "vendor" / "cocomot"


def configured_path() -> Path:
    return Path(os.environ.get(ENV_VAR) or DEFAULT_PATH)


def cocomot_path() -> Path | None:
    """The checkout, if it contains oCoCoMoT's object-centric code."""
    path = configured_path()
    return path if (path / "src" / "objectcentric" / "encoding.py").is_file() else None


def fetch(destination: Path) -> Path:
    """Check out the pinned commit of oCoCoMoT into `destination`."""
    if not (destination / ".git").exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["git", "clone", "--branch", BRANCH, "--single-branch", REPOSITORY, str(destination)],
            check=True,
        )
    subprocess.run(["git", "-C", str(destination), "checkout", "--quiet", COMMIT], check=True)
    return destination


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else configured_path()
    print(f"oCoCoMoT {COMMIT[:7]} checked out at {fetch(target)}")
