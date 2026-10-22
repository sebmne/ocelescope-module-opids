"""Object-centric Petri nets as van der Aalst and Berti define them, and as OPIDs encode them
(Gianola, Montali, Winkler, CAiSE 2024, Remark 1)."""

from typing import Self

from pydantic import Field

from ocelescope_module_opid_conformance.domain.exceptions import InvalidOPID
from ocelescope_module_opid_conformance.domain.models.base import Model
from ocelescope_module_opid_conformance.domain.models.opid import (
    OPID,
    Arc,
    InscriptionVariable,
    Place,
    Transition,
)


class NetPlace(Model):
    id: str = Field(min_length=1)
    object_type: str = Field(min_length=1)
    initial: bool = False
    final: bool = False


class NetTransition(Model):
    id: str = Field(min_length=1)
    # None for a silent transition
    label: str | None = None


class NetArc(Model):
    source: str
    target: str
    variable: bool = False
    weight: int = 1


def _variable_names(object_types: list[str]) -> dict[str, str]:
    """A short variable name per object type, its first letter as in the paper (o for order,
    p for product), numbered when two types share it. Being a letter and digits, a name never
    contains "nu", which would make it a fresh variable."""
    names: dict[str, str] = {}
    used: set[str] = set()
    for object_type in object_types:
        letter = next((c.lower() for c in object_type if c.isascii() and c.isalpha()), "x")
        name, index = letter, 1
        while name in used:
            index += 1
            name = f"{letter}{index}"
        used.add(name)
        names[object_type] = name
    return names


class ObjectCentricNet(Model):
    """An object-centric Petri net: every place holds objects of one type, and variable arcs
    move any number of them at once."""

    places: tuple[NetPlace, ...]
    transitions: tuple[NetTransition, ...]
    arcs: tuple[NetArc, ...]

    @property
    def object_types(self) -> tuple[str, ...]:
        return tuple(sorted({place.object_type for place in self.places}))

    def to_opid(self) -> OPID:
        """The equivalent OPID of Remark 1: a normal variable v_σ and a list variable V_σ per
        object type σ; a place of type σ gets the color ⟨σ⟩, an arc of it the inscription ⟨V_σ⟩ if
        it is variable and ⟨v_σ⟩ otherwise. The final marking stays as it is. An OPID starts
        empty, so the objects of an initial place are created there by a silent transition (ν)
        instead, as the paper's own OPIDs create theirs (Fig. 3, and Example 6 on why)."""
        names = _variable_names(list(self.object_types))
        places = {place.id: place for place in self.places}
        arcs = []
        for arc in self.arcs:
            place = places.get(arc.source) or places.get(arc.target)
            if place is None:
                raise InvalidOPID(f"The arc {arc.source} → {arc.target} must connect a place and a transition.")
            if arc.weight != 1:
                raise InvalidOPID(
                    f"The arc {arc.source} → {arc.target} has weight {arc.weight}; an OPID inscription "
                    "moves one token per variable, so Remark 1 covers arcs of weight 1."
                )
            name = names[place.object_type]
            variable = InscriptionVariable(
                name=name.upper() if arc.variable else name, type=place.object_type, is_list=arc.variable
            )
            arcs.append(Arc(source=arc.source, target=arc.target, inscription=(variable,)))
        return OPID(
            places=tuple(Place(id=p.id, color=(p.object_type,), final=p.final) for p in self.places),
            transitions=tuple(
                Transition(id=t.id, label=t.label if t.label is not None else t.id, silent=t.label is None)
                for t in self.transitions
            ),
            arcs=tuple(arcs),
        ).creating_objects_in(p.id for p in self.places if p.initial)


class PetriNetSummary(Model):
    """An object-centric Petri net as it is listed: its name and size."""

    id: str
    name: str
    places: int
    transitions: int
    object_types: tuple[str, ...]

    @classmethod
    def of(cls, net_id: str, name: str, net: ObjectCentricNet) -> Self:
        return cls(
            id=net_id,
            name=name,
            places=len(net.places),
            transitions=len(net.transitions),
            object_types=net.object_types,
        )
