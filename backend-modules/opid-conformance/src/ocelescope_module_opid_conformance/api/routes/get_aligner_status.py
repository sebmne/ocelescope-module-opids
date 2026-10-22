from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_aligner_status
from ocelescope_module_opid_conformance.application.use_cases.get_aligner_status import GetAlignerStatus
from ocelescope_module_opid_conformance.domain.models.aligner import AlignerStatus

router = APIRouter()


@router.get("/aligner", operation_id="getAlignerStatus")
def aligner_status(use_case: Annotated[GetAlignerStatus, Depends(get_aligner_status)]) -> AlignerStatus:
    """Whether oCoCoMoT is installed."""
    return use_case.execute()
