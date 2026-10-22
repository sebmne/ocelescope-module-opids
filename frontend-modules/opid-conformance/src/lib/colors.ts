// As in the figures of Gianola et al., every place color (an object type or a tuple of object
// types) gets one hue: order blue, product yellow, order × product green.
const PALETTE = [
  "#4C8BD6", // blue
  "#F2C230", // yellow
  "#5BAA5B", // green
  "#E07B39", // orange
  "#9B6BC7", // purple
  "#D9538E", // pink
  "#45B5BF", // teal
  "#A0785A", // brown
];
const FALLBACK = "#adb5bd";

export type ColorScheme = {
  /** Color of a place color, i.e. of a tuple of object types. */
  place: (color: readonly string[]) => string;
  /** Color of an object type: the color of places holding just that type. */
  type: (objectType: string | undefined) => string;
  /** Place colors in legend order: single types first, then tuples. */
  entries: { color: string[]; hex: string }[];
};

const key = (color: readonly string[]) => color.join(" × ");

export const colorScheme = (
  placeColors: readonly (readonly string[])[],
  objectTypes: Iterable<string> = [],
): ColorScheme => {
  const types = [...new Set([...placeColors.flat(), ...objectTypes])].sort();
  const tuples = [
    ...new Map(placeColors.filter((c) => c.length > 1).map((c) => [key(c), [...c]])).values(),
  ].sort((a, b) => a.length - b.length || key(a).localeCompare(key(b)));
  const colors = [...types.map((t) => [t]), ...tuples];
  const hex = new Map(colors.map((c, i) => [key(c), PALETTE[i % PALETTE.length] ?? FALLBACK]));
  const used = new Set(placeColors.map(key));
  return {
    place: (color) => hex.get(key(color)) ?? FALLBACK,
    type: (objectType) => (objectType ? (hex.get(objectType) ?? FALLBACK) : FALLBACK),
    entries: colors
      .filter((c) => used.has(key(c)))
      .map((c) => ({ color: c, hex: hex.get(key(c)) ?? FALLBACK })),
  };
};

export const MOVE_COLORS = {
  sync: "#2f9e44",
  log: "#e8590c",
  model: "#7048e8",
  silent: "#868e96",
} as const;

export type MoveColorKey = keyof typeof MOVE_COLORS;
