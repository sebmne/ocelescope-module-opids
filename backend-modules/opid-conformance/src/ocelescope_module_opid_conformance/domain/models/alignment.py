"""Optimal alignments of a trace graph and an OPID (Gianola et al., Def. 8–12)."""

from typing import Literal, Self

from pydantic import Field, model_validator

from ocelescope_module_opid_conformance.domain.models.base import Model

MoveKind = Literal["sync", "log", "model"]
# A token is a tuple of objects, e.g. ("o1", "p1") in a place of color order × product.
Token = tuple[str, ...]
# Variable name → object, or list of objects for list variables.
Binding = dict[str, str | tuple[str, ...] | None]


class RunStep(Model):
    """A transition firing of the model run."""

    transition: str
    label: str | None
    silent: bool
    binding: Binding
    objects: tuple[str, ...]


class Move(Model):
    """A synchronous move pairs an event with a run step; log and model moves skip one side."""

    kind: MoveKind
    cost: int = Field(ge=0)
    step: int | None  # index into the run
    event: int | None  # LogEvent.index

    @model_validator(mode="after")
    def _sides(self) -> Self:
        has = (self.event is not None, self.step is not None)
        expected = {"sync": (True, True), "log": (True, False), "model": (False, True)}[self.kind]
        if has != expected:
            raise ValueError(f"A {self.kind} move has the wrong sides.")
        return self


class Alignment(Model):
    """An optimal alignment: the model run with its markings, and the moves in order."""

    cost: int = Field(ge=0)
    run: tuple[RunStep, ...]
    # The marking before the first step and after every step, by place id.
    markings: tuple[dict[str, tuple[Token, ...]], ...]
    moves: tuple[Move, ...]

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        if sum(move.cost for move in self.moves) != self.cost:
            raise ValueError("The cost of an alignment is the sum of its move costs.")
        if len(self.markings) != len(self.run) + 1:
            raise ValueError("There is a marking before the run and after each of its steps.")
        steps = [move.step for move in self.moves if move.step is not None]
        if steps != list(range(len(self.run))):
            raise ValueError("The moves cover every run step once, in order.")
        return self
