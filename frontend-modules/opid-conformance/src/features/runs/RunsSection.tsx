import { CircleStopIcon, HistoryIcon, Trash2Icon } from "lucide-react";
import {
  AsyncBoundary,
  Box,
  Flex,
  Grid,
  IconButton,
  Section,
  Spinner,
  Text,
  Tooltip,
} from "../../components";
import { useOpid } from "../../hooks/useOpid";
import { costColor, statusOf } from "../../lib/status";
import TraceGraphTile from "./TraceGraphTile";
import { type RunSummary, type TraceGraphResult, useRuns } from "./useRuns";

const graphColor = (graph: TraceGraphResult) =>
  graph.status === "aligned" ? costColor(graph.cost) : statusOf(graph.status).color;

// The runs, newest first, each with a bar of its trace graphs; the selected run's trace
// graphs as tiles.
export default function RunsSection({
  selectedRun,
  onSelectRun,
  selectedGraph,
  onSelectGraph,
}: {
  selectedRun: string | null;
  onSelectRun: (runId: string | null) => void;
  selectedGraph: number | null;
  onSelectGraph: (index: number) => void;
}) {
  const { list, cancel, remove } = useRuns();
  const runs = list.data ?? [];
  const run = runs.find((candidate) => candidate.id === selectedRun);

  return (
    <Section icon={HistoryIcon} title="Runs">
      <AsyncBoundary
        status={list}
        isEmpty={(data) => data.length === 0}
        emptyState={{ title: "No runs yet" }}
        errorTitle="The runs could not be read"
        onRetry={() => void list.refetch()}
      >
        {() => (
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="2">
              {runs.map((candidate) => (
                <RunRow
                  key={candidate.id}
                  run={candidate}
                  selected={candidate.id === selectedRun}
                  onSelect={() => onSelectRun(candidate.id)}
                  onCancel={() => cancel(candidate.id)}
                  onDelete={() => {
                    if (candidate.id === selectedRun) onSelectRun(null);
                    remove(candidate.id);
                  }}
                />
              ))}
            </Flex>
            {run && <TraceGraphs run={run} selected={selectedGraph} onSelect={onSelectGraph} />}
          </Flex>
        )}
      </AsyncBoundary>
    </Section>
  );
}

function RunRow({
  run,
  selected,
  onSelect,
  onCancel,
  onDelete,
}: {
  run: RunSummary;
  selected: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const status = statusOf(run.status);
  return (
    <Flex
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      align="center"
      gap="3"
      px="3"
      py="2"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      style={{
        cursor: "pointer",
        borderRadius: "var(--radius-3)",
        border: `1px solid ${selected ? "var(--accent-7)" : "var(--gray-a5)"}`,
        background: selected ? "var(--accent-a2)" : undefined,
      }}
    >
      {run.status === "running" ? (
        <Spinner size="2" />
      ) : (
        <Tooltip content={run.error ?? status.label}>
          <status.icon size={18} color={status.color} />
        </Tooltip>
      )}
      <Box minWidth="0" style={{ flex: "0 1 40%" }}>
        <Text size="2" weight="medium" truncate as="div">
          {run.opidName} · {run.ocelName}
        </Text>
      </Box>
      <Flex
        gap="1"
        flexGrow="1"
        style={{ minWidth: 80 }}
        aria-label={`${run.finished} of ${run.traceGraphs.length}`}
      >
        {run.traceGraphs.map((graph) => (
          <Tooltip
            key={graph.index}
            content={
              graph.status === "aligned"
                ? `#${graph.index}: ${graph.cost}`
                : `#${graph.index}: ${statusOf(graph.status).label}`
            }
          >
            <Box
              style={{
                flex: 1,
                height: 8,
                borderRadius: 2,
                background: graphColor(graph),
                opacity: graph.status === "queued" ? 0.35 : 1,
              }}
            />
          </Tooltip>
        ))}
      </Flex>
      <Text size="1" color="gray" style={{ fontVariantNumeric: "tabular-nums" }}>
        {new Date(run.createdAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
      <Box onClick={(event) => event.stopPropagation()}>
        {run.status === "running" ? (
          <Tooltip content="Cancel">
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              onClick={onCancel}
              aria-label="Cancel"
              style={{ margin: 0 }}
            >
              <CircleStopIcon size={15} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip content="Delete">
            <IconButton
              variant="ghost"
              color="gray"
              size="1"
              onClick={onDelete}
              aria-label="Delete"
              style={{ margin: 0 }}
            >
              <Trash2Icon size={15} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Flex>
  );
}

function TraceGraphs({
  run,
  selected,
  onSelect,
}: {
  run: RunSummary;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const types = run.traceGraphs.flatMap((graph) => Object.values(graph.objectTypes));
  const { colors } = useOpid(run.opidId, types);
  const typeOf = Object.assign({}, ...run.traceGraphs.map((graph) => graph.objectTypes)) as Record<
    string,
    string
  >;
  return (
    <Grid columns="repeat(auto-fill, minmax(150px, 1fr))" gap="3">
      {run.traceGraphs.map((graph) => (
        <TraceGraphTile
          key={graph.index}
          graph={graph}
          selected={graph.index === selected}
          colorOf={(object) => colors.type(typeOf[object])}
          onSelect={() => onSelect(graph.index)}
        />
      ))}
    </Grid>
  );
}
