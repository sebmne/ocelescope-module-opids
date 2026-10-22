from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_convert_petri_net
from ocelescope_module_opid_conformance.api.schema import ApiModel
from ocelescope_module_opid_conformance.application.use_cases.convert_petri_net import (
    ConvertPetriNet,
    ConvertPetriNetCommand,
)
from ocelescope_module_opid_conformance.domain.models.opid import OPIDDraft

router = APIRouter()


class ConvertPetriNetRequest(ApiModel):
    petri_net_id: str


@router.post(
    "/opid-drafts/petri-net",
    operation_id="convertPetriNet",
    responses={
        404: {"description": "There is no such object-centric Petri net."},
        422: {"description": "Remark 1 cannot encode the net, e.g. for arc weights above 1."},
    },
)
def convert_petri_net(
    request: ConvertPetriNetRequest, use_case: Annotated[ConvertPetriNet, Depends(get_convert_petri_net)]
) -> OPIDDraft:
    """Encodes one of the session's object-centric Petri nets as an OPID (Remark 1 of Gianola et
    al.), to be edited and then saved."""
    return use_case.execute(ConvertPetriNetCommand(net_id=request.petri_net_id))
