// The module's shared building blocks and its look: the only place that knows the component
// library (Radix Themes, via r4pm). Features build their screens from these.

// The loading, empty and error states of anything asked from the backend, as everywhere in
// Ocelescope.
export { AsyncBoundary } from "@r4pm/components";
// Layout, typography and simple controls, as Radix provides them.
export {
  Badge,
  Box,
  Button,
  Card,
  DropdownMenu,
  Flex,
  Grid,
  HoverCard,
  IconButton,
  Kbd,
  ScrollArea,
  SegmentedControl,
  Select,
  Separator,
  Slider,
  Spinner,
  Text,
  TextField,
  Tooltip,
} from "@r4pm/components/ui";
export { default as GraphCanvas, type GraphCanvasProps } from "./GraphCanvas";
export { default as NetGraph } from "./NetGraph";
export {
  arcLine,
  nodeSize,
  PLACE,
  PlaceShape,
  TRANSITION,
  TransitionShape,
} from "./NetShapes";
export { default as ObjectChips } from "./ObjectChips";
export { default as ObjectDots } from "./ObjectDots";
export { default as Page } from "./Page";
export { default as RoutedEdge, type RoutedEdgeData } from "./RoutedEdge";
export { default as Section } from "./Section";
