from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import Field

from ocelescope_module_opid_conformance.api.dependencies import get_start_run
from ocelescope_module_opid_conformance.api.schema import ApiModel
from ocelescope_module_opid_conformance.application.use_cases.start_run import StartRun, StartRunCommand
from ocelescope_module_opid_conformance.domain.models.run import RunSummary

router = APIRouter()


class StartRunRequest(ApiModel):
    opid_id: str
    ocel_id: str
    timeout_seconds: float = Field(default=600, gt=0)


@router.post(
    "/runs",
    operation_id="startRun",
    status_code=201,
    responses={503: {"description": "oCoCoMoT is not installed."}},
)
def start_run(request: StartRunRequest, use_case: Annotated[StartRun, Depends(get_start_run)]) -> RunSummary:
    """Starts aligning every trace graph of the log with the OPID, in the background."""
    return use_case.execute(
        StartRunCommand(opid_id=request.opid_id, ocel_id=request.ocel_id, timeout_seconds=request.timeout_seconds)
    )
