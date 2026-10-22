from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile

from ocelescope_module_opid_conformance.api.dependencies import get_read_pnml
from ocelescope_module_opid_conformance.application.use_cases.read_pnml import ReadPNML, ReadPNMLCommand
from ocelescope_module_opid_conformance.domain.models.opid import OPIDDraft

router = APIRouter()


@router.post(
    "/opid-drafts/pnml",
    operation_id="readPnml",
    responses={422: {"description": "The file holds no OPID in oCoCoMoT's PNML format."}},
)
async def read_pnml(file: UploadFile, use_case: Annotated[ReadPNML, Depends(get_read_pnml)]) -> OPIDDraft:
    """Reads an OPID from a PNML file, to be edited and then saved."""
    name = (file.filename or "OPID").removesuffix(".pnml").removesuffix(".xml")
    return use_case.execute(ReadPNMLCommand(name=name, content=await file.read()))
