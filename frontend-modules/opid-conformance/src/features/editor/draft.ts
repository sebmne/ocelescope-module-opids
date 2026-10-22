import type { OPIDDraft } from "../../api/opidConformance";
import { nodeSize } from "../../components";
import { layeredLayout, type Point } from "../../lib/layout";

// An OPID while it is edited: every node has a position, every arc an id. The operations are
// pure and keep the rules of OPIDs where they can (an inscription has the color of its place,
// at most one list variable); `problems` names what is still wrong.

export type Variable = { name: string; type: string; isList: boolean };
// A place is known by its color; its id only tells places apart and is never shown.
export type DraftPlace = {
  id: string;
  color: string[];
  /** At the end of a run, every final place holds a token and every other place none. */
  final: boolean;
  position: Point;
};
export type DraftTransition = { id: string; label: string; silent: boolean; position: Point };
export type DraftArc = {
  id: string;
  source: string;
  target: string;
  inscription: Variable[];
  exactSynchronization: boolean;
};
export type Draft = {
  name: string;
  places: DraftPlace[];
  transitions: DraftTransition[];
  arcs: DraftArc[];
  /** The saved OPID it edits; null for a new one. */
  savedId: string | null;
};

export const emptyDraft = (): Draft => ({
  name: "OPID",
  places: [],
  transitions: [],
  arcs: [],
  savedId: null,
});

// ---- reading and writing ----------------------------------------------------------------

/** A draft of an OPID, laid out by ELK unless all its nodes have positions. */
export async function toDraft({ name, opid }: OPIDDraft, savedId: string | null): Promise<Draft> {
  const nodes = [...opid.places, ...opid.transitions];
  let positions: Record<string, Point>;
  if (nodes.every((node) => node.position)) {
    positions = Object.fromEntries(nodes.map((n) => [n.id, n.position ?? { x: 0, y: 0 }]));
  } else {
    const layout = await layeredLayout(
      [
        ...opid.places.map((p) => ({ id: p.id, ...nodeSize({ kind: "place" }) })),
        ...opid.transitions.map((t) => ({
          id: t.id,
          ...nodeSize({ kind: "transition", silent: t.silent ?? false }),
        })),
      ],
      opid.arcs.map((a, i) => ({ id: `a${i}`, source: a.source, target: a.target })),
      { spacing: 46 },
    );
    positions = layout.nodes;
  }
  const at = (id: string) => positions[id] ?? { x: 0, y: 0 };
  return {
    name,
    savedId,
    places: opid.places.map((p) => ({
      id: p.id,
      color: [...p.color],
      final: p.final ?? false,
      position: at(p.id),
    })),
    transitions: opid.transitions.map((t) => ({
      id: t.id,
      label: t.label,
      silent: t.silent ?? false,
      position: at(t.id),
    })),
    arcs: opid.arcs.map((a, i) => ({
      id: `a${i}`,
      source: a.source,
      target: a.target,
      inscription: a.inscription.map((v) => ({ name: v.name, type: v.type, isList: !!v.isList })),
      exactSynchronization: a.exactSynchronization ?? false,
    })),
  };
}

const round = ({ x, y }: Point) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });

/** The draft as the backend keeps it. */
export const toOpidDraft = (draft: Draft): OPIDDraft => ({
  name: draft.name.trim(),
  opid: {
    places: draft.places.map((p) => ({ ...p, position: round(p.position) })),
    transitions: draft.transitions.map((t) => ({ ...t, position: round(t.position) })),
    arcs: draft.arcs.map(({ id: _, ...arc }) => arc),
  },
});

// ---- variables ----------------------------------------------------------------------------

export type VariableKind = "single" | "list" | "fresh";

// As oCoCoMoT reads inscriptions, a variable whose name contains "nu" stands for a new object.
export const kindOf = (variable: Variable): VariableKind =>
  variable.name.includes("nu") ? "fresh" : variable.isList ? "list" : "single";

export const objectTypes = (draft: Draft) =>
  [...new Set(draft.places.flatMap((place) => place.color))].sort();

/** A letter per object type, as Remark 1 names variables: o for order, p for product. */
export function typeLetters(types: readonly string[]): Map<string, string> {
  const letters = new Map<string, string>();
  const used = new Set<string>();
  for (const type of [...new Set(types)].sort()) {
    const letter = type.match(/[a-z]/i)?.[0]?.toLowerCase() ?? "x";
    let name = letter;
    for (let index = 2; used.has(name); index++) name = `${letter}${index}`;
    used.add(name);
    letters.set(type, name);
  }
  return letters;
}

