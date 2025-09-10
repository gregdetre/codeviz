export interface GdvizCodebaseGraph {
  version: number;
  schemaVersion?: string;
  id_prefix?: string;
  defaultMode: "default" | "exec" | "modules" | "datastruct";
  nodes: {
    id: string;
    label: string;
    file: string;
    line?: number | null;
    module: string;
    kind?: string;
    tags?: {
      [k: string]: string[];
    };
    signature?: string | null;
    doc?: string | null;
    [k: string]: unknown;
  }[];
  edges: {
    source: string;
    target: string;
    kind: "calls" | "bash_entry" | "build_step" | "runtime_call";
    conditions?: string[];
    order?: number | null;
    [k: string]: unknown;
  }[];
  groups: {
    id: string;
    kind: "module";
    children: string[];
  }[];
  moduleImports: {
    source: string;
    target: string;
    weight: number;
  }[];
}
