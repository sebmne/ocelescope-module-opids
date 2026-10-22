from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ocelescope_module_opid_conformance.domain.exceptions import (
    AlignerUnavailable,
    InvalidOPID,
    UnknownLog,
    UnknownOPID,
    UnknownPetriNet,
    UnknownRun,
    UnknownTraceGraph,
)

_STATUS: dict[type[Exception], int] = {
    UnknownOPID: 404,
    UnknownPetriNet: 404,
    UnknownLog: 404,
    UnknownRun: 404,
    UnknownTraceGraph: 404,
    InvalidOPID: 422,
    AlignerUnavailable: 503,
}


def register_exception_handlers(app: FastAPI) -> None:
    """Maps the module's own errors to HTTP statuses."""
    for error_type, status in _STATUS.items():

        def handle(request: Request, error: Exception, status: int = status) -> JSONResponse:
            return JSONResponse(status_code=status, content={"detail": str(error)})

        app.add_exception_handler(error_type, handle)
