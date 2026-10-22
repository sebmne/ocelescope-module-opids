"""The OPID as an Ocelescope resource: listed, viewed, exported and imported by the host."""

from ocelescope import DIRECTED_ELK_GRAPH_LAYOUT, Graph, GraphEdge, GraphNode, Resource
from ocelescope.visualization.default.graph import EdgeStyle, NodeStyle

from ocelescope_module_opid_conformance.domain.models.opid import OPID, Arc, Place, Transition

# The palette of the frontend (lib/colors.ts): object types first, then tuples of types.
_PALETTE = ("#4C8BD6", "#F2C230", "#5BAA5B", "#E07B39", "#9B6BC7", "#D9538E", "#45B5BF", "#A0785A")


def _place_colors(opid: OPID) -> dict[tuple[str, ...], str]:
    colors = [(t,) for t in sorted({t for place in opid.places for t in place.color})]
    colors += sorted({p.color for p in opid.places if len(p.color) > 1}, key=lambda c: (len(c), " × ".join(c)))
    return {color: _PALETTE[i % len(_PALETTE)] for i, color in enumerate(colors)}


def _inscription(arc: Arc) -> str:
    names = [
        variable.name.replace("nu", "ν", 1) if variable.name.startswith("nu") else variable.name
        for variable in arc.inscription
    ]
    return names[0] if len(names) == 1 else f"({', '.join(names)})"


class OPIDResource(Resource):
    label = "OPID"
    description = "An object-centric Petri net with identifiers (Gianola, Montali, Winkler, CAiSE 2024)"

    places: tuple[Place, ...]
    transitions: tuple[Transition, ...]
    arcs: tuple[Arc, ...]

    @classmethod
    def from_opid(cls, opid: OPID) -> "OPIDResource":
        return cls(places=opid.places, transitions=opid.transitions, arcs=opid.arcs)

    def to_opid(self) -> OPID:
        return OPID(places=self.places, transitions=self.transitions, arcs=self.arcs)

    def visualize(self) -> Graph:
        opid = self.to_opid()
        colors = _place_colors(opid)
        places = {place.id: place for place in opid.places}
        nodes = [
            GraphNode(
                id=place.id,
                shape="circle",
                width=40,
                height=40,
                color=colors[place.color],
                border_color="#212529",
                style=NodeStyle(double_border=place.final),
            )
            for place in opid.places
        ] + [
            GraphNode(
                id=transition.id,
                label=transition.label if not transition.silent else None,
                shape="rectangle",
                width=12 if transition.silent else 130,
                height=40,
                color="#212529" if transition.silent else "#ffffff",
                border_color="#212529",
            )
            for transition in opid.transitions
        ]
        edges = []
        for arc in opid.arcs:
            place = places.get(arc.source) or places[arc.target]
            edges.append(
                GraphEdge(
                    id=f"{arc.source}:{arc.target}",
                    source=arc.source,
                    target=arc.target,
                    label=_inscription(arc),
                    color=colors[place.color],
                    end_arrow="triangle",
                    # variable arcs dashed
                    style=EdgeStyle(dashed=any(v.is_list for v in arc.inscription)),
                )
            )
        return Graph(nodes=nodes, edges=edges, layout_config=DIRECTED_ELK_GRAPH_LAYOUT)
