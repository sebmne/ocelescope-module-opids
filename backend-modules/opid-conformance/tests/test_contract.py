"""The HTTP operations the generated frontend client is built from."""

from ocelescope_backend.app.modules.loader import build_module

from ocelescope_module_opid_conformance.module import OPIDConformance


def test_the_module_offers_these_operations() -> None:
    schema = build_module(OPIDConformance).create_app().openapi()
    operations = {
        (method.upper(), path, operation["operationId"])
        for path, methods in schema["paths"].items()
        for method, operation in methods.items()
    }
    assert operations == {
        ("GET", "/aligner", "getAlignerStatus"),
        ("POST", "/opid-drafts/pnml", "readPnml"),
        ("GET", "/petri-nets", "listPetriNets"),
        ("POST", "/opid-drafts/petri-net", "convertPetriNet"),
        ("POST", "/opids", "saveOpid"),
        ("PUT", "/opids/{opid_id}", "updateOpid"),
        ("GET", "/opids", "listOpids"),
        ("GET", "/opids/{opid_id}", "getOpid"),
        ("POST", "/runs", "startRun"),
        ("GET", "/runs", "listRuns"),
        ("GET", "/runs/{run_id}", "getRun"),
        ("GET", "/runs/{run_id}/trace-graphs/{index}", "getTraceGraph"),
        ("POST", "/runs/{run_id}/cancellation", "cancelRun"),
        ("DELETE", "/runs/{run_id}", "deleteRun"),
    }


def test_the_opid_is_a_resource_of_the_module() -> None:
    from ocelescope_module_opid_conformance.infrastructure.opid_resource import OPIDResource

    assert OPIDConformance.resources == [OPIDResource]
    assert OPIDResource.get_label() == "OPID"
