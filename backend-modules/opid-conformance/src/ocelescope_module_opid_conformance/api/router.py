from fastapi import APIRouter

from ocelescope_module_opid_conformance.api.routes import (
    cancel_run,
    convert_petri_net,
    delete_run,
    get_aligner_status,
    get_opid,
    get_run,
    get_trace_graph,
    list_opids,
    list_petri_nets,
    list_runs,
    read_pnml,
    save_opid,
    start_run,
)

router = APIRouter(tags=["OPID conformance"])

for resource in (
    get_aligner_status,
    read_pnml,
    list_petri_nets,
    convert_petri_net,
    save_opid,
    list_opids,
    get_opid,
    start_run,
    list_runs,
    get_run,
    get_trace_graph,
    cancel_run,
    delete_run,
):
    router.include_router(resource.router)
