import { getModuleRoute } from "@ocelescope/core";
import { NetworkIcon, PencilLineIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  NetGraph,
  Section,
  Select,
  Tooltip,
} from "../../components";
import { useOpid } from "../../hooks/useOpid";
import { useOpids } from "./useOpids";

const HEIGHT = 380;

const editor = (opid?: string) =>
  getModuleRoute({
    moduleName: "opidConformance",
    routeName: "opids",
    ...(opid ? { query: { opid } } : {}),
  });

// The OPID to align with, picked from the session's OPID resources (?opid=… picks one). OPIDs
// are built on the OPIDs page.
export default function OpidSection({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (opidId: string) => void;
}) {
  const opids = useOpids().data ?? [];
  const { net, colors } = useOpid(selected);
  const requested = useRouter().query.opid;

  useEffect(() => {
    if (opids.some((opid) => opid.id === selected)) return;
    const pick = opids.find((opid) => opid.id === requested) ?? opids[0];
    if (pick) onSelect(pick.id);
  }, [opids, selected, onSelect, requested]);

  const controls = opids.length > 0 && (
    <Flex gap="2" align="center">
      <Select.Root value={selected ?? undefined} onValueChange={onSelect}>
        <Select.Trigger aria-label="OPID" style={{ minWidth: 220 }} />
        <Select.Content>
          {opids.map((opid) => (
            <Select.Item key={opid.id} value={opid.id}>
              {opid.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      {selected && (
        <Tooltip content="Edit this OPID">
          <IconButton variant="soft" color="gray" asChild>
            <Link href={editor(selected)} aria-label="Edit this OPID">
              <PencilLineIcon size={16} />
            </Link>
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  );

  return (
    <Section icon={NetworkIcon} title="OPID" aside={controls}>
      {opids.length === 0 ? (
        <Flex
          align="center"
          justify="center"
          style={{
            height: HEIGHT,
            border: "1px dashed var(--gray-a6)",
            borderRadius: "var(--radius-4)",
          }}
        >
          <Button size="3" variant="soft" asChild>
            <Link href={editor()}>
              <PlusIcon size={18} />
              OPID
            </Link>
          </Button>
        </Flex>
      ) : net ? (
        <NetGraph net={net} colors={colors} height={HEIGHT} />
      ) : (
        <Box style={{ height: HEIGHT }} />
      )}
    </Section>
  );
}
