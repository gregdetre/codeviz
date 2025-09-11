import type { Core } from "cytoscape";

export type HybridOpts = { hybridMode?: 'sequential' | 'constrained' };

export async function applyLayout(cy: Core, name: 'elk' | 'fcose' | 'hybrid', opts?: HybridOpts): Promise<void> {
  if (name === 'elk') {
    await cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN', 'elk.edgeRouting': 'ORTHOGONAL' } } as any).run();
    return;
  }
  if (name === 'fcose') {
    await cy.layout({ name: 'fcose', animate: true } as any).run();
    return;
  }
  // hybrid sequential
  await cy.layout({ name: 'elk', animate: false, nodeDimensionsIncludeLabels: true, elk: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' } } as any).run();
  if ((opts?.hybridMode ?? 'sequential') === 'constrained') {
    const layers = extractLayersFromPositions(cy.nodes());
    await cy.layout({ name: 'fcose', animate: true, randomize: false, alignmentConstraint: { horizontal: layers } } as any).run();
    return;
  }
  await cy.layout({ name: 'fcose', animate: true, randomize: false, numIter: 1000 } as any).run();
}

export function extractLayersFromPositions(nodes: any): string[][] {
  const buckets = new Map<number, string[]>();
  nodes.forEach((n: any) => {
    const y = Math.round(n.position('y') / 100);
    const arr = buckets.get(y) ?? [];
    arr.push(n.id());
    buckets.set(y, arr);
  });
  return Array.from(buckets.values()).filter(a => a.length > 1);
}


