from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_list_petri_nets
from ocelescope_module_opid_conformance.application.use_cases.list_petri_nets import ListPetriNets
from ocelescope_module_opid_conformance.domain.models.object_centric_net import PetriNetSummary

router = APIRouter()


@router.get("/petri-nets", operation_id="listPetriNets")
def list_petri_nets(use_case: Annotated[ListPetriNets, Depends(get_list_petri_nets)]) -> tuple[PetriNetSummary, ...]:
    """The object-centric Petri nets among the session's resources."""
    return use_case.execute()
