import { Flex, Text, Tooltip } from "@r4pm/components/ui";

// Objects as colored dots, one color per object type; the id shows on hover, or next to the
// dot when `labelled`.
export default function ObjectDots({
  objects,
  colorOf,
  labelled = false,
  size = 10,
}: {
  objects: readonly string[];
  colorOf: (object: string) => string;
  labelled?: boolean;
  size?: number;
}) {
  return (
    <Flex gap={labelled ? "2" : "1"} wrap="wrap" align="center">
      {objects.map((object) => {
        const dot = (
          <span
            role="img"
            aria-label={object}
            style={{
              display: "inline-block",
              flex: "none",
              width: size,
              height: size,
              borderRadius: "50%",
              background: colorOf(object),
              boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.25)",
            }}
          />
        );
        return labelled ? (
          <Flex key={object} gap="1" align="center">
            {dot}
            <Text size="1" color="gray">
              {object}
            </Text>
          </Flex>
        ) : (
          <Tooltip key={object} content={object}>
            {dot}
          </Tooltip>
        );
      })}
    </Flex>
  );
}
