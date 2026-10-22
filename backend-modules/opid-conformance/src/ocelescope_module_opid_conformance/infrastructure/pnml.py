"""oCoCoMoT's PNML dialect for OPIDs, as `dpn.read.read_pnml_input` reads it.

Places carry a `color` attribute (comma-separated types), arcs an `inscription` attribute
(comma-separated `name:type`, where `type LIST` marks a list variable), and transitions may
be `invisible="true"`. Places and transitions may have a position (`graphics`), where an edited
net draws them.

Markings, as oCoCoMoT reads them: a place with a `finalMarking` above 0 is final (it holds at
least one token at the end). An OPID starts empty, so a place with an `initialMarking` above 0
(oCoCoMoT's "fixed objects") gets a silent transition that creates its objects with ν.
"""

import xml.etree.ElementTree as ET

from pydantic import ValidationError

from ocelescope_module_opid_conformance.domain.exceptions import InvalidOPID
from ocelescope_module_opid_conformance.domain.models.opid import (
    OPID,
    Arc,
    InscriptionVariable,
    Place,
    Position,
    Transition,
)

_LIST = " LIST"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in element if _local(child.tag) == name]


def _text(element: ET.Element, name: str) -> str | None:
    for child in _children(element, name):
        for text in _children(child, "text"):
            if text.text and text.text.strip():
                return text.text.strip()
    return None


def _marked(place: ET.Element, kind: str) -> bool:
    value = _text(place, kind)
    return value is not None and value.isdigit() and int(value) > 0


def _position(element: ET.Element) -> Position | None:
    for graphics in _children(element, "graphics"):
        for position in _children(graphics, "position"):
            try:
                return Position(x=float(position.get("x", "")), y=float(position.get("y", "")))
            except ValueError:
                return None
    return None


def _write_position(element: ET.Element, position: Position | None) -> None:
    if position is not None:
        graphics = ET.SubElement(element, "graphics")
        ET.SubElement(graphics, "position", x=f"{position.x:g}", y=f"{position.y:g}")


def _inscription(value: str) -> tuple[InscriptionVariable, ...]:
    variables = []
    for part in value.split(","):
        name, _, typ = part.strip().partition(":")
        if not name or not typ:
            raise InvalidOPID(f"The inscription {value!r} is no list of name:type.")
        variables.append(InscriptionVariable(name=name, type=typ.removesuffix(_LIST), is_list=typ.endswith(_LIST)))
    return tuple(variables)


def read_pnml(content: bytes) -> OPID:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as error:
        raise InvalidOPID(f"The file is no XML: {error}") from error
    elements = list(root.iter())

    places = []
    initial = []
    for element in (e for e in elements if _local(e.tag) == "place"):
        place_id, color = element.get("id"), element.get("color")
        if not place_id or not color:
            raise InvalidOPID(f"The place {place_id or '?'} needs an id and a color.")
        places.append(
            Place(
                id=place_id,
                color=tuple(c.strip() for c in color.split(",")),
                final=_marked(element, "finalMarking"),
                position=_position(element),
            )
        )
        if _marked(element, "initialMarking"):
            initial.append(place_id)

    transitions = []
    for element in (e for e in elements if _local(e.tag) == "transition"):
        transition_id = element.get("id")
        if not transition_id:
            raise InvalidOPID("Every transition needs an id.")
        transitions.append(
            Transition(
                id=transition_id,
                label=_text(element, "name") or transition_id,
                silent=element.get("invisible") == "true",
                position=_position(element),
            )
        )

    arcs = []
    for element in (e for e in elements if _local(e.tag) == "arc"):
        source, target, inscription = element.get("source"), element.get("target"), element.get("inscription")
        if not source or not target or not inscription:
            raise InvalidOPID(f"The arc {source} → {target} needs a source, a target and an inscription.")
        arcs.append(
            Arc(
                source=source,
                target=target,
                inscription=_inscription(inscription),
                exact_synchronization=element.get("synchronization") == "exact",
            )
        )

    try:
        opid = OPID(places=tuple(places), transitions=tuple(transitions), arcs=tuple(arcs))
    except ValidationError as error:
        raise InvalidOPID(str(error)) from error
    return opid.creating_objects_in(initial)


def write_pnml(opid: OPID) -> bytes:
    pnml = ET.Element("pnml")
    net = ET.SubElement(pnml, "net", id="opid", type="http://www.pnml.org/version-2009/grammar/pnmlcoremodel")
    page = ET.SubElement(net, "page", id="page1")

    def name(parent: ET.Element, text: str) -> None:
        ET.SubElement(ET.SubElement(parent, "name"), "text").text = text

    for place in opid.places:
        element = ET.SubElement(page, "place", id=place.id, color=",".join(place.color))
        name(element, place.id)  # oCoCoMoT reads a place's name (for exact synchronization)
        _write_position(element, place.position)
        if place.final:
            ET.SubElement(ET.SubElement(element, "finalMarking"), "text").text = "1"
    for transition in opid.transitions:
        attributes = {"id": transition.id} | ({"invisible": "true"} if transition.silent else {})
        element = ET.SubElement(page, "transition", attributes)
        name(element, transition.label)
        _write_position(element, transition.position)
    for arc in opid.arcs:
        inscription = ",".join(f"{v.name}:{v.type}{_LIST if v.is_list else ''}" for v in arc.inscription)
        attributes = {"source": arc.source, "target": arc.target, "inscription": inscription}
        if arc.exact_synchronization:
            attributes["synchronization"] = "exact"
        ET.SubElement(page, "arc", attributes)
    return ET.tostring(pnml, encoding="utf-8", xml_declaration=True)
