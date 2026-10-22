"""Object-centric Petri nets of the session, encoded as OPIDs by Remark 1 of Gianola et al."""

from api import Api
from conftest import finished_run, needs_cocomot
from logs import EXAMPLES
from ocelescope import OCEL, PetriNet
from ocelescope.resource.default.petri_net import Arc, ArcType, Place, Transition
from ocelescope_backend.app.internal.model.resource import ResourceStore
from ocelescope_backend.app.internal.session import Session


def fig1a() -> PetriNet:
    """The object-centric Petri net of Fig. 1(a): place order takes any number of products."""
    net = PetriNet()
    for name, object_type in [
        ("o0", "order"), ("o1", "order"), ("o2", "order"), ("o3", "order"),
        ("p0", "product"), ("p1", "product"), ("p2", "product"), ("p3", "product"),
    ]:  # fmt: skip
        net.add_place(Place(name=name, object_type=object_type))
    for name in ["place order", "payment", "pick item", "ship"]:
        net.add_transition(Transition(name=name, label=name))
    for source, target, variable in [
        ("o0", "place order", False), ("p0", "place order", True),
        ("place order", "o1", False), ("place order", "p1", True),
        ("o1", "payment", False), ("payment", "o2", False),
        ("p1", "pick item", False), ("pick item", "p2", False),
        ("o2", "ship", False), ("p2", "ship", True),
        ("ship", "o3", False), ("ship", "p3", True),
    ]:  # fmt: skip
        net.add_arc(Arc(source=source, target=target, type=ArcType.VARIABLE if variable else ArcType.NORMAL))
    net.initial_marking = {"o0": 1, "p0": 1}
    net.final_marking = {"o3": 1, "p3": 1}
    return net


def test_a_petri_net_is_encoded_by_remark_1(api: Api, session: Session) -> None:
    net_id = session.add_resource(ResourceStore.from_resource(fig1a(), name="discovered"))
    assert api.list_petri_nets().json() == [
        {"id": net_id, "name": "discovered", "places": 8, "transitions": 4, "objectTypes": ["order", "product"]}
    ]

    response = api.convert_petri_net(net_id)
    assert response.status_code == 200, response.text
    draft = response.json()
    assert draft["name"] == "discovered"
    opid = draft["opid"]
    # a place of type σ has the color ⟨σ⟩; the final marking stays
    places = {p["id"]: p for p in opid["places"]}
    assert places["p1"]["color"] == ["product"]
    assert [p for p in places if places[p]["final"]] == ["o3", "p3"]
    # an OPID starts empty: a silent transition creates the objects of each initial place (ν)
    creators = {t["id"]: t for t in opid["transitions"] if t["silent"]}
    assert {(t["id"], t["label"]) for t in creators.values()} == {
        ("create_o0", "create order"),
        ("create_p0", "create product"),
    }
    created = {a["target"]: a["inscription"] for a in opid["arcs"] if a["source"] in creators}
    assert created == {
        "o0": [{"name": "nu", "type": "order", "isList": False}],
        "p0": [{"name": "nu", "type": "product", "isList": False}],
    }
    # an arc gets ⟨V_σ⟩ if it is variable, ⟨v_σ⟩ otherwise
    inscriptions = {(a["source"], a["target"]): a["inscription"] for a in opid["arcs"]}
    assert inscriptions["p0", "place order"] == [{"name": "P", "type": "product", "isList": True}]
    assert inscriptions["p1", "pick item"] == [{"name": "p", "type": "product", "isList": False}]
    assert inscriptions["o2", "ship"] == [{"name": "o", "type": "order", "isList": False}]

    # the draft is kept like any other
    assert api.save_opid(draft).status_code == 201


def test_what_remark_1_cannot_encode_is_rejected(api: Api, session: Session) -> None:
    net = fig1a()
    net.arcs[0] = net.arcs[0].model_copy(update={"weight": 2})
    net_id = session.add_resource(ResourceStore.from_resource(net, name="weighted"))
    response = api.convert_petri_net(net_id)
    assert response.status_code == 422
    assert "weight 2" in response.json()["detail"]
    assert api.convert_petri_net("nope").status_code == 404


@needs_cocomot
def test_the_encoded_net_misses_the_wrong_shipments(api: Api, session: Session) -> None:
    """Example 1: the object-centric Petri net of Fig. 1(a) does not track which products belong
    to which order, so the swapped shipments of the log are synchronous moves (Fig. 1(b)), while
    the OPID of Fig. 3 costs 8. In this log, pick item also names the order, which Fig. 1(a)'s
    pick item does not take: a log move (2 objects) and a model move (1) each, cost 6."""
    net_id = session.add_resource(ResourceStore.from_resource(fig1a(), name="fig1a"))
    opid_id = api.save_opid(api.convert_petri_net(net_id).json()).json()["id"]
    ocel_id = session.add_ocel(OCEL.read(EXAMPLES / "orders" / "orders-log.jsonocel"), name="orders")
    run = finished_run(api, api.start_run(opid_id, ocel_id).json()["id"])
    assert [(g["status"], g["cost"]) for g in run["traceGraphs"]] == [("aligned", 6)]

    graph = api.get_trace_graph(run["id"], 0).json()
    alignment = graph["alignment"]
    activity = {e["index"]: e["activity"] for e in graph["log"]}
    ships = [m for m in alignment["moves"] if m["event"] is not None and activity[m["event"]] == "ship"]
    assert [m["kind"] for m in ships] == ["sync", "sync"]
    deviations = sorted(
        (m["kind"], m["cost"], activity[m["event"]] if m["event"] is not None else alignment["run"][m["step"]]["label"])
        for m in alignment["moves"]
        if m["cost"]
    )
    assert deviations == [("log", 2, "pick item")] * 2 + [("model", 1, "pick item")] * 2
