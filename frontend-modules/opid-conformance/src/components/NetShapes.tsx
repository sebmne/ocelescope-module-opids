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
  selected?: boolean;
  /** Breaks a rule of OPIDs. */
  invalid?: boolean;
};

const ring = ({ selected, invalid }: Emphasis) =>
  [invalid ? "0 0 0 4px var(--red-a7)" : null, selected ? "0 0 0 4px var(--accent-a7)" : null]
    .filter(Boolean)
    .join(", ") || undefined;

/**
 * A place: filled with the color of its place color. A final place has a double border: as
 * oCoCoMoT reads a final marking, a run ends with at least one token in every final place and
 * none in any other.
 */
export function PlaceShape({
  fill,
  final = false,
  ...emphasis
}: Emphasis & { fill: string; final?: boolean }) {
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
        transition: "box-shadow 150ms",
      }}
    />
  );
}

/** A transition: a labelled box, or a black bar if it is silent, its label beneath. */
export function TransitionShape({
  label,
  silent = false,
  ...emphasis
}: Emphasis & { label: string; silent?: boolean }) {
  const { width, height } = nodeSize({ kind: "transition", silent });
  const style: CSSProperties = {
    width,
    height,
    background: silent ? INK : "var(--color-panel-solid)",
    border: `2px solid ${INK}`,
    borderRadius: 3,
    boxShadow: ring(emphasis),
    transition: "box-shadow 150ms",
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
