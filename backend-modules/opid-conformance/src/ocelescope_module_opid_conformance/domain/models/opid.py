"""Object-centric Petri nets with identifiers (Gianola, Montali, Winkler, CAiSE 2024, Def. 4)."""

from collections.abc import Iterable
from typing import Annotated, Self

from pydantic import Field, model_validator

from ocelescope_module_opid_conformance.domain.exceptions import InvalidOPID
from ocelescope_module_opid_conformance.domain.models.base import Model

# Types that oCoCoMoT treats as data (data-aware OPIDs), not as object types.
DATA_TYPES = frozenset({"Integer", "Rational", "Real"})


class InscriptionVariable(Model):
    """One position of an arc inscription: a variable of an object type.

    A list variable stands for a list of objects (variable arcs). Following oCoCoMoT, a
    variable whose name contains "nu" stands for a fresh object (ν in the paper).
    """

    name: str = Field(min_length=1)
    type: str = Field(min_length=1)
    is_list: bool = False

    @property
    def is_fresh(self) -> bool:
        return "nu" in self.name


class Position(Model):
    """Where a node is drawn (PNML graphics), so an edited layout is kept."""

    x: float
    y: float


class Place(Model):
    """A place is known by its color; its id only tells places apart."""

    id: str = Field(min_length=1)
    # The place's color: the types of the tuples it holds, e.g. ("order", "product").
    color: Annotated[tuple[str, ...], Field(min_length=1)]
    # As oCoCoMoT reads a final marking: a run ends with at least one token in every final
    # place and none in any other. Runs start empty; transitions with ν create the objects.
    final: bool = False
    position: Position | None = None


class Transition(Model):
    id: str = Field(min_length=1)
    label: str
    silent: bool = False
    position: Position | None = None


class Arc(Model):
    source: str
    target: str
    inscription: Annotated[tuple[InscriptionVariable, ...], Field(min_length=1)]
    exact_synchronization: bool = False

    @property
    def color(self) -> tuple[str, ...]:
        return tuple(variable.type for variable in self.inscription)


class OPID(Model):
    """An OPID: every arc connects a place and a transition, and its inscription has the
    color of its place, with at most one list variable."""

    places: tuple[Place, ...]
    transitions: tuple[Transition, ...]
    arcs: tuple[Arc, ...]

    @model_validator(mode="after")
    def _well_formed(self) -> Self:
        if not self.places or not self.transitions:
            raise InvalidOPID("An OPID needs places and transitions.")
        places = {place.id: place for place in self.places}
        transitions = {transition.id for transition in self.transitions}
        if len(places) + len(transitions) != len(self.places) + len(self.transitions):
            raise InvalidOPID("Place and transition ids must be unique.")
        for arc in self.arcs:
            place = places.get(arc.source) or places.get(arc.target)
            other = arc.target if place and place.id == arc.source else arc.source
            if place is None or other not in transitions:
                raise InvalidOPID(f"The arc {arc.source} → {arc.target} must connect a place and a transition.")
            if arc.color != place.color:
                raise InvalidOPID(
                    f"The inscription of {arc.source} → {arc.target} has the types {', '.join(arc.color)}, "
                    f"its place has the color {', '.join(place.color)}."
                )
            if sum(variable.is_list for variable in arc.inscription) > 1:
                raise InvalidOPID(f"The inscription of {arc.source} → {arc.target} has more than one list variable.")
        return self

    @property
    def object_types(self) -> tuple[str, ...]:
        return tuple(sorted({t for place in self.places for t in place.color} - DATA_TYPES))

    def creating_objects_in(self, place_ids: Iterable[str]) -> "OPID":
        """The OPID with a silent transition per place that creates objects there (ν). An OPID
        starts empty: this is how places that hold objects at the start (an initial marking)
        become part of one, as the paper's own OPIDs create their orders and products (Fig. 3)."""
        places = {place.id: place for place in self.places}
        taken = set(places) | {transition.id for transition in self.transitions}
        transitions: list[Transition] = []
        arcs: list[Arc] = []
        for place_id in place_ids:
            place = places[place_id]
            creator = f"create_{place_id}"
            while creator in taken:
                creator += "_"
            taken.add(creator)
            fresh = tuple(
                InscriptionVariable(name="nu" if len(place.color) == 1 else f"nu{i}", type=object_type)
                for i, object_type in enumerate(place.color, start=1)
            )
            transitions.append(Transition(id=creator, label=f"create {' × '.join(place.color)}", silent=True))
            arcs.append(Arc(source=creator, target=place_id, inscription=fresh))
        return OPID(places=self.places, transitions=(*self.transitions, *transitions), arcs=(*self.arcs, *arcs))


class OPIDDraft(Model):
    """An OPID with a name, as it is edited before it is kept."""

    name: str = Field(min_length=1)
    opid: OPID


class OPIDSummary(Model):
    """An OPID as it is listed: its name and size."""

    id: str
    name: str
    places: int
    transitions: int
    object_types: tuple[str, ...]

    @classmethod
    def of(cls, opid_id: str, name: str, opid: OPID) -> Self:
        return cls(
            id=opid_id,
            name=name,
            places=len(opid.places),
            transitions=len(opid.transitions),
            object_types=opid.object_types,
        )
