import type { Alignment, LogEvent, Move, RunStep } from "../../api/opidConformance";
import { MOVE_COLORS, type MoveColorKey } from "../../lib/colors";

export type ResolvedMove = Omit<Move, "event" | "step"> & {
  position: number;
  event: LogEvent | null;
  step: RunStep | null;
  objects: string[];
  colorKey: MoveColorKey;
  color: string;
};

/** The moves with their event, run step and objects looked up. */
export function resolveMoves(alignment: Alignment, log: readonly LogEvent[]): ResolvedMove[] {
  const events = new Map(log.map((event) => [event.index, event]));
  return alignment.moves.map((move, position) => {
    const event = move.event === null ? null : (events.get(move.event) ?? null);
    const step = move.step === null ? null : (alignment.run[move.step] ?? null);
    const colorKey: MoveColorKey = move.kind === "model" && step?.silent ? "silent" : move.kind;
    return {
      ...move,
      position,
      event,
      step,
      objects: [...new Set([...(event?.objects ?? []), ...(step?.objects ?? [])])].sort(),
      colorKey,
      color: MOVE_COLORS[colorKey],
    };
  });
}

/** The moves to show: silent model moves only if asked for. */
export const shownMoves = (moves: readonly ResolvedMove[], showSilent: boolean) =>
  showSilent ? [...moves] : moves.filter((move) => move.colorKey !== "silent");

export const stepName = (step: RunStep) =>
  step.silent ? `τ ${step.label ?? ""}`.trim() : (step.label ?? step.transition);

/**
 * What is shown: the whole alignment, or its log or model projection (as in Fig. 4 of Gianola et
 * al. and Fig. 4 of Liss et al.), i.e. only the moves with a log or a model side, and only that
 * side.
 */
export type View = "alignment" | "log" | "model";

export const projection = (moves: readonly ResolvedMove[], view: View) =>
  moves.filter((move) =>
    view === "log" ? move.event !== null : view === "model" ? move.step !== null : true,
  );

/** The objects of a move on the shown sides. */
export const objectsIn = (move: ResolvedMove, view: View): readonly string[] =>
  view === "log"
    ? (move.event?.objects ?? [])
    : view === "model"
      ? (move.step?.objects ?? [])
      : move.objects;

export type FlowEdge = { source: number; target: number; objects: string[] };

/**
 * How the objects flow through the moves, as Liss et al. draw the object-centric alignment: for
 * every object, an edge from each move holding it to the next one. In the log projection this is
 * the trace graph; in the model projection, the run as a partial order.
 */
export function objectFlow(moves: readonly ResolvedMove[], view: View): FlowEdge[] {
  const last = new Map<string, number>();
  const edges = new Map<string, FlowEdge>();
  for (const move of moves) {
    for (const object of objectsIn(move, view)) {
      const source = last.get(object);
      last.set(object, move.position);
      if (source === undefined) continue;
      const key = `${source}-${move.position}`;
      const edge = edges.get(key) ?? { source, target: move.position, objects: [] };
      edge.objects.push(object);
      edges.set(key, edge);
    }
  }
  return [...edges.values()];
}