/** The variable of an object type of a kind: o, O (a list) or ν_o (a new object). */
export function variableFor(draft: Draft, type: string, kind: VariableKind): Variable {
  const letter = typeLetters([...objectTypes(draft), type]).get(type) ?? "x";
  if (kind === "list") return { name: letter.toUpperCase(), type, isList: true };
  if (kind === "fresh") return { name: `nu_${letter}`, type, isList: false };
  return { name: letter, type, isList: false };
}

// An inscription of a color, keeping the variables an arc already has for its types.
function inscriptionFor(draft: Draft, color: readonly string[], kept: readonly Variable[] = []) {
  const left = [...kept];
  return color.map((type) => {
    const i = left.findIndex((variable) => variable.type === type);
    return i >= 0 ? (left.splice(i, 1)[0] as Variable) : variableFor(draft, type, "single");
  });
}

// ---- editing ------------------------------------------------------------------------------

const ids = (draft: Draft) =>
  new Set([...draft.places, ...draft.transitions, ...draft.arcs].map((element) => element.id));

function freshId(draft: Draft, prefix: string) {
  const taken = ids(draft);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

const sizeOf = (node: DraftPlace | DraftTransition) =>
  "color" in node
    ? nodeSize({ kind: "place" })
    : nodeSize({ kind: "transition", silent: node.silent });

// A free spot for a node of a size, centred near a point: to the right of whatever is there, so
// that new nodes do not hide each other.
function freeSpot(draft: Draft, at: Point, size: { width: number; height: number }): Point {
  const nodes = [...draft.places, ...draft.transitions];
  const spot = { x: at.x - size.width / 2, y: at.y - size.height / 2 };
  const overlaps = () =>
    nodes.some((n) => {
      const other = sizeOf(n);
      return (
        spot.x < n.position.x + other.width + 24 &&
        n.position.x < spot.x + size.width + 24 &&
        spot.y < n.position.y + other.height + 24 &&
        n.position.y < spot.y + size.height + 24
      );
    });
  while (overlaps()) spot.x += 40;
  return spot;
}

export const placeOf = (draft: Draft, id: string) => draft.places.find((p) => p.id === id);
export const transitionOf = (draft: Draft, id: string) =>
  draft.transitions.find((t) => t.id === id);
export const arcOf = (draft: Draft, id: string) => draft.arcs.find((a) => a.id === id);

export function addPlace(draft: Draft, at: Point): { draft: Draft; id: string } {
  const id = freshId(draft, "p");
  const color = [objectTypes(draft)[0] ?? "object"];
  const place = {
    id,
    color,
    final: false,
    position: freeSpot(draft, at, nodeSize({ kind: "place" })),
  };
  return { draft: { ...draft, places: [...draft.places, place] }, id };
}

export function addTransition(
  draft: Draft,
  at: Point,
  silent: boolean,
): { draft: Draft; id: string } {
  const id = freshId(draft, "t");
  const position = freeSpot(draft, at, nodeSize({ kind: "transition", silent }));
  const transition = { id, label: silent ? "" : id, silent, position };
  return { draft: { ...draft, transitions: [...draft.transitions, transition] }, id };
}

/** Whether an arc may go from one node to the other: a place and a transition, not yet linked. */
export function canConnect(draft: Draft, source: string, target: string) {
  const placeToTransition = !!placeOf(draft, source) && !!transitionOf(draft, target);
  const transitionToPlace = !!transitionOf(draft, source) && !!placeOf(draft, target);
  const linked = draft.arcs.some((a) => a.source === source && a.target === target);
  return (placeToTransition || transitionToPlace) && !linked;
}

/** An arc between a place and a transition, inscribed with one variable per type of the place. */
export function connect(
  draft: Draft,
  source: string,
  target: string,
): { draft: Draft; id: string } | null {
  if (!canConnect(draft, source, target)) return null;
  const place = placeOf(draft, source) ?? placeOf(draft, target);
  if (!place) return null;
  const id = freshId(draft, "a");
  const arc = {
    id,
    source,
    target,
    inscription: inscriptionFor(draft, place.color),
    exactSynchronization: false,
  };
  return { draft: { ...draft, arcs: [...draft.arcs, arc] }, id };
}

export function updatePlace(
  draft: Draft,
  id: string,
  patch: Partial<Omit<DraftPlace, "id">>,
): Draft {
  const places = draft.places.map((p) => (p.id === id ? { ...p, ...patch } : p));
  const next = { ...draft, places };
  if (!patch.color) return next;
  // the place's arcs follow its new color
  const color = patch.color;
  return {
    ...next,
    arcs: draft.arcs.map((a) =>
      a.source === id || a.target === id
        ? { ...a, inscription: inscriptionFor(next, color, a.inscription) }
        : a,
    ),
  };
}

export const updateTransition = (
  draft: Draft,
  id: string,
  patch: Partial<Omit<DraftTransition, "id">>,
): Draft => ({
  ...draft,
  transitions: draft.transitions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
});

export const updateVariable = (
  draft: Draft,
  arcId: string,
  index: number,
  name: string,
): Draft => ({
  ...draft,
  arcs: draft.arcs.map((a) =>
    a.id === arcId
      ? { ...a, inscription: a.inscription.map((v, i) => (i === index ? { ...v, name } : v)) }
      : a,
  ),
});

/** Makes a variable single, a list or a new object; an arc keeps at most one list variable. */
export function setKind(draft: Draft, arcId: string, index: number, kind: VariableKind): Draft {
  return {
    ...draft,
    arcs: draft.arcs.map((a) => {
      if (a.id !== arcId) return a;
      const inscription = a.inscription.map((v, i) => {
        if (i === index) return variableFor(draft, v.type, kind);
        return kind === "list" && v.isList ? variableFor(draft, v.type, "single") : v;
      });
      return { ...a, inscription };
    }),
  };
}

export function move(draft: Draft, id: string, position: Point): Draft {
  return {
    ...draft,
    places: draft.places.map((p) => (p.id === id ? { ...p, position } : p)),
    transitions: draft.transitions.map((t) => (t.id === id ? { ...t, position } : t)),
  };
}

/** Removes nodes and arcs, and the arcs of removed nodes. */
export function remove(draft: Draft, removed: ReadonlySet<string>): Draft {
  return {
    ...draft,
    places: draft.places.filter((p) => !removed.has(p.id)),
    transitions: draft.transitions.filter((t) => !removed.has(t.id)),
    arcs: draft.arcs.filter(
      (a) => !removed.has(a.id) && !removed.has(a.source) && !removed.has(a.target),
    ),
  };
}

/** The draft laid out from left to right by ELK. */
export async function laidOut(draft: Draft): Promise<Draft> {
  const layout = await layeredLayout(
    [
      ...draft.places.map((p) => ({ id: p.id, ...nodeSize({ kind: "place" }) })),
      ...draft.transitions.map((t) => ({
        id: t.id,
        ...nodeSize({ kind: "transition", silent: t.silent }),
      })),
    ],
    draft.arcs.map((a) => ({ id: a.id, source: a.source, target: a.target })),
    { spacing: 46 },
  );
  const at = (id: string, position: Point) => layout.nodes[id] ?? position;
  return {
    ...draft,
    places: draft.places.map((p) => ({ ...p, position: at(p.id, p.position) })),
    transitions: draft.transitions.map((t) => ({ ...t, position: at(t.id, t.position) })),
  };
}

// ---- checking ----------------------------------------------------------------------------

/** Something that keeps the draft from being an OPID; `id` is the element it is about. */
export type Problem = { id: string | null; message: string };

export function problems(draft: Draft): Problem[] {
  const found: Problem[] = [];
  if (!draft.name.trim()) found.push({ id: null, message: "The OPID needs a name." });
  if (draft.places.length === 0 || draft.transitions.length === 0)
    found.push({ id: null, message: "An OPID needs places and transitions." });
  for (const place of draft.places) {
    if (place.color.length === 0)
      found.push({ id: place.id, message: "A place needs an object type." });
  }
  for (const transition of draft.transitions) {
    if (!transition.silent && !transition.label.trim())
      found.push({ id: transition.id, message: "A visible transition needs a label." });
  }
  for (const arc of draft.arcs) {
    const place = placeOf(draft, arc.source) ?? placeOf(draft, arc.target);
    if (place && arc.inscription.map((v) => v.type).join() !== place.color.join())
      found.push({ id: arc.id, message: "The inscription has other types than its place." });
    if (arc.inscription.filter((v) => v.isList).length > 1)
      found.push({ id: arc.id, message: "An inscription has at most one list variable." });
    if (arc.inscription.some((v) => !v.name.trim()))
      found.push({ id: arc.id, message: "Every variable needs a name." });
  }
  return found;
}
