from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_get_opid
from ocelescope_module_opid_conformance.application.use_cases.get_opid import GetOPID, GetOPIDCommand
from ocelescope_module_opid_conformance.domain.models.opid import OPID

router = APIRouter()


@router.get("/opids/{opid_id}", operation_id="getOpid")
def get_opid(opid_id: str, use_case: Annotated[GetOPID, Depends(get_get_opid)]) -> OPID:
    return use_case.execute(GetOPIDCommand(opid_id=opid_id))
