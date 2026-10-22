import { Box, Flex, Text } from "@r4pm/components/ui";
import { type Edge, Handle, MarkerType, type Node, type NodeProps, Position } from "@xyflow/react";
import { useMemo } from "react";
import type { Opid } from "../api/opidConformance";
import { useLayeredLayout } from "../hooks/useLayeredLayout";
import type { ColorScheme } from "../lib/colors";
import { inscription } from "../lib/format";
import GraphCanvas from "./GraphCanvas";
import { arcLine, nodeSize, PlaceShape, TransitionShape } from "./NetShapes";

const hidden = { opacity: 0, pointerEvents: "none" as const };

type PlaceData = { fill: string; final: boolean };
type TransitionData = { label: string; silent: boolean };

function PlaceNode({ data }: NodeProps<Node<PlaceData>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} style={hidden} />
      <PlaceShape fill={data.fill} final={data.final} />
      <Handle type="source" position={Position.Right} style={hidden} />
    </>
  );
}

function TransitionNode({ data }: NodeProps<Node<TransitionData>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} style={hidden} />
      <TransitionShape label={data.label} silent={data.silent} />
      <Handle type="source" position={Position.Right} style={hidden} />
    </>
  );
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode };

// An OPID as a Petri net: places filled with the color of their place color (Gianola et al.
// write the colors of Fig. 3 the same way), tuples as (o, P), variable arcs dashed. Drawn where
// the editor put its nodes, else laid out.
export default function NetGraph({
  net,
  colors,
  height = 420,
}: {
  net: Opid;
  colors: ColorScheme;
  height?: number;
}) {
  const stored = useMemo(() => {
    const nodes = [...net.places, ...net.transitions];
    if (!nodes.every((node) => node.position)) return null;
    return Object.fromEntries(nodes.map((node) => [node.id, node.position ?? { x: 0, y: 0 }]));
  }, [net]);
  const layoutNodes = useMemo(
    () =>
      stored
        ? []
        : [
            ...net.places.map((p) => ({ id: p.id, ...nodeSize({ kind: "place" }) })),
            ...net.transitions.map((t) => ({
              id: t.id,
              ...nodeSize({ kind: "transition", silent: t.silent ?? false }),
            })),
          ],
    [net, stored],
  );
  const layoutEdges = useMemo(
    () =>
      stored ? [] : net.arcs.map((a, i) => ({ id: `a${i}`, source: a.source, target: a.target })),
    [net, stored],
  );
  const laidOut = useLayeredLayout(layoutNodes, layoutEdges, { spacing: 46 });
  const positions = stored ?? laidOut?.nodes ?? null;

  const nodes = useMemo<Node[]>(() => {
    if (!positions) return [];
    const at = (id: string) => positions[id] ?? { x: 0, y: 0 };
    return [
      ...net.places.map((p) => ({
        id: p.id,
        type: "place",
        position: at(p.id),
        data: { fill: colors.place(p.color), final: p.final ?? false },
      })),
      ...net.transitions.map((t) => ({
        id: t.id,
        type: "transition",
        position: at(t.id),
        data: { label: t.label, silent: t.silent ?? false },
      })),
    ];
  }, [net, positions, colors]);

  const edges = useMemo<Edge[]>(() => {
    const places = new Map(net.places.map((p) => [p.id, p]));
    return net.arcs.map((arc, i) => {
      const place = places.get(arc.source) ?? places.get(arc.target);
      const color = place ? colors.place(place.color) : "var(--gray-9)";
      return {
        id: `a${i}`,
        source: arc.source,
        target: arc.target,
        label: inscription(arc.inscription),
        labelStyle: { fontSize: 11 },
        labelBgPadding: [3, 1] as [number, number],
        style: { stroke: color, ...arcLine(arc.inscription.some((v) => v.isList)) },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });
  }, [net, colors]);

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      ready={positions !== null}
      layoutKey={JSON.stringify([...net.places, ...net.transitions].map((n) => n.id))}
      height={height}
      overlay={
        <Flex
          gap="3"
          px="2"
          py="1"
          style={{ background: "var(--color-panel-solid)", borderRadius: 4 }}
        >
          {colors.entries.map((entry) => (
            <Flex key={entry.color.join()} gap="1" align="center">
              <Box
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: entry.hex,
                  border: "1px solid #212529",
                }}
              />
              <Text size="1">{entry.color.join(" × ")}</Text>
            </Flex>
          ))}
        </Flex>
      }
    />
  );
}
