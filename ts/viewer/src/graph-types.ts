// Minimal graph types mirroring docs/reference/DATA_STRUCTURES.md

export type Graph = {
  version: number;
  schemaVersion: string;
  id_prefix?: string;
  defaultMode?: string;
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
};


