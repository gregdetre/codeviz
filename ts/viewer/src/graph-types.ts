// Minimal graph types mirroring docs/reference/DATA_STRUCTURES.md

export type Graph = {
  version: number;
  schemaVersion: string;
  id_prefix?: string;
  defaultMode?: string;
  rootDir?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  moduleImports?: ModuleImportEdge[];
};

export type GraphNode = {
  id: string;
  label: string;
  file: string;
  line: number;
  module: string;
  kind: "function" | "class" | "variable" | string;
  tags?: Record<string, string | number | boolean>;
  signature?: string | null;
  doc?: string | null;
};

export type GraphEdge = {
  source: string;
  target: string;
  kind: "calls" | "imports" | string;
  conditions?: string[];
  order?: number | null;
};

export type GraphGroup = {
  id: string; // module id
  kind: "module" | "file" | string;
  children: string[]; // node ids (or file ids for module)
};

export type ModuleImportEdge = {
  source: string; // module name
  target: string; // module name
  weight?: number;
};

export type ViewerMode = "explore" | "modules";

export type ViewerConfig = {
  layout: "elk" | "fcose" | "elk-then-fcose";
  mode: ViewerMode;
  hybridMode?: "sequential";
  dark?: boolean;
  workspaceRoot?: string;
  projectName?: string;
  highlight?: HighlightConfig;
  wheelSensitivity?: number;
  colors?: {
    moduleBg?: { h: number; s: number; l: number };
    folderBg?: { h: number; s: number; l: number };
  };
};

export type HighlightConfig = {
  steps?: number; // 1 = first-degree only, 2 = include second-degree
  hideNonHighlightedEdges?: boolean;
  colors?: {
    focus?: string;
    incoming?: string;
    outgoing?: string;
    moduleOutline?: string;
  };
  opacity?: {
    fadedNodes?: number; // applied to non-highlighted nodes/modules
    fadedText?: number;  // text opacity on faded nodes/modules
    secondDegreeNodes?: number; // opacity for 2nd-degree nodes
    secondDegreeEdges?: number; // opacity for 2nd-degree edges
  };
  widths?: {
    edge?: number;
    edgeHighlighted?: number;
    nodeBorder?: number;
    nodeBorderHighlighted?: number;
  };
};


