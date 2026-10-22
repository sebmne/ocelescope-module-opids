// Notation for inscriptions, tokens and bindings. Tuples are written (a, b); a single variable
// or object stands alone, as the paper writes o instead of ⟨o⟩.

/**
 * oCoCoMoT marks fresh-object variables by "nu" in their name (it is ASCII in the PNML), which
 * is displayed as ν.
 */
export const variable = (name: string) => name.replace(/^nu/, "ν");

export const tuple = (items: readonly string[]) =>
  items.length === 1 ? (items[0] ?? "") : `(${items.join(", ")})`;

export const inscription = (variables: readonly { name: string }[]) =>
  tuple(variables.map((v) => variable(v.name)));

export const binding = (values: Record<string, string | string[] | null>) =>
  Object.entries(values)
    .map(
      ([name, value]) =>
        `${variable(name)} ↦ ${Array.isArray(value) ? `[${value.join(", ")}]` : (value ?? "–")}`,
    )
    .join(", ");

/** A duration in seconds, short: "0.03 s", "2.4 s", "1 min 12 s". */
export const seconds = (value: number) => {
  if (value < 60) return `${value.toLocaleString(undefined, { maximumSignificantDigits: 2 })} s`;
  const minutes = Math.floor(value / 60);
  return `${minutes} min ${Math.round(value - minutes * 60)} s`;
};
