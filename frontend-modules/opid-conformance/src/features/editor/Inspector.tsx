import { ArrowRightIcon, CircleAlertIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  IconButton,
  SegmentedControl,
  Select,
  Text,
  TextField,
  Tooltip,
} from "../../components";
import type { ColorScheme } from "../../lib/colors";
import { inscription, variable } from "../../lib/format";
import {
  arcOf,
  type Draft,
  type DraftArc,
  type DraftPlace,
  type DraftTransition,
  kindOf,
  objectTypes,
  type Problem,
  placeOf,
  remove,
  setKind,
  transitionOf,
  updatePlace,
  updateTransition,
  updateVariable,
  type VariableKind,
  variableFor,
} from "./draft";
import type { DraftState } from "./useDraft";

type Edit = DraftState["change"];

// Typing changes the draft without recording every keystroke; focusing the field is the step
// that undo goes back to.
const typing = (edit: Edit, checkpoint: () => void) => ({
  onFocus: checkpoint,
  type: (change: Parameters<Edit>[0]) => edit(change, false),
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray" weight="medium">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

function TypeDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "1px solid #212529",
        flex: "none",
      }}
    />
  );
}

function Toggle({
  on,
  label,
  onChange,
  disabled,
  children,
}: {
  on: boolean;
  label: string;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <IconButton
        variant={on ? "solid" : "soft"}
        color={on ? undefined : "gray"}
        onClick={() => onChange(!on)}
        aria-label={label}
        aria-pressed={on}
        disabled={disabled}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

// A place drawn with a double border, as final places are.
function FinalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor">
      <circle cx="8" cy="8" r="6.5" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="4" strokeWidth="1.5" />
    </svg>
  );
}

function Remove({ id, edit, onSelect }: { id: string; edit: Edit; onSelect: (id: null) => void }) {
  return (
    <Button
      variant="soft"
      color="red"
      onClick={() => {
        edit((d) => remove(d, new Set([id])));
        onSelect(null);
      }}
    >
      <Trash2Icon size={15} />
      Delete
    </Button>
  );
}

const NEW_TYPE = "\u0000new";

// A place's color: the object types of its tuples, in order, each picked from the net's types
// or named anew. A second type makes the place hold tuples, e.g. order × product.
function ColorEditor({
  place,
  draft,
  colors,
  edit,
}: {
  place: DraftPlace;
  draft: Draft;
  colors: ColorScheme;
  edit: Edit;
}) {
  // the position whose type is being named (the color's length: a new position)
  const [naming, setNaming] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const known = objectTypes(draft);
  const setColor = (color: string[]) => edit((d) => updatePlace(d, place.id, { color }));
  const setType = (index: number, type: string) =>
    setColor(
      index === place.color.length
        ? [...place.color, type]
        : place.color.map((t, i) => (i === index ? type : t)),
    );
  const startNaming = (index: number) => {
    setNaming(index);
    setTyped("");
  };
  const commit = () => {
    const type = typed.trim();
    if (naming !== null && type) setType(naming, type);
    setNaming(null);
  };
  const nameField = (
    <TextField.Root
      size="2"
      autoFocus
      placeholder="Object type"
      value={typed}
      onChange={(event) => setTyped(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") setNaming(null);
      }}
      onBlur={commit}
      style={{ flex: 1 }}
    />
  );

  return (
    <Flex direction="column" gap="2">
      {place.color.map((type, i) => (
        // a color may name a type twice: a position is its identity
        <Flex key={`${i}-${type}`} gap="2" align="center">
          <TypeDot color={colors.type(type)} size={12} />
          {naming === i ? (
            nameField
          ) : (
            <Select.Root
              value={type}
              onValueChange={(value) => (value === NEW_TYPE ? startNaming(i) : setType(i, value))}
            >
              <Select.Trigger style={{ flex: 1 }} aria-label="Object type" />
              <Select.Content>
                {known.map((t) => (
                  <Select.Item key={t} value={t}>
                    {t}
                  </Select.Item>
                ))}
                <Select.Separator />
                <Select.Item value={NEW_TYPE}>New type…</Select.Item>
              </Select.Content>
            </Select.Root>
          )}
          {place.color.length > 1 && (
            <IconButton
              variant="ghost"
              color="gray"
              aria-label={`Remove ${type}`}
              style={{ margin: 0 }}
              onClick={() => setColor(place.color.filter((_, j) => j !== i))}
            >
              <XIcon size={14} />
            </IconButton>
          )}
        </Flex>
      ))}
      {naming === place.color.length ? (
        <Flex gap="2" align="center">
          <TypeDot color="var(--gray-6)" size={12} />
          {nameField}
        </Flex>
      ) : (
        <Tooltip content="Add a type: the place holds tuples">
          <Button
            variant="ghost"
            color="gray"
            size="1"
            style={{ alignSelf: "flex-start", margin: 0 }}
            onClick={() => {
              const unused = known.find((t) => !place.color.includes(t));
              if (unused) setType(place.color.length, unused);
              else startNaming(place.color.length);
            }}
          >
            <PlusIcon size={13} />
            type
          </Button>
        </Tooltip>
      )}
    </Flex>
  );
}

