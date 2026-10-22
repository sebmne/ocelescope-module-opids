from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_list_opids
from ocelescope_module_opid_conformance.application.use_cases.list_opids import ListOPIDs
from ocelescope_module_opid_conformance.domain.models.opid import OPIDSummary

router = APIRouter()


@router.get("/opids", operation_id="listOpids")
def list_opids(use_case: Annotated[ListOPIDs, Depends(get_list_opids)]) -> tuple[OPIDSummary, ...]:
    """The OPIDs among the session's resources."""
    return use_case.execute()
