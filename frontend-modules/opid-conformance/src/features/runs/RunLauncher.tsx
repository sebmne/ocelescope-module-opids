import { DatabaseIcon, PlayIcon, TimerIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useGetAlignerStatus } from "../../api/opidConformance";
import { Box, Button, Card, Flex, Select, Text, TextField, Tooltip } from "../../components";
import { useLogs } from "../../hooks/useLogs";
import { type RunSummary, useRuns } from "./useRuns";

// Picks the log and the time limit, and starts aligning it with the chosen OPID.
export default function RunLauncher({
  opidId,
  onStarted,
}: {
  opidId: string | null;
  onStarted: (run: RunSummary) => void;
}) {
  const { logs, currentId } = useLogs();
  const [ocelId, setOcelId] = useState<string | null>(currentId);
  const [timeout, setTimeout] = useState(600);
  const { start, starting, startError } = useRuns({ onStarted });
  const aligner = useGetAlignerStatus().data;

  useEffect(() => {
    if (!ocelId || !logs.some((log) => log.id === ocelId))
      setOcelId(currentId ?? logs[0]?.id ?? null);
  }, [logs, currentId, ocelId]);

  const unavailable = aligner && !aligner.available;
  const blocked = unavailable
    ? `oCoCoMoT is missing at ${aligner?.location}`
    : !opidId
      ? "No OPID"
      : !ocelId
        ? "No log"
        : null;

  return (
    <Card size="2">
      <Flex gap="3" align="center" wrap="wrap">
        <Select.Root value={ocelId ?? undefined} onValueChange={setOcelId}>
          <Select.Trigger aria-label="Log" style={{ minWidth: 260 }}>
            <Flex gap="2" align="center">
              <DatabaseIcon size={14} aria-hidden />
              {logs.find((log) => log.id === ocelId)?.name ?? "Log"}
            </Flex>
          </Select.Trigger>
          <Select.Content>
            {logs.map((log) => (
              <Select.Item key={log.id} value={log.id}>
                {log.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Tooltip content="Time limit per trace graph">
          <TextField.Root
            type="number"
            min={10}
            step={60}
            value={timeout}
            onChange={(event) => setTimeout(Number(event.target.value) || 600)}
            aria-label="Time limit per trace graph in seconds"
            style={{ width: 120 }}
          >
            <TextField.Slot>
              <TimerIcon size={14} />
            </TextField.Slot>
            <TextField.Slot>s</TextField.Slot>
          </TextField.Root>
        </Tooltip>
        <Box flexGrow="1" />
        <Tooltip content={blocked ?? "Align every trace graph"}>
          <Button
            size="2"
            disabled={!!blocked}
            loading={starting}
            onClick={() => opidId && ocelId && start(opidId, ocelId, timeout)}
            style={{ minWidth: 140 }}
          >
            {unavailable ? <TriangleAlertIcon size={16} /> : <PlayIcon size={16} />}
            Align
          </Button>
        </Tooltip>
      </Flex>
      {startError != null && (
        <Text size="1" color="red" mt="2" as="p">
          {(startError as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
            "The run could not start."}
        </Text>
      )}
    </Card>
  );
}
