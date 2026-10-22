import { Box, Flex, Text, Tooltip } from "@r4pm/components/ui";
import { type Edge, Handle, MarkerType, type Node, type NodeProps, Position } from "@xyflow/react";
import { useMemo } from "react";
import type { Opid } from "../api/opidConformance";
import { useLayeredLayout } from "../hooks/useLayeredLayout";
import type { ColorScheme } from "../lib/colors";
import { inscription, tuple } from "../lib/format";
import GraphCanvas from "./GraphCanvas";
import { arcLine, nodeSize, PlaceShape, TransitionShape } from "./NetShapes";

const hidden = { opacity: 0, pointerEvents: "none" as const };

type PlaceData = {
  fill: string;
  tokens?: string[][];
  final: boolean;
  dimmed: boolean;
};
type TransitionData = { label: string; silent: boolean; firing: boolean; dimmed: boolean };

function PlaceNode({ data }: NodeProps<Node<PlaceData>>) {
  const shape = (
    <PlaceShape fill={data.fill} final={data.final} tokens={data.tokens} dimmed={data.dimmed} />
  );
  return (
    <>
      <Handle type="target" position={Position.Left} style={hidden} />
      {/* A place is its color; its tokens, if any, show on hover. */}
      {data.tokens && data.tokens.length > 0 ? (
        <Tooltip content={data.tokens.map(tuple).join(",  ")}>
          <Box>{shape}</Box>
        </Tooltip>
      ) : (
        shape
      )}
      <Handle type="source" position={Position.Right} style={hidden} />
    </>
  );
}

function TransitionNode({ data }: NodeProps<Node<TransitionData>>) {
  return (
    <>
      <Handle type="target" position={Position.Left} style={hidden} />
      <TransitionShape
        label={data.label}
        silent={data.silent}
        firing={data.firing}
        dimmed={data.dimmed}
      />
      <Handle type="source" position={Position.Right} style={hidden} />
    </>
  );
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode };

// An OPID as a Petri net: places filled with the color of their place color (Gianola et al.
// write the colors of Fig. 3 the same way), tuples as (o, P), variable arcs dashed. Drawn where
// the editor put its nodes, else laid out. Given a marking, places show their tokens; given a
// firing transition, its arcs move and the rest dims.
export default function NetGraph({
  net,
  colors,
  marking,
  firing,
  height = 420,
  still = false,
  legend = true,
}: {
  net: Opid;
  colors: ColorScheme;
  marking?: Record<string, string[][]>;
  firing?: string | null;
  height?: number;
  still?: boolean;
  legend?: boolean;
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
  const touched = useMemo(() => {
    if (!firing) return null;
    const ids = new Set([firing]);
    for (const arc of net.arcs) {
      if (arc.source === firing) ids.add(arc.target);
      if (arc.target === firing) ids.add(arc.source);
    }
    return ids;
  }, [net, firing]);

  const nodes = useMemo<Node[]>(() => {
    if (!positions) return [];
    const at = (id: string) => positions[id] ?? { x: 0, y: 0 };
    return [
      ...net.places.map((p) => ({
        id: p.id,
        type: "place",
        position: at(p.id),
        data: {
          fill: colors.place(p.color),
          tokens: marking?.[p.id],
          final: p.final ?? false,
          dimmed: touched !== null && !touched.has(p.id),
        },
      })),
      ...net.transitions.map((t) => ({
        id: t.id,
        type: "transition",
        position: at(t.id),
        data: {
          label: t.label,
          silent: t.silent ?? false,
          firing: t.id === firing,
          dimmed: touched !== null && !touched.has(t.id),
        },
      })),
    ];
  }, [net, positions, colors, marking, firing, touched]);

  const edges = useMemo<Edge[]>(() => {
    const places = new Map(net.places.map((p) => [p.id, p]));
    return net.arcs.map((arc, i) => {
      const place = places.get(arc.source) ?? places.get(arc.target);
      const color = place ? colors.place(place.color) : "var(--gray-9)";
      const active = firing != null && (arc.source === firing || arc.target === firing);
      return {
        id: `a${i}`,
        source: arc.source,
        target: arc.target,
        label: inscription(arc.inscription),
        labelStyle: { fontSize: 11, fontWeight: active ? 700 : 400 },
        labelBgPadding: [3, 1] as [number, number],
        animated: active,
        style: {
          stroke: color,
          ...arcLine(arc.inscription.some((v) => v.isList)),
          opacity: firing && !active ? 0.3 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      };
    });
  }, [net, colors, firing]);

  return (
    <GraphCanvas
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      ready={positions !== null}
      layoutKey={JSON.stringify([...net.places, ...net.transitions].map((n) => n.id))}
      height={height}
      still={still}
      overlay={
        legend && (
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
        )
      }
    />
  );
}
