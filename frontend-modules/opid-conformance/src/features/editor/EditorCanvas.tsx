import {
  Background,
  type Connection,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeChange,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useConnection,
  useReactFlow,
} from "@xyflow/react";
import {
  CircleIcon,
  LayoutDashboardIcon,
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import { type DragEvent, useEffect, useMemo, useRef } from "react";
import {
  arcLine,
  Box,
  Flex,
  IconButton,
  nodeSize,
  PlaceShape,
  Separator,
  Tooltip,
  TransitionShape,
} from "../../components";
import type { ColorScheme } from "../../lib/colors";
import { inscription } from "../../lib/format";
import {
  addPlace,
  addTransition,
  canConnect,
  connect,
  type Draft,
  laidOut,
  move,
  placeOf,
  remove,
} from "./draft";
import type { DraftState } from "./useDraft";

const FIT = { padding: 0.15, maxZoom: 1.2 };

// The dot an arc is drawn from, on the right of every node.
const OUT = {
  width: 10,
  height: 10,
  right: -6,
  background: "var(--color-panel-solid)",
  border: "2px solid var(--gray-9)",
};
// The whole node takes an arc's end, but only while an arc is drawn: otherwise it is dragged.
const dropZone = (connecting: boolean) => ({
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  transform: "none",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  opacity: 0,
  pointerEvents: connecting ? ("all" as const) : ("none" as const),
});

type PlaceData = {
  fill: string;
  final: boolean;
  selected: boolean;
  invalid: boolean;
};
type TransitionData = { label: string; silent: boolean; selected: boolean; invalid: boolean };

function Ends() {
  const connecting = useConnection((connection) => connection.inProgress);
  return (
    <>
      <Handle id="in" type="target" position={Position.Left} style={dropZone(connecting)} />
      <Handle id="out" type="source" position={Position.Right} style={OUT} />
    </>
  );
}

function PlaceNode({ data }: NodeProps<Node<PlaceData>>) {
  return (
    <Box style={{ position: "relative" }}>
      <PlaceShape
        fill={data.fill}
        final={data.final}
        selected={data.selected}
        invalid={data.invalid}
      />
      <Ends />
    </Box>
  );
}

function TransitionNode({ data }: NodeProps<Node<TransitionData>>) {
  return (
    <Box style={{ position: "relative" }}>
      <TransitionShape
        label={data.label}
        silent={data.silent}
        selected={data.selected}
        invalid={data.invalid}
      />
      <Ends />
    </Box>
  );
}

const nodeTypes = { place: PlaceNode, transition: TransitionNode };

function Tool({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label} side="right">
      <IconButton
        variant="ghost"
        color="gray"
        size="2"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        // ghost buttons hang out by a negative margin; in the toolbar they keep their box
        style={{ margin: 0 }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

type Props = {
  state: DraftState;
  colors: ColorScheme;
  selected: string | null;
  onSelect: (id: string | null) => void;
  invalid: ReadonlySet<string>;
  /** A file dropped on the canvas, e.g. a .pnml. */
  onFile: (file: File) => void;
  height: number;
};

function Canvas({ state, colors, selected, onSelect, invalid, onFile, height }: Props) {
  const { draft, change, checkpoint, undo, canUndo, generation } = state;
  const flow = useReactFlow();
  const box = useRef<HTMLDivElement>(null);

  // fit a newly opened draft into view
  useEffect(() => {
    const timer = window.setTimeout(() => void flow.fitView(FIT), 30);
    return () => window.clearTimeout(timer);
  }, [generation, flow]);

  const nodes = useMemo<Node[]>(
    () => [
      ...draft.places.map((p) => ({
        id: p.id,
        type: "place",
        position: p.position,
        ...nodeSize({ kind: "place" }),
        // known sizes: React Flow keeps the handles' positions while the node moves
        measured: nodeSize({ kind: "place" }),
        selected: p.id === selected,
        data: {
          fill: colors.place(p.color),
          final: p.final,
          selected: p.id === selected,
          invalid: invalid.has(p.id),
        },
      })),
      ...draft.transitions.map((t) => ({
        id: t.id,
        type: "transition",
        position: t.position,
        ...nodeSize({ kind: "transition", silent: t.silent }),
        measured: nodeSize({ kind: "transition", silent: t.silent }),
        selected: t.id === selected,
        data: {
          label: t.label,
          silent: t.silent,
          selected: t.id === selected,
          invalid: invalid.has(t.id),
        },
      })),
    ],
    [draft, colors, selected, invalid],
  );

  const edges = useMemo<Edge[]>(
    () =>
      draft.arcs.map((arc) => {
        const place = placeOf(draft, arc.source) ?? placeOf(draft, arc.target);
        const color = invalid.has(arc.id)
          ? "var(--red-9)"
          : place
            ? colors.place(place.color)
            : "var(--gray-9)";
        const isSelected = arc.id === selected;
        return {
          id: arc.id,
          source: arc.source,
          target: arc.target,
          sourceHandle: "out",
          targetHandle: "in",
          selected: isSelected,
          label: inscription(arc.inscription),
          labelStyle: { fontSize: 11, fontWeight: isSelected ? 700 : 400 },
          labelBgPadding: [3, 1] as [number, number],
          style: {
            stroke: color,
            ...arcLine(arc.inscription.some((v) => v.isList)),
            ...(isSelected ? { strokeWidth: 3.2 } : {}),
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [draft, colors, selected, invalid],
  );

  // The middle of the visible canvas, where new nodes appear.
  const middle = () => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return flow.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };
  const add = (create: (draft: Draft) => { draft: Draft; id: string } | null) => {
    const result = create(draft);
    if (!result) return;
    change(() => result.draft);
    onSelect(result.id);
  };

  const onNodesChange = (changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === "position" && c.position) {
        const position = c.position;
        change((d) => move(d, c.id, position), false);
      }
    }
  };
  const onConnect = (connection: Connection) =>
    add((d) => connect(d, connection.source, connection.target));
  const onDrop = (event: DragEvent) => {
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    event.preventDefault();
    onFile(file);
  };

  return (
    <Box
      ref={box}
      onDragOver={(event) => event.dataTransfer.types.includes("Files") && event.preventDefault()}
      onDrop={onDrop}
      style={{
        height,
        border: "1px solid var(--gray-a5)",
        borderRadius: "var(--radius-4)",
        overflow: "hidden",
        background: "var(--color-panel-solid)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={checkpoint}
        onConnect={onConnect}
        isValidConnection={(c) => canConnect(draft, c.source, c.target)}
        onNodeClick={(_, node) => onSelect(node.id)}
        onEdgeClick={(_, edge) => onSelect(edge.id)}
        onPaneClick={() => onSelect(null)}
        onDelete={({ nodes: gone, edges: cut }) => {
          const ids = new Set([...gone, ...cut].map((element) => element.id));
          if (ids.size > 0) {
            change((d) => remove(d, ids));
            onSelect(null);
          }
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionOnDrag={false}
        multiSelectionKeyCode={null}
        connectionRadius={30}
        fitView
        fitViewOptions={FIT}
        minZoom={0.2}
        zoomOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
        <Panel position="top-left">
          <Flex
            direction="column"
            gap="2"
            p="1"
            style={{
              background: "var(--color-panel-solid)",
              border: "1px solid var(--gray-a5)",
              borderRadius: "var(--radius-3)",
            }}
          >
            <Tool label="Place" onClick={() => add((d) => addPlace(d, middle()))}>
              <CircleIcon size={17} />
            </Tool>
            <Tool label="Transition" onClick={() => add((d) => addTransition(d, middle(), false))}>
              <RectangleHorizontalIcon size={17} />
            </Tool>
            <Tool
              label="Silent transition (τ)"
              onClick={() => add((d) => addTransition(d, middle(), true))}
            >
              <RectangleVerticalIcon size={17} fill="currentColor" />
            </Tool>
            <Separator size="4" />
            <Tool
              label="Lay out"
              disabled={draft.places.length + draft.transitions.length === 0}
              onClick={() => {
                void laidOut(draft).then((next) => {
                  change(() => next);
                  window.setTimeout(() => void flow.fitView(FIT), 30);
                });
              }}
            >
              <LayoutDashboardIcon size={17} />
            </Tool>
            <Tool label="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
              <Undo2Icon size={17} />
            </Tool>
            <Tool
              label="Delete (⌫)"
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                change((d) => remove(d, new Set([selected])));
                onSelect(null);
              }}
            >
              <Trash2Icon size={17} />
            </Tool>
          </Flex>
        </Panel>
      </ReactFlow>
    </Box>
  );
}

// The net being edited: drag nodes, draw an arc from a node's dot onto another node, delete
// with ⌫, undo with ⌘Z. A .pnml file dropped on it is opened.
export default function EditorCanvas(props: Props) {
  const { undo } = props.state;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // key events may also come from the document itself, which is no element
      const target = event.target instanceof Element ? event.target : null;
      const typing = target?.closest("input, textarea, [contenteditable=true]");
      if (!typing && (event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
