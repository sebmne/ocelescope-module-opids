from typing import Annotated

from fastapi import APIRouter, Depends

from ocelescope_module_opid_conformance.api.dependencies import get_get_trace_graph
from ocelescope_module_opid_conformance.application.use_cases.get_trace_graph import GetTraceGraph, GetTraceGraphCommand
from ocelescope_module_opid_conformance.domain.models.run import TraceGraphAlignment

router = APIRouter()


@router.get("/runs/{run_id}/trace-graphs/{index}", operation_id="getTraceGraph")
def get_trace_graph(
    run_id: str, index: int, use_case: Annotated[GetTraceGraph, Depends(get_get_trace_graph)]
) -> TraceGraphAlignment:
    """A trace graph with its events and, once aligned, its optimal alignment."""
    return use_case.execute(GetTraceGraphCommand(run_id=run_id, index=index))
