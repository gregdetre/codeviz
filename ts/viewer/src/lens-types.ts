export type LensPosition = { id: string; x: number; y: number };

export type LensViewerEnvelope = {
  groupFolders: boolean;
  filterMode: "fade" | "hide";
  tagFilter?: string[]; // normalized keys
  viewport: { zoom: number; pan: { x: number; y: number } };
};

export type Lens = {
  version: 1;
  schemaVersion: "1.0.0";
  name?: string;
  viewer: LensViewerEnvelope;
  positions?: LensPosition[];
  collapsedIds?: string[];
  commands?: Array<{ q?: string; op?: string; arg?: any; ops?: Array<[string, any?]> }>;
  generatedAt?: string;
  modifiedAt?: string;
};


