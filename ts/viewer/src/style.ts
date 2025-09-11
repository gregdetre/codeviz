import type { Stylesheet } from "cytoscape";
import { Tokens, defaultTokensLight, hashHslForModule, hslToCss } from "./style-tokens.js";

export function generateStyles(tokens: Tokens = defaultTokensLight, opts?: { dark?: boolean }): Stylesheet[] {
  const t = tokens;
  return [
    { selector: 'node', style: { 'label': 'data(displayLabel)', 'text-valign': 'center', 'text-halign': 'center', 'font-size': t.sizes.font, 'background-color': '#fff', 'border-color': '#ddd', 'border-width': 1, 'text-wrap': 'wrap', 'text-max-width': 120 } },
    { selector: '$node > node', style: { 'background-opacity': 0.2, 'padding': t.sizes.compoundPadding, 'shape': 'round-rectangle' } },
    { selector: 'node[type = "function"]', style: { 'background-color': t.colors.node.function } },
    { selector: 'node[type = "class"]', style: { 'background-color': t.colors.node.class } },
    { selector: 'node[type = "variable"]', style: { 'background-color': t.colors.node.variable } },
    { selector: 'node[type = "module"]', style: { 'background-color': '#fafafa', 'border-width': 2, 'text-valign': 'bottom', 'text-halign': 'right', 'text-margin-x': 8, 'text-margin-y': 6, 'text-wrap': 'wrap', 'text-max-width': 220, 'text-background-opacity': 0.75, 'text-background-color': '#ffffff', 'text-background-shape': 'round-rectangle', 'font-size': t.sizes.font + 1 } },
    { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'width': 2, 'line-color': '#888', 'target-arrow-color': '#888' } },
    { selector: 'edge[type = "calls"]', style: { 'line-color': t.colors.edges.calls, 'target-arrow-color': t.colors.edges.calls } },
    { selector: 'edge[type = "imports"]', style: { 'line-color': t.colors.edges.imports, 'target-arrow-color': t.colors.edges.imports, 'line-style': 'dashed' } },
    { selector: 'edge[type = "runtime"]', style: { 'line-color': t.colors.edges.runtime, 'target-arrow-color': t.colors.edges.runtime, 'line-style': 'dotted' } },
    { selector: 'edge[type = "moduleImport"]', style: { 'line-color': t.colors.edges.imports, 'target-arrow-color': t.colors.edges.imports, 'line-style': 'dashed', 'width': 'mapData(weight, 1, 10, 1, 4)' } },
    { selector: '.faded', style: { 'opacity': t.colors.states.fadedOpacity, 'text-opacity': 0.4 } },
    // Module color tints for children labels via data(module)
    { selector: 'node[type != "module"]', style: { 'text-outline-width': 2, 'text-outline-color': '#fff' } }
  ];
}

export function applyModuleColorTint(cy: any) {
  cy.nodes('node[type != "module"]').forEach((n: any) => {
    const moduleName = n.data('module');
    if (!moduleName) return;
    const hsl = hashHslForModule(String(moduleName));
    const color = hslToCss(hsl);
    n.style('background-color', color);
  });
}


