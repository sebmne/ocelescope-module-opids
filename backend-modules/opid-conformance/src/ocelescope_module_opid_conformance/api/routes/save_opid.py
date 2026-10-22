from typing import Annotated, Any

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_save_opid
from ocelescope_module_opid_conformance.application.use_cases.save_opid import SaveOPID, SaveOPIDCommand
from ocelescope_module_opid_conformance.domain.models.opid import OPIDDraft, OPIDSummary

router = APIRouter()

_INVALID: dict[int | str, dict[str, Any]] = {422: {"description": "The net is no OPID; the message says why."}}
_UPDATE: dict[int | str, dict[str, Any]] = {404: {"description": "There is no such OPID."}, **_INVALID}


@router.post("/opids", operation_id="saveOpid", status_code=201, responses=_INVALID)
def save_opid(draft: OPIDDraft, use_case: Annotated[SaveOPID, Depends(get_save_opid)]) -> OPIDSummary:
    """Keeps an OPID as a new Ocelescope resource."""
    return use_case.execute(SaveOPIDCommand(draft=draft))


@router.put(
    "/opids/{opid_id}", operation_id="updateOpid", responses={404: {"description": "No such OPID."}, **_INVALID}
)
def update_opid(opid_id: str, draft: OPIDDraft, use_case: Annotated[SaveOPID, Depends(get_save_opid)]) -> OPIDSummary:
    """Keeps an OPID in place of an existing one."""
    return use_case.execute(SaveOPIDCommand(draft=draft, opid_id=opid_id))
