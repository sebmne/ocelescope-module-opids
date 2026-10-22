import { getModuleRoute } from "@ocelescope/core";
import {
  CheckIcon,
  CopyPlusIcon,
  FilePlusIcon,
  GitCompareArrowsIcon,
  NetworkIcon,
  PencilLineIcon,
  SaveIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  DropdownMenu,
  Flex,
  IconButton,
  Spinner,
  Text,
  TextField,
  Tooltip,
} from "../../components";
import { colorScheme } from "../../lib/colors";
import EditorCanvas from "./EditorCanvas";
import Inspector from "./Inspector";
import { useDraft } from "./useDraft";
import { useSave } from "./useSave";
import { useSources } from "./useSources";

const HEIGHT = 600;

// A button like New and .pnml that lists what it can open.
function OpenMenu({
  icon,
  label,
  items,
  onOpen,
}: {
  icon: ReactNode;
  label: string;
  items: readonly { id: string; name: string }[];
  onOpen: (id: string) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={items.length === 0}>
        <Button variant="soft" color="gray">
          {icon}
          {label}
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {items.map((item) => (
          <DropdownMenu.Item key={item.id} onSelect={() => onOpen(item.id)}>
            {item.name}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
const ACCEPT = ".pnml,.xml";

// Builds an OPID: start from nothing, a PNML file, an object-centric Petri net of the session
// (encoded by Remark 1 of Gianola et al.) or a saved OPID; edit it; save it as a resource.
export default function OpidEditor() {
  const state = useDraft();
  const { draft, problems, changed, generation, open } = state;
  const sources = useSources(open);
  const { save, saving, error: saveError } = useSave(state);
  const [selected, setSelected] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // a new draft starts unselected
  useEffect(() => setSelected(null), [generation]);

  // ?opid=… opens that OPID, e.g. coming from the alignments
  const requested = typeof router.query.opid === "string" ? router.query.opid : null;
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!requested || opened.current === requested) return;
    if (!sources.opids.some((opid) => opid.id === requested)) return;
    opened.current = requested;
    void sources.openSaved(requested);
  }, [requested, sources]);

  const colors = useMemo(() => colorScheme(draft.places.map((p) => p.color)), [draft.places]);
  const invalid = useMemo(
    () => new Set(problems.flatMap((p) => (p.id === null ? [] : [p.id]))),
    [problems],
  );
  const saved = !!draft.savedId && !changed;
  const blocked = problems[0]?.message ?? null;

  return (
    <Flex direction="column" gap="4">
      <Card size="2">
        <Flex gap="3" align="center" wrap="wrap">
          <Button variant="soft" color="gray" onClick={sources.openEmpty}>
            <FilePlusIcon size={15} />
            New
          </Button>
          <Button variant="soft" color="gray" onClick={() => picker.current?.click()}>
            <UploadIcon size={15} />
            .pnml
          </Button>
          <input
            ref={picker}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void sources.openPnml(file);
              event.target.value = "";
            }}
          />
          <Tooltip
            content={
              sources.petriNets.length > 0
                ? "Encode an object-centric Petri net (Remark 1)"
                : "No Petri net in the session yet, e.g. discover one in Ocelescope"
            }
          >
            <Box>
              <OpenMenu
                icon={<NetworkIcon size={15} />}
                label="Petri net"
                items={sources.petriNets}
                onOpen={(id) => void sources.openPetriNet(id)}
              />
            </Box>
          </Tooltip>
          <OpenMenu
            icon={<PencilLineIcon size={15} />}
            label="Saved OPID"
            items={sources.opids}
            onOpen={(id) => void sources.openSaved(id)}
          />
          {sources.busy && <Spinner />}
          {sources.error && (
            <Text size="1" color="red">
              {sources.error}
            </Text>
          )}
        </Flex>
      </Card>

      <Card size="3">
        <Flex direction="column" gap="4">
          <Flex gap="3" align="center" wrap="wrap">
            <TextField.Root
              size="3"
              value={draft.name}
              onFocus={state.checkpoint}
              onChange={(event) => {
                const name = event.target.value;
                state.change((d) => ({ ...d, name }), false);
              }}
              aria-label="Name"
              style={{ width: 300, fontWeight: 600 }}
            />
            <Box flexGrow="1" />
            {saveError && (
              <Text size="1" color="red">
                {saveError}
              </Text>
            )}
            {draft.savedId && (
              <Tooltip content="Save as a new OPID">
                <IconButton
                  variant="soft"
                  color="gray"
                  disabled={!!blocked || saving}
                  onClick={() => void save(true)}
                  aria-label="Save as a new OPID"
                >
                  <CopyPlusIcon size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip content={blocked ?? (saved ? "Saved" : "Save as an OPID resource")}>
              <Button
                disabled={!!blocked || saved}
                loading={saving}
                onClick={() => void save()}
                style={{ minWidth: 110 }}
              >
                {saved ? <CheckIcon size={16} /> : <SaveIcon size={16} />}
                {saved ? "Saved" : "Save"}
              </Button>
            </Tooltip>
            {saved && draft.savedId && (
              <Button variant="soft" asChild>
                <Link
                  href={getModuleRoute({
                    moduleName: "opidConformance",
                    routeName: "alignments",
                    query: { opid: draft.savedId },
                  })}
                >
                  <GitCompareArrowsIcon size={16} />
                  Align
                </Link>
              </Button>
            )}
          </Flex>
          <Flex gap="4" align="start">
            <Box flexGrow="1" minWidth="0">
              <EditorCanvas
                state={state}
                colors={colors}
                selected={selected}
                onSelect={setSelected}
                invalid={invalid}
                onFile={(file) => void sources.openPnml(file)}
                height={HEIGHT}
              />
            </Box>
            <Box flexShrink="0" style={{ width: 290, minHeight: HEIGHT }}>
              <Inspector state={state} colors={colors} selected={selected} onSelect={setSelected} />
            </Box>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
