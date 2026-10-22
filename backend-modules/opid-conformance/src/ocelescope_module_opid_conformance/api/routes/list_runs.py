from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_list_runs
from ocelescope_module_opid_conformance.application.use_cases.list_runs import ListRuns
from ocelescope_module_opid_conformance.domain.models.run import RunSummary

router = APIRouter()


@router.get("/runs", operation_id="listRuns")
def list_runs(use_case: Annotated[ListRuns, Depends(get_list_runs)]) -> tuple[RunSummary, ...]:
    """The session's runs, newest first."""
    return use_case.execute()
