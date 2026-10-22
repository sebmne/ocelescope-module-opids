import { getResourcesQueryKey } from "@ocelescope/api-base";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getGetOpidQueryKey,
  getListOpidsQueryKey,
  saveOpid,
  updateOpid,
} from "../../api/opidConformance";
import { errorMessage } from "../../lib/errors";
import { toOpidDraft } from "./draft";
import type { DraftState } from "./useDraft";

/** Keeps the draft as an OPID resource: in place of the one it edits, or as a new one. */
export function useSave({ draft, markSaved }: Pick<DraftState, "draft" | "markSaved">) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (asNew = false) => {
    setSaving(true);
    setError(null);
    try {
      const body = toOpidDraft(draft);
      const summary =
        draft.savedId && !asNew ? await updateOpid(draft.savedId, body) : await saveOpid(body);
      markSaved(summary.id);
      void queryClient.invalidateQueries({ queryKey: getListOpidsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetOpidQueryKey(summary.id) });
      void queryClient.invalidateQueries({ queryKey: getResourcesQueryKey() });
    } catch (failure) {
      setError(errorMessage(failure, "The OPID could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return { save, saving, error };
}
