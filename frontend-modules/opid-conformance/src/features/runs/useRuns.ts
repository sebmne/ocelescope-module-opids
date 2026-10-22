import { useQueryClient } from "@tanstack/react-query";
import {
  getListRunsQueryKey,
  type RunSummary,
  useCancelRun,
  useDeleteRun,
  useListRuns,
  useStartRun,
} from "../../api/opidConformance";

export type { RunSummary, TraceGraphResult } from "../../api/opidConformance";

/** The session's runs, refreshed while one runs, and what can be done with them. */
export function useRuns({ onStarted }: { onStarted?: (run: RunSummary) => void } = {}) {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: getListRunsQueryKey() });
  const list = useListRuns({
    query: {
      refetchInterval: (query) =>
        query.state.data?.some((run) => run.status === "running") ? 1000 : false,
    },
  });
  const start = useStartRun({
    mutation: {
      onSuccess: (run) => {
        refresh();
        onStarted?.(run);
      },
    },
  });
  const cancel = useCancelRun({ mutation: { onSuccess: refresh } });
  const remove = useDeleteRun({ mutation: { onSuccess: refresh } });
  return {
    list,
    start: (opidId: string, ocelId: string, timeoutSeconds: number) =>
      start.mutate({ data: { opidId, ocelId, timeoutSeconds } }),
    starting: start.isPending,
    startError: start.error,
    cancel: (runId: string) => cancel.mutate({ runId }),
    remove: (runId: string) => remove.mutate({ runId }),
  };
}
