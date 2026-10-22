import { Flex, Text } from "@r4pm/components/ui";
import type { CSSProperties } from "react";

// The look of an OPID's places and transitions, shared by the net view and the editor.

export const PLACE = 42;
export const TRANSITION = { width: 120, height: 42, silentWidth: 14 };
const INK = "#212529";

/** The size a node is drawn at. */
export const nodeSize = (node: { kind: "place" } | { kind: "transition"; silent: boolean }) =>
  node.kind === "place"
    ? { width: PLACE, height: PLACE }
    : { width: node.silent ? TRANSITION.silentWidth : TRANSITION.width, height: TRANSITION.height };

type Emphasis = {
  /** Faded, e.g. while another transition fires. */
  dimmed?: boolean;
  selected?: boolean;
  /** Breaks a rule of OPIDs. */
  invalid?: boolean;
};

const ring = ({ selected, invalid }: Emphasis, extra?: string) =>
  [
    invalid ? "0 0 0 4px var(--red-a7)" : null,
    selected ? "0 0 0 4px var(--accent-a7)" : null,
    extra ?? null,
  ]
    .filter(Boolean)
    .join(", ") || undefined;

const DOT = 8;
const MAX_DOTS = 4;

// A marking's tokens as dots, or their number if there are too many.
function Tokens({ tokens }: { tokens: readonly unknown[] }) {
  if (tokens.length > MAX_DOTS) {
    return (
      <Text size="1" weight="bold" style={{ color: "#fff", textShadow: "0 0 2px #000" }}>
        {tokens.length}
      </Text>
    );
  }
  return (
    <Flex gap="1" wrap="wrap" justify="center" style={{ maxWidth: 2 * DOT + 6 }}>
      {tokens.map((_, i) => (
        <span
          // dots have no identity of their own
          key={i}
          style={{
            width: DOT,
            height: DOT,
            borderRadius: "50%",
            background: INK,
            display: "block",
          }}
        />
      ))}
    </Flex>
  );
}

/**
 * A place: filled with the color of its place color. A final place has a double border: as
 * oCoCoMoT reads a final marking, a run ends with at least one token in every final place and
 * none in any other. Given `tokens` (a marking of a run), they are drawn inside.
 */
export function PlaceShape({
  fill,
  final = false,
  tokens = [],
  ...emphasis
}: Emphasis & { fill: string; final?: boolean; tokens?: readonly unknown[] }) {
  return (
    <Flex
      align="center"
      justify="center"
      style={{
        width: PLACE,
        height: PLACE,
        borderRadius: "50%",
        background: fill,
        border: final ? `4px double ${INK}` : `2px solid ${INK}`,
        boxShadow: ring(emphasis),
        opacity: emphasis.dimmed ? 0.35 : 1,
        transition: "opacity 150ms, box-shadow 150ms",
      }}
    >
      {tokens.length > 0 && <Tokens tokens={tokens} />}
    </Flex>
  );
}

/** A transition: a labelled box, or a black bar if it is silent, its label beneath. */
export function TransitionShape({
  label,
  silent = false,
  firing = false,
  ...emphasis
}: Emphasis & { label: string; silent?: boolean; firing?: boolean }) {
  const { width, height } = nodeSize({ kind: "transition", silent });
  const style: CSSProperties = {
    width,
    height,
    background: silent ? INK : "var(--color-panel-solid)",
    border: `2px solid ${firing ? "var(--accent-9)" : INK}`,
    borderRadius: 3,
    boxShadow: ring(emphasis, firing ? "0 0 0 4px var(--accent-a5)" : undefined),
    opacity: emphasis.dimmed ? 0.35 : 1,
    transition: "opacity 150ms, box-shadow 150ms",
    padding: 4,
  };
  return (
    <>
      <Flex align="center" justify="center" style={style}>
        {!silent && (
          <Text size="1" weight="bold" align="center" truncate style={{ maxWidth: width - 10 }}>
            {label}
          </Text>
        )}
      </Flex>
      {silent && label && (
        <Text
          size="1"
          color="gray"
          align="center"
          style={{ position: "absolute", width: 110, left: (width - 110) / 2, top: height + 2 }}
        >
          {label}
        </Text>
      )}
    </>
  );
}

/** The line of an arc: dashed if it is variable (it has a list variable), as in the paper. */
export const arcLine = (variable: boolean) => ({
  strokeWidth: 1.8,
  strokeDasharray: variable ? "7 4" : undefined,
});
