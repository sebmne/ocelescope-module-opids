"""oCoCoMoT's PNML dialect: what is read is written back the same."""

from pathlib import Path

import pytest

from ocelescope_module_opid_conformance.domain.exceptions import InvalidOPID
from ocelescope_module_opid_conformance.infrastructure.cocomot import checkout
from ocelescope_module_opid_conformance.infrastructure.pnml import read_pnml, write_pnml

FIG3 = Path(__file__).resolve().parents[4] / "examples" / "orders" / "orders-opid.pnml"
NETS = [FIG3, *sorted((checkout.DEFAULT_PATH / "otests").glob("*/net*.pnml"))]


@pytest.mark.parametrize("path", NETS, ids=lambda p: f"{p.parent.name}/{p.name}")
def test_round_trip(path: Path) -> None:
    opid = read_pnml(path.read_bytes())
    assert read_pnml(write_pnml(opid)) == opid


def test_fig3() -> None:
    opid = read_pnml(FIG3.read_bytes())
    assert opid.object_types == ("order", "product")
    fresh = next(arc for arc in opid.arcs if arc.source == "new_order")
    assert fresh.inscription[0].is_fresh
    assert {p.id for p in opid.places if p.final} == {"shipped", "delivered"}


def test_more_than_one_list_variable_is_no_opid() -> None:
    two_lists = FIG3.read_bytes().replace(
        b'inscription="o:order,P:product LIST"/>\n\t\t\t<arc source="placed"',
        b'inscription="O:order LIST,P:product LIST"/>\n\t\t\t<arc source="placed"',
    )
    with pytest.raises(InvalidOPID, match="more than one list variable"):
        read_pnml(two_lists)
