import { useCallback, useMemo, useState } from "react";
import { type Draft, emptyDraft, problems, toOpidDraft } from "./draft";

const HISTORY = 50;

type State = {
  draft: Draft;
  past: Draft[];
  /** The draft as it was last opened or saved, to tell whether it changed since. */
  saved: string;
  /** Counts drafts opened, so that the canvas fits a new one into view. */
  generation: number;
};

const snapshot = (draft: Draft) => JSON.stringify(toOpidDraft(draft));

/** The OPID being edited, with undo, its problems, and whether it changed since it was saved. */
export function useDraft() {
  const [state, setState] = useState<State>(() => {
    const draft = emptyDraft();
    return { draft, past: [], saved: snapshot(draft), generation: 0 };
  });

  /** Changes the draft; `record: false` for steps of one gesture (e.g. dragging). */
  const change = useCallback((edit: (draft: Draft) => Draft, record = true) => {
    setState((s) => {
      const draft = edit(s.draft);
      if (draft === s.draft) return s;
      return { ...s, draft, past: record ? [...s.past.slice(-HISTORY), s.draft] : s.past };
    });
  }, []);

  /** Remembers the draft as it is, as the start of a gesture that `change` does not record. */
  const checkpoint = useCallback(() => {
    setState((s) => ({ ...s, past: [...s.past.slice(-HISTORY), s.draft] }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const previous = s.past.at(-1);
      return previous ? { ...s, draft: previous, past: s.past.slice(0, -1) } : s;
    });
  }, []);

  /** Opens another draft; undo goes back to the one before. */
  const open = useCallback((draft: Draft) => {
    setState((s) => ({
      draft,
      past: [...s.past.slice(-HISTORY), s.draft],
      saved: snapshot(draft),
      generation: s.generation + 1,
    }));
  }, []);

  const markSaved = useCallback((savedId: string) => {
    setState((s) => {
      const draft = { ...s.draft, savedId };
      return { ...s, draft, saved: snapshot(draft) };
    });
  }, []);

  const { draft } = state;
  const found = useMemo(() => problems(draft), [draft]);
  const changed = useMemo(() => snapshot(draft) !== state.saved, [draft, state.saved]);

  return {
    draft,
    problems: found,
    changed,
    canUndo: state.past.length > 0,
    generation: state.generation,
    change,
    checkpoint,
    undo,
    open,
    markSaved,
  };
}

export type DraftState = ReturnType<typeof useDraft>;
