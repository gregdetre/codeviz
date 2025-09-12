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
    // Preflight edges first, then expand nodes
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    api.expandAll({ animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  aggCount = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);
  expect(aggCount).toBe(0);
});

test('context menu toggle parity with double-click', async ({ page }) => {
  await page.goto('/');
  // Wait for Cytoscape to initialize: canvas attached and graph has nodes
  await page.waitForSelector('#cy canvas', { state: 'attached', timeout: 10000 });
  await page.waitForFunction(() => {
    const w: any = window as any;
    try { return !!w.__cy && typeof w.__cy.nodes === 'function' && w.__cy.nodes().length > 0; } catch { return false; }
  }, { timeout: 10000 });
  const evalCy = async <T>(fn: (...args: any[]) => T, ...args: any[]) => page.evaluate(fn, ...args);

  // Start fully expanded and no aggregates
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    api.expandAll({ animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  let aggCount = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);
  expect(aggCount).toBe(0);

  // Collapse first module via double-click path (simulate by calling same logic)
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    const mod = cy.nodes('node[type = "module"]').first();
    if (mod && mod.length > 0) api.collapse(mod, { animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  const aggAfterDoubleClick = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);

  // Expand all again
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    api.expandAll({ animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });

  // Collapse first module via context-menu-equivalent path (same underlying calls now)
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    const mod = cy.nodes('node[type = "module"]').first();
    // Context menu now does preflight + collapse + reaggregate; emulate same
    api.collapse(mod, { animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  const aggAfterContext = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);

  expect(aggAfterContext).toBe(aggAfterDoubleClick);
});

test('mixed state transitions maintain boundary rules', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#cy canvas').first()).toBeVisible({ timeout: 10000 });
  const evalCy = async <T>(fn: (...args: any[]) => T, ...args: any[]) => page.evaluate(fn, ...args);

  // Start clean
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    api.expandAll({ animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });

  // Collapse A (first module)
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    const a = cy.nodes('node[type = "module"]').first();
    if (a && a.length > 0) api.collapse(a, { animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });

  // Verify all aggregates touch at least one collapsed endpoint
  let invalidAgg = await evalCy(() => {
    const cy: any = (window as any).__cy;
    return cy.edges('.cy-expand-collapse-collapsed-edge').filter((e: any) =>
      !e.source().hasClass('cy-expand-collapse-collapsed-node') &&
      !e.target().hasClass('cy-expand-collapse-collapsed-node')
    ).length;
  });
  expect(invalidAgg).toBe(0);

  // Collapse B (second module if exists)
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    const mods = cy.nodes('node[type = "module"]').filter((n: any) => !n.hasClass('cy-expand-collapse-collapsed-node'));
    if (mods.length > 0) api.collapse(mods[0], { animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  invalidAgg = await evalCy(() => {
    const cy: any = (window as any).__cy;
    return cy.edges('.cy-expand-collapse-collapsed-edge').filter((e: any) =>
      !e.source().hasClass('cy-expand-collapse-collapsed-node') &&
      !e.target().hasClass('cy-expand-collapse-collapsed-node')
    ).length;
  });
  expect(invalidAgg).toBe(0);

  // Expand all → aggregates should be zero
  await evalCy(() => {
    const cy: any = (window as any).__cy;
    const api = cy.expandCollapse('get');
    if (typeof api.expandAllEdges === 'function') api.expandAllEdges();
    api.expandAll({ animate: false });
    (window as any).__cv?.reaggregateCollapsedEdges?.();
  });
  const aggCount = await evalCy(() => (window as any).__cy.edges('.cy-expand-collapse-collapsed-edge').length);
  expect(aggCount).toBe(0);
});


