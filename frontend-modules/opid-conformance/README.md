# OPID Conformance frontend module

The pages of the module (`@instance/opid-conformance`). It shows rather than tells: words only
where a picture cannot say it, details on hover.

Two pages: first build an OPID, then align logs with it.

**OPIDs** builds an OPID and saves it as an Ocelescope resource.
- **Sources:** New (empty), a .pnml file (also dropped on the canvas), an object-centric Petri net
  of the session encoded by Remark 1, or a saved OPID to change.
- **Editor:** places have no names, only their color (an internal id tells them apart). Add places, transitions and silent transitions from the toolbar; draw an arc from a
  node's dot onto another node; drag to move; ⌫ deletes, ⌘Z undoes; lay out with ELK.
  - The panel beside it edits the selection: a place's color (its object types, in order, each
    picked from the net's types or named anew; + type makes it hold tuples) and whether it is
    final; a transition's label and silence; an arc's variables, each one object (o),
    a list (O, a variable arc) or a new object (ν_o).
  - An arc's inscription follows its place's color. What still breaks the rules of OPIDs is
    outlined in red and listed when nothing is selected.
  - Save keeps it (in place of the OPID it edits, or as a new one), with the layout. Align opens
    the alignments with it.

**Alignments** aligns a log with an OPID.
- **OPID:** pick one of the session's OPIDs (`?opid=` picks one); the pencil edits it. Its
  places have one color per place color (order, product, order × product); variable arcs are
  dashed. Final places have a double border: a run ends with a token in each of them and none
  anywhere else, as oCoCoMoT reads a final marking. Runs start empty; silent transitions with ν
  create the objects.
- **Launcher bar:** log, time limit, ▶ Align.
- **Runs:** each run has a bar with one segment per trace graph. Green means it fits, orange
  that it deviates, amber that it hit the time limit, red that it failed.
- **Trace graphs:** each is a tile with its cost in big, its objects as dots in the colors of
  their types, and its events and solving time small.
- **Alignment:** a graph of moves, drawn as Liss et al. and Gianola et al. (Fig. 4) draw it.
  - Each move is a box with the event on top and the fired transition below; ≫ marks a side
    the move skips. The box's color is the move's kind, and a deviation's cost sits in its
    corner. The binding shows on hover.
  - Edges follow the objects: from each move holding an object to the next one. They take the
    color of the object's type and are routed around the boxes (ELK).
  - Clicking a move follows its objects: their paths stay, are labeled, and the rest fades.
  - The switch shows the whole alignment, its log projection (the trace graph T_X), or its
    model projection (the run, ordered by objects).

  Silent moves (object creation, synchronizations) cost nothing and are hidden unless the eye
  toggle shows them.

```text
src/
├── index.ts      the module's pages and navigation
├── pages/        OpidsPage and AlignmentsPage, composing the features
├── features/
│   ├── editor/       the OPID editor: sources, draft (pure edits and checks), canvas, panel, saving
│   ├── opids/        pick an OPID to align with
│   ├── runs/         start runs, follow them, their trace graphs
│   └── alignment/    the graph of moves and its projections
├── components/   the shared building blocks and the look: the only place that knows Radix
│                 (via r4pm); the net and graph canvases (React Flow, laid out by ELK)
├── hooks/        shared hooks (an OPID with its colors, the logs, the layout, resource changes)
├── lib/          notation ((o, P), ν), colors, status visuals, ELK layout, error messages
└── api/          the generated backend client (not committed)
```

`.dependency-cruiser.cjs` enforces the layout:
- features do not import each other;
- shared folders know no feature;
- only `components/` imports the component library;
- there are no cycles.

| Script | What it does |
| --- | --- |
| `pnpm run build` | Regenerates the API client and builds the module into `dist/`. |
| `pnpm run typecheck` | Type-checks the module. |
| `pnpm run check:architecture` | Checks the layout rules. |

`pnpm run check:frontend` (repository root) runs Biome, the type check and the layout rules.