function PlaceForm({
  place,
  draft,
  colors,
  edit,
  onSelect,
}: {
  place: DraftPlace;
  draft: Draft;
  colors: ColorScheme;
  edit: Edit;
  onSelect: (id: null) => void;
}) {
  return (
    <>
      <Field label="Color">
        <ColorEditor place={place} draft={draft} colors={colors} edit={edit} />
      </Field>
      <Flex gap="2">
        <Toggle
          on={place.final}
          label="Final: at the end it holds a token (every other place is empty)"
          onChange={(final) => edit((d) => updatePlace(d, place.id, { final }))}
        >
          <FinalIcon />
        </Toggle>
      </Flex>
      <Remove id={place.id} edit={edit} onSelect={onSelect} />
    </>
  );
}

function TransitionForm({
  transition,
  edit,
  checkpoint,
  onSelect,
}: {
  transition: DraftTransition;
  edit: Edit;
  checkpoint: () => void;
  onSelect: (id: null) => void;
}) {
  const text = typing(edit, checkpoint);
  return (
    <>
      <Field label="Label">
        <TextField.Root
          value={transition.label}
          onFocus={text.onFocus}
          onChange={(event) =>
            text.type((d) => updateTransition(d, transition.id, { label: event.target.value }))
          }
        />
      </Field>
      <Flex gap="2">
        <Toggle
          on={transition.silent}
          label="Silent (τ): no event in the log"
          onChange={(silent) => edit((d) => updateTransition(d, transition.id, { silent }))}
        >
          <Text size="3" weight="bold">
            τ
          </Text>
        </Toggle>
      </Flex>
      <Remove id={transition.id} edit={edit} onSelect={onSelect} />
    </>
  );
}

const KINDS: { kind: VariableKind; hint: string }[] = [
  { kind: "single", hint: "One object" },
  { kind: "list", hint: "Any number of objects (a variable arc)" },
  { kind: "fresh", hint: "A new object (ν)" },
];

