import { test, expect } from '@playwright/test';

test('aggregates only around collapsed groups', async ({ page }) => {
  await page.goto('/');
  // Wait for Cytoscape canvas to appear
  await expect(page.locator('#cy canvas').first()).toBeVisible({ timeout: 10000 });

  // Helper to eval in page
  const evalCy = async <T>(fn: (...args: any[]) => T, ...args: any[]) => {
    return await page.evaluate(fn, ...args);
  };

  // Expand all nodes and edges; run targeted aggregator if present
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    // Expand edges first, then nodes
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    api.expandAll({ animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });

  // No aggregated edges when fully expanded
  let aggCount = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);
  expect(aggCount).toBe(0);

  // Collapse one module (first available)
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    const mod = cy.nodes('node[type = "module"]').first();
    if (mod && mod.length > 0) api.collapse(mod, { animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });

  // Aggregates should exist only where at least one endpoint is collapsed
  let invalidAgg = await evalCy(() => {
    const cy: any = (window as any).__cy;
    return cy.edges('.cy-expand-collapse-collapsed-edge').filter((e: any) =>
      !e.source().hasClass('cy-expand-collapse-collapsed-node') &&
      !e.target().hasClass('cy-expand-collapse-collapsed-node')
    ).length;
  });
  expect(invalidAgg).toBe(0);

  // Collapse a second module (if present)
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    const mods = cy.nodes('node[type = "module"]').filter((n: any) => !n.hasClass('cy-expand-collapse-collapsed-node'));
    if (mods.length > 1) api.collapse(mods[1], { animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });

  // Expand all again → no aggregates should remain
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    api.expandAll({ animate: false });
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  aggCount = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);
  expect(aggCount).toBe(0);
});


