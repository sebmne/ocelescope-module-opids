from api import Api
from conftest import needs_cocomot
from logs import EXAMPLES, OTESTS
from ocelescope_backend.app.internal.registry import registry_manager
from ocelescope_backend.app.internal.session import Session

from ocelescope_module_opid_conformance.infrastructure.opid_resource import OPIDResource

FIG3 = (EXAMPLES / "orders" / "orders-opid.pnml").read_bytes()


def test_a_pnml_file_is_read_as_a_draft_and_kept_once_saved(api: Api, session: Session) -> None:
    read = api.read_pnml("orders-opid.pnml", FIG3)
    assert read.status_code == 200, read.text
    draft = read.json()
    assert draft["name"] == "orders-opid"
    assert len(draft["opid"]["places"]) == 8
    assert session.list_resources() == []  # a draft is not kept

    created = api.save_opid(draft)
    assert created.status_code == 201, created.text
    summary = created.json()
    assert summary == {
        "id": summary["id"],
        "name": "orders-opid",
        "places": 8,
        "transitions": 6,
        "objectTypes": ["order", "product"],
    }
    # the host lists it among the session's resources, as an OPID, and can show it
    (resource,) = session.list_resources()
    assert (resource.id, resource.resource_type_label) == (summary["id"], "OPID")
    instance = registry_manager.get_resource_instance(session.get_resource(summary["id"]).data)
    assert isinstance(instance, OPIDResource)
    graph = instance.visualize()
    assert {node.id for node in graph.nodes} >= {"place_order", "ship", "items"}
    assert {edge.label for edge in graph.edges} >= {"ν", "(o, P)", "(o, p)", "o", "P"}
    assert {edge.label for edge in graph.edges if edge.style and edge.style.dashed} == {"P", "(o, P)"}

    assert api.list_opids().json() == [summary]
    opid = api.get_opid(summary["id"]).json()
    items = next(p for p in opid["places"] if p["id"] == "items")
    assert items["color"] == ["order", "product"]


def test_an_edited_opid_replaces_the_saved_one(api: Api, session: Session) -> None:
    draft = api.read_pnml("orders-opid.pnml", FIG3).json()
    opid_id = api.save_opid(draft).json()["id"]

    places = draft["opid"]["places"]
    places[0] = {**places[0], "position": {"x": 10, "y": 20.5}}
    updated = api.update_opid(opid_id, {"name": "orders (edited)", "opid": draft["opid"]})
    assert updated.status_code == 200, updated.text
    assert updated.json()["id"] == opid_id

    (resource,) = session.list_resources()
    assert resource.name == "orders (edited)"
    first = api.get_opid(opid_id).json()["places"][0]
    assert first["position"] == {"x": 10, "y": 20.5}
    assert "name" not in first  # places are known by their color
    assert api.update_opid("nope", draft).status_code == 404


def test_positions_survive_pnml() -> None:
    from ocelescope_module_opid_conformance.domain.models.opid import Position
    from ocelescope_module_opid_conformance.infrastructure.pnml import read_pnml, write_pnml

    opid = read_pnml(FIG3)
    moved = opid.model_copy(
        update={"places": (opid.places[0].model_copy(update={"position": Position(x=1.5, y=-2)}), *opid.places[1:])}
    )
    assert read_pnml(write_pnml(moved)).places[0].position == Position(x=1.5, y=-2)


def test_other_resources_are_no_opids(api: Api, session: Session) -> None:
    from ocelescope import PetriNet
    from ocelescope_backend.app.internal.model.resource import ResourceStore

    other = session.add_resource(ResourceStore.from_resource(PetriNet(), name="a net"))
    assert api.list_opids().json() == []
    assert api.get_opid(other).status_code == 404
    assert api.get_opid("nope").status_code == 404


def test_nets_that_are_no_opids_are_rejected(api: Api) -> None:
    assert api.read_pnml("x.pnml", b"no xml").status_code == 422
    plain = b'<pnml><net><page><place id="p"/><transition id="t"/></page></net></pnml>'
    response = api.read_pnml("plain.pnml", plain)
    assert response.status_code == 422
    assert "color" in response.json()["detail"]
    wrong_color = FIG3.replace(b'inscription="o:order,p:product"', b'inscription="o:order"', 1)
    response = api.read_pnml("wrong.pnml", wrong_color)
    assert response.status_code == 422
    assert "has the types order, its place has the color order, product" in response.json()["detail"]

    # an edited net is checked as it is saved
    draft = api.read_pnml("orders-opid.pnml", FIG3).json()
    draft["opid"]["arcs"][0]["inscription"][0]["type"] = "product"  # ν of an order place
    response = api.save_opid(draft)
    assert response.status_code == 422
    assert "its place has the color order" in response.json()["detail"]


@needs_cocomot
def test_every_example_net_of_cocomot_is_an_opid(api: Api) -> None:
    for path in sorted(OTESTS.glob("*/net*.pnml")):
        response = api.import_opid(path.name, path.read_bytes())
        assert response.status_code == 201, (path, response.text)
