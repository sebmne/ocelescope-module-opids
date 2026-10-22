"""Markings as oCoCoMoT reads them: a final place holds at least one token at the end. An OPID
starts empty; a place that holds objects at the start gets a silent transition creating them."""

from ocelescope_module_opid_conformance.domain.models.opid import OPID, Arc, InscriptionVariable, Place, Transition
from ocelescope_module_opid_conformance.infrastructure.pnml import read_pnml, write_pnml

ITEM = (InscriptionVariable(name="i", type="item"),)


def test_final_places_survive_pnml() -> None:
    opid = OPID(
        places=(Place(id="stock", color=("item",)), Place(id="sold", color=("item",), final=True)),
        transitions=(Transition(id="sell", label="sell"),),
        arcs=(
            Arc(source="stock", target="sell", inscription=ITEM),
            Arc(source="sell", target="sold", inscription=ITEM),
        ),
    )
    assert read_pnml(write_pnml(opid)) == opid


def test_an_initial_place_gets_a_silent_transition_creating_its_objects() -> None:
    """oCoCoMoT's "fixed objects" nets (e.g. otests/09/net2.pnml) mark initial places."""
    pnml = (
        b'<pnml><net><page><place id="stock" color="item"><initialMarking><text>1</text></initialMarking></place>'
        b'<place id="pairs" color="item,box"><initialMarking><text>1</text></initialMarking></place>'
        b'<transition id="create_stock"><name><text>restock</text></name></transition>'
        b'<arc source="stock" target="create_stock" inscription="i:item"/>'
        b"</page></net></pnml>"
    )
    opid = read_pnml(pnml)
    creators = {t.id: t for t in opid.transitions if t.silent}
    # ids stay unique: create_stock is taken by a transition of the net
    assert {(t.id, t.label) for t in creators.values()} == {
        ("create_stock_", "create item"),
        ("create_pairs", "create item × box"),
    }
    created = {
        a.target: [(v.name, v.type, v.is_fresh) for v in a.inscription] for a in opid.arcs if a.source in creators
    }
    assert created == {
        "stock": [("nu", "item", True)],
        "pairs": [("nu1", "item", True), ("nu2", "box", True)],
    }
