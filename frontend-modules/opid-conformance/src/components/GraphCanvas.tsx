import { Box, Flex, Spinner } from "@r4pm/components/ui";
import {
  Background,
  Controls,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { type ReactNode, useEffect } from "react";

export interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes?: EdgeTypes;
  /** False while the layout is computed. */
  ready: boolean;
  /** Changes when the graph itself changes (not its highlighting): the view then fits again. */
  layoutKey: string;
  height: number;
  onNodeClick?: (id: string) => void;
  onPaneClick?: () => void;
  /** Shown in the top left corner, e.g. a legend. */
  overlay?: ReactNode;
}

// Small graphs are shown at their natural size rather than blown up.
const FIT = { padding: 0.08, maxZoom: 1 };

function FitOnChange({ layoutKey }: { layoutKey: string }) {
  const { fitView } = useReactFlow();
  // Fit once React Flow has measured the nodes, and again whenever the graph or the canvas's
  // size changes.
  const measured = useNodesInitialized();
  const size = useStore((state) => `${state.width}x${state.height}`);
  useEffect(() => {
    if (measured && layoutKey && size) void fitView(FIT);
  }, [measured, layoutKey, size, fitView]);
  return null;
}

// A node-link diagram in a framed box, as all graphs of the module are drawn.
export default function GraphCanvas({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  ready,
  layoutKey,
  height,
  onNodeClick,
  onPaneClick,
  overlay,
}: GraphCanvasProps) {
  return (
    <Box
      style={{
        height,
        border: "1px solid var(--gray-a5)",
        borderRadius: "var(--radius-4)",
        overflow: "hidden",
        background: "var(--color-panel-solid)",
      }}
    >
      {ready ? (
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={FIT}
            minZoom={0.1}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={!!onNodeClick}
            panOnDrag
            // The wheel scrolls the page; zoom with a pinch or the controls.
            zoomOnScroll={false}
            preventScrolling={false}
            zoomOnPinch
            zoomOnDoubleClick
            onNodeClick={onNodeClick ? (_, node) => onNodeClick(node.id) : undefined}
            onPaneClick={onPaneClick}
            proOptions={{ hideAttribution: true }}
          >
            <FitOnChange layoutKey={layoutKey} />
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
            {overlay && <Panel position="top-left">{overlay}</Panel>}
          </ReactFlow>
        </ReactFlowProvider>
      ) : (
        <Flex align="center" justify="center" height="100%">
          <Spinner />
        </Flex>
      )}
    </Box>
  );
}
