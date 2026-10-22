import { useEffect, useState } from "react";
import { Page } from "../components";
import AlignmentSection from "../features/alignment/AlignmentSection";
import OpidSection from "../features/opids/OpidSection";
import RunLauncher from "../features/runs/RunLauncher";
import RunsSection from "../features/runs/RunsSection";
import { useRuns } from "../features/runs/useRuns";

// Pick an OPID and a log, align, and look at the result: the runs with their trace graphs, and
// the alignment of the chosen one.
export default function AlignmentsPage() {
  const [opidId, setOpidId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [graphIndex, setGraphIndex] = useState<number | null>(null);
  const runs = useRuns().list.data ?? [];
  const run = runs.find((candidate) => candidate.id === runId);
  const graph = run?.traceGraphs.find((candidate) => candidate.index === graphIndex);

  // Show the newest run, and in it the first deviating trace graph, else the first aligned.
  useEffect(() => {
    if (!run && runs[0]) setRunId(runs[0].id);
  }, [run, runs]);
  useEffect(() => {
    if (!run || graph) return;
    const aligned = run.traceGraphs.filter((candidate) => candidate.status === "aligned");
    const pick = aligned.find((candidate) => (candidate.cost ?? 0) > 0) ?? aligned[0];
    if (pick) setGraphIndex(pick.index);
  }, [run, graph]);

  return (
    <Page title="Alignments">
      <OpidSection selected={opidId} onSelect={setOpidId} />
      <RunLauncher
        opidId={opidId}
        onStarted={(started) => {
          setRunId(started.id);
          setGraphIndex(null);
        }}
      />
      <RunsSection
        selectedRun={runId}
        onSelectRun={(id) => {
          setRunId(id);
          setGraphIndex(null);
        }}
        selectedGraph={graphIndex}
        onSelectGraph={setGraphIndex}
      />
      {run && graph && (
        <AlignmentSection
          runId={run.id}
          opidId={run.opidId}
          index={graph.index}
          status={graph.status}
        />
      )}
    </Page>
  );
}
