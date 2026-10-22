import { useCallback, useState } from "react";
import {
  convertPetriNet,
  getOpid,
  readPnml,
  useListOpids,
  useListPetriNets,
} from "../../api/opidConformance";
import { useResourcesChanged } from "../../hooks/useResourcesChanged";
import { errorMessage } from "../../lib/errors";
import { type Draft, emptyDraft, toDraft } from "./draft";

/**
 * Where a draft comes from: a PNML file, an object-centric Petri net of the session (encoded by
 * Remark 1), a saved OPID, or nothing.
 */
export function useSources(open: (draft: Draft) => void) {
  const opidList = useListOpids();
  const netList = useListPetriNets();
  useResourcesChanged(() => {
    void opidList.refetch();
    void netList.refetch();
  });
  const opids = opidList.data ?? [];
  const petriNets = netList.data ?? [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (read: () => Promise<Draft>, fallback: string) => {
      setBusy(true);
      setError(null);
      try {
        open(await read());
      } catch (failure) {
        setError(errorMessage(failure, fallback));
      } finally {
        setBusy(false);
      }
    },
    [open],
  );

  return {
    opids,
    petriNets,
    busy,
    error,
    openEmpty: () => {
      setError(null);
      open(emptyDraft());
    },
    openPnml: (file: File) =>
      load(async () => toDraft(await readPnml({ file }), null), "The file holds no OPID."),
    openPetriNet: (petriNetId: string) =>
      load(
        async () => toDraft(await convertPetriNet({ petriNetId }), null),
        "The Petri net could not be encoded.",
      ),
    openSaved: (opidId: string) =>
      load(async () => {
        const name = opids.find((opid) => opid.id === opidId)?.name ?? "OPID";
        return toDraft({ name, opid: await getOpid(opidId) }, opidId);
      }, "The OPID could not be read."),
  };
}