function ArcForm({
  arc,
  draft,
  colors,
  edit,
  checkpoint,
  onSelect,
}: {
  arc: DraftArc;
  draft: Draft;
  colors: ColorScheme;
  edit: Edit;
  checkpoint: () => void;
  onSelect: (id: null) => void;
}) {
  const text = typing(edit, checkpoint);
  // a place as the circle of its color, a transition by its label
  const end = (id: string) => {
    const place = placeOf(draft, id);
    if (place) return <TypeDot color={colors.place(place.color)} size={16} />;
    const transition = transitionOf(draft, id);
    return <Text size="2">{transition?.silent ? "τ" : transition?.label}</Text>;
  };
  return (
    <>
      <Flex gap="2" align="center" wrap="wrap">
        {end(arc.source)}
        <ArrowRightIcon size={14} color="var(--gray-10)" />
        {end(arc.target)}
      </Flex>
      <Text size="6" weight="bold" align="center" style={{ fontFamily: "var(--code-font-family)" }}>
        {inscription(arc.inscription)}
      </Text>
      {arc.inscription.map((v, i) => (
        <Flex key={i} direction="column" gap="1">
          <Flex gap="1" align="center">
            <TypeDot color={colors.type(v.type)} />
            <Text size="1" color="gray" weight="medium">
              {v.type}
            </Text>
          </Flex>
          <Flex gap="2" align="center">
            <TextField.Root
              size="1"
              value={variable(v.name)}
              onFocus={text.onFocus}
              onChange={(event) =>
                text.type((d) =>
                  updateVariable(d, arc.id, i, event.target.value.replace(/^ν/, "nu")),
                )
              }
              style={{ width: 84, fontFamily: "var(--code-font-family)" }}
              aria-label={`Variable for ${v.type}`}
            />
            <SegmentedControl.Root
              size="1"
              value={kindOf(v)}
              onValueChange={(kind) => edit((d) => setKind(d, arc.id, i, kind as VariableKind))}
            >
              {KINDS.map(({ kind, hint }) => (
                <SegmentedControl.Item key={kind} value={kind}>
                  <Tooltip content={hint}>
                    <span style={{ fontFamily: "var(--code-font-family)" }}>
                      {variable(variableFor(draft, v.type, kind).name)}
                    </span>
                  </Tooltip>
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
          </Flex>
        </Flex>
      ))}
      <Remove id={arc.id} edit={edit} onSelect={onSelect} />
    </>
  );
}

// What can be changed about the selected place, transition or arc. With nothing selected, the
// problems that keep the draft from being an OPID, each leading to its element.
export default function Inspector({
  state,
  colors,
  selected,
  onSelect,
}: {
  state: DraftState;
  colors: ColorScheme;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { draft, change: edit, checkpoint, problems } = state;
  const place = selected ? placeOf(draft, selected) : undefined;
  const transition = selected ? transitionOf(draft, selected) : undefined;
  const arc = selected ? arcOf(draft, selected) : undefined;
  const own = problems.filter((problem) => problem.id !== null && problem.id === selected);

  return (
    <Flex direction="column" gap="3">
      {place && (
        <PlaceForm place={place} draft={draft} colors={colors} edit={edit} onSelect={onSelect} />
      )}
      {transition && (
        <TransitionForm
          transition={transition}
          edit={edit}
          checkpoint={checkpoint}
          onSelect={onSelect}
        />
      )}
      {arc && (
        <ArcForm
          arc={arc}
          draft={draft}
          colors={colors}
          edit={edit}
          checkpoint={checkpoint}
          onSelect={onSelect}
        />
      )}
      {own.map((problem) => (
        <ProblemLine key={problem.message} problem={problem} />
      ))}
      {!place && !transition && !arc && (
        <Overview colors={colors} problems={problems} onSelect={onSelect} />
      )}
    </Flex>
  );
}

function ProblemLine({ problem, onSelect }: { problem: Problem; onSelect?: (id: string) => void }) {
  const line = (
    <Flex gap="2" align="start">
      <CircleAlertIcon size={14} color="var(--red-9)" style={{ flex: "none", marginTop: 2 }} />
      <Text size="1" color="red">
        {problem.message}
      </Text>
    </Flex>
  );
  if (!onSelect || problem.id === null) return line;
  const id = problem.id;
  return (
    <Box
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => event.key === "Enter" && onSelect(id)}
    >
      {line}
    </Box>
  );
}

function Overview({
  colors,
  problems,
  onSelect,
}: {
  colors: ColorScheme;
  problems: Problem[];
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {colors.entries.length > 0 && (
        <Flex direction="column" gap="1">
          {colors.entries.map((entry) => (
            <Flex key={entry.color.join()} gap="2" align="center">
              <TypeDot color={entry.hex} />
              <Text size="1">{entry.color.join(" × ")}</Text>
            </Flex>
          ))}
        </Flex>
      )}
      {problems.map((problem) => (
        <ProblemLine
          key={`${problem.id}-${problem.message}`}
          problem={problem}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
