import { EyeIcon, EyeOffIcon, GitCompareArrowsIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  AsyncBoundary,
  Badge,
  Box,
  Flex,
  IconButton,
  Section,
  SegmentedControl,
  Spinner,
  Text,
  Tooltip,
} from "../../components";
import { useOpid } from "../../hooks/useOpid";
import { MOVE_COLORS } from "../../lib/colors";
import { costColor, statusOf } from "../../lib/status";
import AlignmentGraph from "./AlignmentGraph";
import { resolveMoves, shownMoves, type View } from "./moves";
import { useTraceGraph } from "./useTraceGraph";

const LEGEND = [
  ["sync", "sync"],
  ["log", "log"],
  ["model", "model"],
  ["silent", "τ"],
] as const;

// The kinds of moves each view can show.
const KINDS: Record<View, readonly string[]> = {
  alignment: ["sync", "log", "model", "silent"],
  log: ["sync", "log"],
  model: ["sync", "model", "silent"],
};

// The optimal alignment of one trace graph, as a graph of moves, or its log or model projection.
// Silent moves (object creation, synchronizations) cost nothing and are hidden unless asked for.
export default function AlignmentSection({
  runId,
  opidId,
  index,
  status,
}: {
  runId: string;
  opidId: string;
  index: number;
  status: string;
}) {
  const traceGraph = useTraceGraph(runId, index, status);
  const types = Object.values(traceGraph.data?.objectTypes ?? {});
  const { colors } = useOpid(opidId, types);
  const [view, setView] = useState<View>("alignment");
  const [showSilent, setShowSilent] = useState(true);

  const graph = traceGraph.data;
  const moves = useMemo(
    () =>
      graph?.alignment ? shownMoves(resolveMoves(graph.alignment, graph.log), showSilent) : [],
    [graph, showSilent],
  );
  const colorOf = useCallback(
    (object: string) => colors.type(graph?.objectTypes[object]),
    [colors, graph],
  );

  return (
    <Section
      icon={GitCompareArrowsIcon}
      title={`#${index}`}
      aside={
        graph?.alignment && (
          <Flex gap="4" align="center" wrap="wrap" justify="end">
            <SegmentedControl.Root
              size="1"
              value={view}
              onValueChange={(value) => setView(value as View)}
            >
              <SegmentedControl.Item value="alignment">alignment</SegmentedControl.Item>
              <SegmentedControl.Item value="log">log</SegmentedControl.Item>
              <SegmentedControl.Item value="model">model</SegmentedControl.Item>
            </SegmentedControl.Root>
            <Flex gap="3" align="center">
              {LEGEND.filter(
                ([key]) => KINDS[view].includes(key) && (showSilent || key !== "silent"),
              ).map(([key, label]) => (
                <Flex key={key} gap="1" align="center">
                  <Box
                    style={{ width: 10, height: 10, borderRadius: 2, background: MOVE_COLORS[key] }}
                  />
                  <Text size="1" color="gray">
                    {label}
                  </Text>
                </Flex>
              ))}
            </Flex>
            <Tooltip content={showSilent ? "Hide silent moves" : "Show silent moves"}>
              <IconButton
                disabled={view === "log"}
                variant={showSilent ? "soft" : "ghost"}
                color="gray"
                // without it, the ghost button's negative margin shifts its row when toggled
                style={{ margin: 0 }}
                onClick={() => setShowSilent(!showSilent)}
                aria-label="Silent moves"
                aria-pressed={showSilent}
              >
                {showSilent ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
              </IconButton>
            </Tooltip>
            <Tooltip content="Alignment cost">
              <Badge
                size="3"
                variant="solid"
                style={{ background: costColor(graph.alignment.cost) }}
              >
                {graph.alignment.cost}
              </Badge>
            </Tooltip>
          </Flex>
        )
      }
    >
      <AsyncBoundary status={traceGraph} errorTitle="The trace graph could not be read">
        {(data) => {
          if (!data.alignment) {
            const shown = statusOf(data.status);
            return (
              <Flex direction="column" align="center" gap="2" py="6">
                {data.status === "aligning" ? (
                  <Spinner size="3" />
                ) : (
                  <shown.icon size={32} color={shown.color} />
                )}
                <Text size="2" color="gray">
                  {data.error ?? shown.label}
                </Text>
              </Flex>
            );
          }
          return (
            <AlignmentGraph key={`${runId}-${index}`} moves={moves} view={view} colorOf={colorOf} />
          );
        }}
      </AsyncBoundary>
    </Section>
  );
}
