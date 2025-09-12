import type { StylesheetStyle } from "cytoscape";
import { Tokens, defaultTokensLight, hashHslForModule, hslToCss } from "./style-tokens.js";

export function generateStyles(tokens: Tokens = defaultTokensLight, opts?: { dark?: boolean, highlight?: {
  colors?: { focus?: string; incoming?: string; outgoing?: string; moduleOutline?: string };
  opacity?: { fadedNodes?: number; fadedText?: number; secondDegreeNodes?: number; secondDegreeEdges?: number };
  widths?: { edge?: number; edgeHighlighted?: number; nodeBorder?: number; nodeBorderHighlighted?: number };
} }): StylesheetStyle[] {
  const t = tokens;
  const h = opts?.highlight || {} as any;
  const colors = Object.assign({ focus: '#0ea5e9', incoming: '#ef4444', outgoing: '#10b981', moduleOutline: '#0ea5e9' }, h.colors || {});
  const opac = Object.assign({ fadedNodes: t.colors.states.fadedOpacity ?? 0.15, fadedText: 0.4, secondDegreeNodes: 0.5, secondDegreeEdges: 0.6 }, h.opacity || {});
  const widths = Object.assign({ edge: 2, edgeHighlighted: 3, nodeBorder: 1, nodeBorderHighlighted: 3 }, h.widths || {});
  return [
    { selector: 'node', style: { 'label': 'data(displayLabel)', 'text-valign': 'center', 'text-halign': 'center', 'font-size': t.sizes.font, 'background-color': '#fff', 'border-color': '#ddd', 'border-width': widths.nodeBorder, 'text-wrap': 'wrap', 'text-max-width': 120 } },
    { selector: '$node > node', style: { 'background-opacity': 0.2, 'padding': t.sizes.compoundPadding, 'shape': 'round-rectangle' } },
    { selector: 'node[type = "function"]', style: { 'background-color': t.colors.node.function } },
    { selector: 'node[type = "class"]', style: { 'background-color': t.colors.node.class } },
    { selector: 'node[type = "variable"]', style: { 'background-color': t.colors.node.variable } },
    { selector: 'node[type = "module"]', style: { 'background-color': '#fafafa', 'border-width': 2, 'text-valign': 'bottom', 'text-halign': 'right', 'text-margin-x': -8, 'text-margin-y': -6, 'text-wrap': 'wrap', 'text-max-width': 220, 'text-background-opacity': 0.75, 'text-background-color': '#ffffff', 'text-background-shape': 'round-rectangle', 'font-size': t.sizes.font + 1 } },
    { selector: 'node[type = "folder"]', style: { 'background-color': '#f3f4f6', 'border-width': 2, 'text-valign': 'bottom', 'text-halign': 'right', 'text-margin-x': -8, 'text-margin-y': -6, 'text-wrap': 'wrap', 'text-max-width': 240, 'font-weight': 'bold', 'font-size': t.sizes.font } },
    { selector: 'edge', style: { 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'width': widths.edge, 'line-color': '#888', 'target-arrow-color': '#888' } },
    { selector: 'edge[type = "calls"]', style: { 'line-color': t.colors.edges.calls, 'target-arrow-color': t.colors.edges.calls } },
    { selector: 'edge[type = "imports"]', style: { 'line-color': t.colors.edges.imports, 'target-arrow-color': t.colors.edges.imports, 'line-style': 'dashed' } },
    { selector: 'edge[type = "runtime"]', style: { 'line-color': t.colors.edges.runtime, 'target-arrow-color': t.colors.edges.runtime, 'line-style': 'dotted' } },
    { selector: 'edge[type = "moduleImport"]', style: { 'line-color': t.colors.edges.imports, 'target-arrow-color': t.colors.edges.imports, 'line-style': 'dashed', 'width': 'mapData(weight, 1, 10, 1, 4)' } },
    // Aggregated edges created by expand-collapse plugin
    { selector: 'edge.cy-expand-collapse-collapsed-edge', style: {
      'line-style': 'dashed',
      'opacity': 0.9,
      'text-opacity': 0.7,
      'label': (e: any) => {
        try { const n = (e.data('collapsedEdges')?.length ?? 0); return n > 1 ? `(${n})` : ''; } catch { return ''; }
      },
      'font-size': t.sizes.font - 1,
      'text-background-opacity': 0.65,
      'text-background-color': '#ffffff',
      'text-background-shape': 'round-rectangle',
      'width': (edge: any) => {
        try { const n = Math.max(1, Number(edge.data('collapsedEdges')?.length ?? 1)); return 2 + Math.log2(n); } catch { return 2; }
      }
    } },
    // Directional highlighting styles
    { selector: '.focus', style: { 'border-width': widths.nodeBorderHighlighted, 'border-color': colors.focus, 'border-opacity': 0.95 } as any },
    { selector: '.incoming-node', style: { 'border-width': widths.nodeBorderHighlighted, 'border-color': colors.incoming } },
    { selector: '.outgoing-node', style: { 'border-width': widths.nodeBorderHighlighted, 'border-color': colors.outgoing } },
    { selector: 'edge.incoming-edge', style: { 'line-color': colors.incoming, 'target-arrow-color': colors.incoming, 'width': widths.edgeHighlighted } },
    { selector: 'edge.outgoing-edge', style: { 'line-color': colors.outgoing, 'target-arrow-color': colors.outgoing, 'width': widths.edgeHighlighted } },
    { selector: 'edge.second-degree', style: { 'opacity': opac.secondDegreeEdges } },
    { selector: 'node.second-degree', style: { 'opacity': opac.secondDegreeNodes } },
    { selector: 'node.module-highlight', style: { 'border-color': colors.moduleOutline, 'border-width': 3 } },
    // Fading
    { selector: '.faded', style: { 'opacity': opac.fadedNodes, 'text-opacity': opac.fadedText } },
    // Legacy highlighted class retained for compat
    { selector: '.highlighted', style: { 'border-width': 3, 'border-color': '#ff9800', 'border-opacity': 0.9 } },
    // Module color tints for children labels via data(module)
    { selector: 'node', style: { 'text-outline-width': 2, 'text-outline-color': '#fff' } }
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

// Apply background colors to group compounds (folders and files/modules), darkening with nesting depth
export function applyGroupBackgroundColors(cy: any, tokens: Tokens = defaultTokensLight) {
  function darkenByDepth(base: { h: number; s: number; l: number }, depth: number) {
    const step = 4; // lightness delta per level
    const newL = Math.max(60, Math.min(96, base.l - Math.max(0, depth - 1) * step));
    return { h: base.h, s: base.s, l: newL };
  }
  // Folders
  cy.nodes('node[type = "folder"]').forEach((n: any) => {
    const base = tokens.colors.node.folderBg;
    const depth = Number(n.data('depth') || 1);
    const color = hslToCss(darkenByDepth(base, depth));
    n.style('background-color', color);
    n.style('background-opacity', 0.35);
  });
  // Modules (files)
  cy.nodes('node[type = "module"]').forEach((n: any) => {
    const base = tokens.colors.node.moduleBg;
    // Depth derived from folder ancestors; at least 1
    const folderDepth = n.ancestors('node[type = "folder"]').length || 0;
    const color = hslToCss(darkenByDepth(base, folderDepth + 1));
    n.style('background-color', color);
    n.style('background-opacity', 0.3);
  });
}


