import { test, expect, request } from '@playwright/test';

test('viewer homepage loads and has cytoscape container', async ({ page, baseURL }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CodeViz \(TS\)/);
  const cy = page.locator('#cy');
  await expect(cy).toBeVisible();
  // Wait for cytoscape to initialize by checking for a canvas inside the container
  await expect(page.locator('#cy canvas').first()).toBeVisible({ timeout: 10000 });
  // Toolbar should be visible
  await expect(page.locator('.toolbar')).toBeVisible();
  await expect(page.locator('#modeSelect')).toBeVisible();
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


