import { test, expect, request } from '@playwright/test';

test('viewer homepage loads and has cytoscape container', async ({ page, baseURL }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CodeViz \(TS\)/);
  const cy = page.locator('#cy');
  await expect(cy).toBeVisible();
  // Wait for Cytoscape to initialize: canvas attached and graph has nodes
  await page.waitForSelector('#cy canvas', { state: 'attached', timeout: 10000 });
  await page.waitForFunction(() => {
    const w: any = window as any;
    try { return !!w.__cy && typeof w.__cy.nodes === 'function' && w.__cy.nodes().length > 0; } catch { return false; }
  }, { timeout: 10000 });
  // Toolbar should be visible
  await expect(page.locator('.toolbar')).toBeVisible();
});

test('graph JSON endpoint returns valid schema-ish structure', async ({ baseURL }) => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${baseURL}/out/codebase_graph.json`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json).toHaveProperty('version');
  expect(Array.isArray(json.nodes)).toBeTruthy();
  expect(Array.isArray(json.edges)).toBeTruthy();
  expect(Array.isArray(json.groups)).toBeTruthy();
});


