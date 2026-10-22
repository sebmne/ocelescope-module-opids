from fastapi import FastAPI
from ocelescope_backend.app.modules import Module, ModuleMeta
from packaging.version import Version

from ocelescope_module_opid_conformance.api.exception_handlers import register_exception_handlers
from ocelescope_module_opid_conformance.api.router import router
from ocelescope_module_opid_conformance.infrastructure.opid_resource import OPIDResource


class OPIDConformance(Module):
    # Mounted at /modules/opidConformance/v1. The frontend's `generate:api` script uses this key.
    meta = ModuleMeta(key="opidConformance", version=Version("1.0"))
    # The host lists, shows, exports and imports OPIDs as resources of their own type.
    resources = [OPIDResource]

    def create_app(self) -> FastAPI:
        app = FastAPI(title="OPID Conformance", version=str(self.meta.version), docs_url=None, redoc_url=None)
        register_exception_handlers(app)
        app.include_router(router)
        return app
