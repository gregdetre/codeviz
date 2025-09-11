import type { Core } from "cytoscape";

export type HybridOpts = { hybridMode?: 'sequential' };

export type LayoutName = 'elk' | 'fcose' | 'elk-then-fcose';

export function normalizeLayoutName(name: string | null | undefined): LayoutName {
  const raw = (name ?? '').toString().trim().toLowerCase();
  if (raw === 'elk' || raw === 'fcose') return raw;
  if (raw === 'hybrid' || raw === 'elk-then-fcose' || raw === 'elk_then_fcose' || raw === 'elkthenfcose') return 'elk-then-fcose';
  return 'elk-then-fcose';
}

type SafeLayoutOpts = {
  animate?: boolean;
  elk?: { direction?: 'UP'|'DOWN'|'LEFT'|'RIGHT' } | Record<string, unknown>;
  fcose?: { animate?: boolean; randomize?: boolean; numIter?: number } | Record<string, unknown>;
} & Record<string, unknown>;

function clamp(n: number, min: number, max: number): number {
  if (!isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function sanitizeElkOptions(arg: any): Record<string, unknown> {
  const elk: Record<string, unknown> = {};
  if (!arg || typeof arg !== 'object') return elk;
  const dir = String((arg as any).direction ?? (arg as any)['elk.direction'] ?? '').toUpperCase();
  const allowedDir = new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']);
  if (allowedDir.has(dir)) elk['elk.direction'] = dir;
  const algo = String((arg as any).algorithm ?? (arg as any)['elk.algorithm'] ?? '').toLowerCase();
  if (algo === 'layered' || algo === 'mrtree' || algo === 'force') elk['elk.algorithm'] = algo;
  const edgeRouting = String((arg as any).edgeRouting ?? (arg as any)['elk.edgeRouting'] ?? '').toUpperCase();
  if (edgeRouting === 'ORTHOGONAL' || edgeRouting === 'POLYLINE' || edgeRouting === 'SPLINES') elk['elk.edgeRouting'] = edgeRouting;
  return elk;
}

function sanitizeFcoseOptions(arg: any): Record<string, unknown> {
  const fc: Record<string, unknown> = {};
  if (!arg || typeof arg !== 'object') return fc;
  if (typeof (arg as any).animate === 'boolean') fc.animate = (arg as any).animate;
  if (typeof (arg as any).randomize === 'boolean') fc.randomize = (arg as any).randomize;
  if (typeof (arg as any).numIter === 'number') fc.numIter = clamp((arg as any).numIter, 1, 5000);
  return fc;
}

export async function applyLayout(cy: Core, name: LayoutName | 'hybrid', opts?: SafeLayoutOpts | HybridOpts | any): Promise<void> {
  const layoutName = normalizeLayoutName(name as string);
  if (layoutName === 'elk') {
    const elkOpts = sanitizeElkOptions((opts as any)?.elk);
    const animate = typeof (opts as any)?.animate === 'boolean' ? (opts as any).animate : false;
    await cy.layout({ name: 'elk', animate, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': elkOpts['elk.algorithm'] ?? 'layered', 'elk.direction': elkOpts['elk.direction'] ?? 'DOWN', ...(elkOpts['elk.edgeRouting'] ? { 'elk.edgeRouting': elkOpts['elk.edgeRouting'] } : {}) } } as any).run();
    return;
  }
  if (layoutName === 'fcose') {
    const fc = sanitizeFcoseOptions((opts as any)?.fcose ?? opts);
    await cy.layout({ name: 'fcose', animate: (fc.animate as boolean) ?? true, randomize: (fc.randomize as boolean) ?? false, numIter: (fc.numIter as number) ?? 1000 } as any).run();
    return;
  }
  // hybrid sequential: ELK then fCoSE, allowing limited overrides
  const elkOpts = sanitizeElkOptions((opts as any)?.elk);
  const fc = sanitizeFcoseOptions((opts as any)?.fcose);
  await cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': elkOpts['elk.algorithm'] ?? 'layered', 'elk.direction': elkOpts['elk.direction'] ?? 'DOWN' } } as any).run();
  await cy.layout({ name: 'fcose', animate: (fc.animate as boolean) ?? true, randomize: (fc.randomize as boolean) ?? false, numIter: (fc.numIter as number) ?? 1000 } as any).run();
}

// Note: constrained hybrid mode removed


