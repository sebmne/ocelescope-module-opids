import { useEffect } from "react";
import { useGetTraceGraph } from "../../api/opidConformance";

/** A trace graph of a run with its alignment, asked again when its status changes. */
export function useTraceGraph(runId: string, index: number, status: string) {
  const query = useGetTraceGraph(runId, index);
  const { refetch } = query;
  useEffect(() => void refetch(), [status, refetch]);
  return query;
}
