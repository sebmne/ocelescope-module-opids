from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_get_run
from ocelescope_module_opid_conformance.application.use_cases.get_run import GetRun, GetRunCommand
from ocelescope_module_opid_conformance.domain.models.run import RunSummary

router = APIRouter()


@router.get("/runs/{run_id}", operation_id="getRun")
def get_run(run_id: str, use_case: Annotated[GetRun, Depends(get_get_run)]) -> RunSummary:
    return use_case.execute(GetRunCommand(run_id=run_id))
