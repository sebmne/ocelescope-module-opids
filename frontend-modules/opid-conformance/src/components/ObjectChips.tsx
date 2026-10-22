import { Flex, Text } from "@r4pm/components/ui";

// Objects as small pills: a dot in the color of the object's type, and its id.
export default function ObjectChips({
  objects,
  colorOf,
  justify = "start",
}: {
  objects: readonly string[];
  colorOf: (object: string) => string;
  justify?: "start" | "center";
}) {
  return (
    <Flex gap="1" wrap="wrap" justify={justify}>
      {objects.map((object) => {
        const color = colorOf(object);
        return (
          <Flex
            key={object}
            gap="1"
            align="center"
            px="2"
            style={{
              borderRadius: 999,
              background: `color-mix(in srgb, ${color} 16%, var(--color-panel-solid))`,
              border: `1px solid color-mix(in srgb, ${color} 55%, transparent)`,
              lineHeight: "18px",
            }}
          >
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: "50%", background: color, flex: "none" }}
            />
            <Text size="1" weight="medium">
              {object}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
}
