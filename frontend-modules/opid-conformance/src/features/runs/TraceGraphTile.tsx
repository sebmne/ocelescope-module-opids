import { ListIcon, TimerIcon } from "lucide-react";
import { useState } from "react";
import { Card, Flex, ObjectDots, Spinner, Text, Tooltip } from "../../components";
import { seconds } from "../../lib/format";
import { costColor, statusOf } from "../../lib/status";
import type { TraceGraphResult } from "./useRuns";

// A trace graph at a glance: its cost in big, its objects as dots, its size and time small.
export default function TraceGraphTile({
  graph,
  selected,
  colorOf,
  onSelect,
}: {
  graph: TraceGraphResult;
  selected: boolean;
  colorOf: (object: string) => string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const status = statusOf(graph.status);
  const aligned = graph.status === "aligned";
  const accent = aligned ? costColor(graph.cost) : status.color;
  return (
    <Card
      size="1"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Trace graph ${graph.index}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        borderTop: `3px solid ${accent}`,
        outline: selected ? "2px solid var(--accent-8)" : undefined,
        background: hovered ? "var(--gray-a2)" : undefined,
        transition: "background 100ms",
      }}
    >
      <Flex direction="column" gap="2">
        <Flex justify="between" align="start">
          {aligned ? (
            <Tooltip content="Alignment cost">
              <Text
                size="6"
                weight="bold"
                style={{ color: accent, fontVariantNumeric: "tabular-nums" }}
              >
                {graph.cost}
              </Text>
            </Tooltip>
          ) : graph.status === "aligning" ? (
            <Spinner size="3" />
          ) : (
            <Tooltip content={graph.error ?? status.label}>
              <status.icon size={22} color={status.color} />
            </Tooltip>
          )}
          <Text size="1" color="gray">
            #{graph.index}
          </Text>
        </Flex>
        <ObjectDots objects={graph.objects} colorOf={colorOf} />
        <Flex gap="3">
          <Flex gap="1" align="center" style={{ color: "var(--gray-10)" }}>
            <ListIcon size={12} aria-label="Events" />
            <Text size="1">{graph.events}</Text>
          </Flex>
          {graph.seconds != null && (
            <Flex gap="1" align="center" style={{ color: "var(--gray-10)" }}>
              <TimerIcon size={12} aria-label="Time" />
              <Text size="1">{seconds(graph.seconds)}</Text>
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
