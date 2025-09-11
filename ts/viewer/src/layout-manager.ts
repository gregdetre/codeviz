import type { Core } from "cytoscape";

export type HybridOpts = { hybridMode?: 'sequential' };

export type LayoutName = 'elk' | 'fcose' | 'elk-then-fcose';

export function normalizeLayoutName(name: string | null | undefined): LayoutName {
  const raw = (name ?? '').toString().trim().toLowerCase();
  if (raw === 'elk' || raw === 'fcose') return raw;
  if (raw === 'hybrid' || raw === 'elk-then-fcose' || raw === 'elk_then_fcose' || raw === 'elkthenfcose') return 'elk-then-fcose';
  return 'elk-then-fcose';
}

export async function applyLayout(cy: Core, name: LayoutName | 'hybrid', opts?: HybridOpts): Promise<void> {
  const layoutName = normalizeLayoutName(name as string);
  if (layoutName === 'elk') {
    await cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.edgeRouting': 'ORTHOGONAL' } } as any).run();
    return;
  }
  if (layoutName === 'fcose') {
    await cy.layout({ name: 'fcose', animate: true } as any).run();
    return;
  }
  // hybrid sequential
  await cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' } } as any).run();
  await cy.layout({ name: 'fcose', animate: true, randomize: false, numIter: 1000 } as any).run();
}

// Note: constrained hybrid mode removed


