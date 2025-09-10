import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import expandCollapse from 'cytoscape-expand-collapse';
import popper from 'cytoscape-popper';
import contextMenus from 'cytoscape-context-menus';
import cola from 'cytoscape-cola';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'cytoscape-context-menus/cytoscape-context-menus.css';
// expand-collapse does not ship a CSS file; it draws cues via canvas/overlays

import { validateGraph } from './schema';
import type { GdvizCodebaseGraph } from './types';

// Register extensions
cytoscape.use(fcose);
cytoscape.use(expandCollapse);
cytoscape.use(popper);
cytoscape.use(contextMenus);
cytoscape.use(cola);

type GraphData = GdvizCodebaseGraph;

let statusHideTimer: number | undefined;
function status(msg: string, isError: boolean = false) {
  try { console.log('[gdviz-cyto-enhanced]', msg); } catch {}
  try {
    const s = document.getElementById('status') as HTMLElement | null;
    if (s) {
      s.textContent = msg;
      s.style.display = 'block';
      s.style.background = isError ? 'rgba(220,53,69,0.9)' : 'rgba(0,0,0,0.8)';
      if (statusHideTimer) window.clearTimeout(statusHideTimer);
      if (!isError) {
        statusHideTimer = window.setTimeout(() => {
          s.style.display = 'none';
        }, 2500);
      }
    }
  } catch {}
}

function createSampleGraph(): GraphData {
  const nodes: GraphData['nodes'] = [
    { id: 'viewer:init', label: 'init()', file: 'viewer/ui.ts', module: 'viewer', kind: 'function', signature: 'init(): void', doc: 'Initialize the enhanced viewer' },
    { id: 'viewer:render', label: 'render()', file: 'viewer/ui.ts', module: 'viewer', kind: 'function', signature: 'render(): void', doc: 'Render UI controls and graph' },
    { id: 'viewer:App', label: 'App', file: 'viewer/App.ts', module: 'viewer', kind: 'class', doc: 'Main UI component class' },
    { id: 'viewer:state', label: 'state', file: 'viewer/state.ts', module: 'viewer', kind: 'variable', doc: 'In-memory app state' },
    { id: 'extractor:parse', label: 'parse()', file: 'extractor/core.py', module: 'extractor', kind: 'function', signature: 'parse(path: str) -> AST', doc: 'Parse Python source into AST' },
    { id: 'extractor:build_graph', label: 'build_graph()', file: 'extractor/graph.py', module: 'extractor', kind: 'function', signature: 'build_graph(ast) -> Graph', doc: 'Build code graph from AST' },
  ];

  const edges: GraphData['edges'] = [
    { source: 'viewer:init', target: 'viewer:render', kind: 'calls' },
    { source: 'viewer:init', target: 'extractor:parse', kind: 'calls' },
    { source: 'extractor:parse', target: 'extractor:build_graph', kind: 'calls' },
    { source: 'viewer:render', target: 'viewer:App', kind: 'runtime_call' },
  ];

  const groups: GraphData['groups'] = [
    { id: 'viewer', kind: 'module', children: nodes.filter(n => n.module === 'viewer').map(n => n.id) },
    { id: 'extractor', kind: 'module', children: nodes.filter(n => n.module === 'extractor').map(n => n.id) },
  ];

  const moduleImports: GraphData['moduleImports'] = [
    { source: 'viewer', target: 'extractor', weight: 3 },
  ];

  return {
    version: 1,
    schemaVersion: '1.0.0',
    defaultMode: 'default',
    nodes,
    edges,
    groups,
    moduleImports,
  };
}

async function loadGraph(): Promise<GraphData> {
  // Try multiple sources in order: bundled asset -> local static -> proxied backend
  async function tryFetch(url: string): Promise<GraphData | null> {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        status(`Loaded graph data from ${url}`);
        return data as GraphData;
      }
    } catch (e) {
      // ignore and fall through
    }
    return null;
  }

  // 1) Bundled demo asset (works standalone in dev/build)
  const bundledUrl = new URL('../out/codebase_graph.json', import.meta.url).href;
  let data = await tryFetch(bundledUrl);

  // 2) Direct static path when serving cyto dir
  if (!data) data = await tryFetch('/out/codebase_graph.json');

  // 3) Proxied backend path when running full CodeViz server
  if (!data) data = await tryFetch('/gdviz/out/codebase_graph.json');

  // 4) Final fallback: generate a small sample graph so the demo is always interactive
  if (!data) {
    status('Falling back to built-in sample graph');
    data = createSampleGraph();
  }

  // Dev validation (non-blocking warning)
  try {
    const v = await validateGraph(data);
    if (!v.ok) {
      console.warn('[gdviz-cyto-enhanced] schema validation errors:', v.errors.slice(0, 10));
    }
  } catch (e) {
    console.warn('[gdviz-cyto-enhanced] schema validation failed to run', e);
  }
  return data;
}

function hashColorForModule(moduleName: string): string {
  let hash = 0;
  for (let i = 0; i < moduleName.length; i++) {
    hash = (hash * 31 + moduleName.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const sat = 45 + (hash % 30);
  const light = 70;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

// Transform flat nodes into hierarchical structure for compound nodes
function createHierarchicalElements(data: GraphData): cytoscape.ElementDefinition[] {
  const elems: cytoscape.ElementDefinition[] = [];
  const modules = new Set<string>();
  const files = new Set<string>();
  
  // First pass: identify modules and files
  for (const n of data.nodes) {
    if (n.module) modules.add(n.module);
    if (n.file) files.add(n.file);
  }
  
  // Create module nodes (top level)
  for (const module of modules) {
    elems.push({
      data: {
        id: `module:${module}`,
        label: module,
        type: 'module',
        modColorHex: hashColorForModule(module)
      }
    });
  }
  
  // Create file nodes (children of modules)
  for (const file of files) {
    const moduleForFile = data.nodes.find(n => n.file === file)?.module;
    elems.push({
      data: {
        id: `file:${file}`,
        label: file.split('/').pop() || file,
        type: 'file',
        parent: moduleForFile ? `module:${moduleForFile}` : undefined,
        fullPath: file
      }
    });
  }
  
  // Create function/class/variable nodes (children of files)
  for (const n of data.nodes) {
    const modColorHex = hashColorForModule(n.module || '');
    const parent = n.file ? `file:${n.file}` : (n.module ? `module:${n.module}` : undefined);
    
    elems.push({
      data: {
        ...n,
        id: n.id,
        label: n.label || n.id,
        type: n.kind || 'function',
        parent: parent,
        modColorHex,
        // Add metadata for rich tooltips
        signature: (n as any).signature,
        complexity: (n as any).complexity || 'Unknown',
        description: (n as any).doc || (n as any).description
      }
    });
  }
  
  // Add edges
  const nodeIds = new Set(data.nodes.map(n => n.id));
  for (const e of data.edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    elems.push({
      data: {
        id: `${e.source}->${e.target}:${e.kind}:${e.order ?? ''}`.slice(0, 200),
        source: e.source,
        target: e.target,
        type: e.kind,
        order: e.order ?? undefined
      }
    });
  }
  
  return elems;
}

function createAdvancedStyle(): cytoscape.StylesheetJson {
  return [
    // Base node styles
    {
      selector: 'node',
      style: {
        'background-color': '#3498db',
        'label': 'data(label)',
        'font-size': '10px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#2c3e50',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        'overlay-padding': '4px'
      }
    },
    
    // Parent nodes (modules and files)
    {
      selector: 'node:parent',
      style: {
        'background-color': '#ecf0f1',
        'background-opacity': 0.8,
        'border-width': 2,
        'border-color': '#bdc3c7',
        'padding': 15,
        'compound-sizing-wrt-labels': 'include',
        'font-weight': 'bold'
      }
    },
    
    // Module level
    {
      selector: 'node[type = "module"]',
      style: {
        'background-color': '#e8f4fd',
        'border-color': '#3498db',
        'border-width': 3,
        'font-size': '12px',
        'color': '#2980b9'
      }
    },
    
    // File level
    {
      selector: 'node[type = "file"]',
      style: {
        'background-color': '#f8f9fa',
        'border-color': '#6c757d',
        'border-width': 2,
        'font-size': '11px',
        'color': '#495057'
      }
    },
    
    // Function nodes
    {
      selector: 'node[type = "function"]',
      style: {
        'background-color': '#2ecc71',
        'shape': 'round-rectangle',
        'width': '60px',
        'height': '30px',
        'font-size': '9px',
        'color': 'white'
      }
    },
    
    // Class nodes
    {
      selector: 'node[type = "class"]',
      style: {
        'background-color': '#e74c3c',
        'shape': 'round-rectangle',
        'width': '60px',
        'height': '30px',
        'font-size': '9px',
        'color': 'white'
      }
    },
    
    // Variable nodes
    {
      selector: 'node[type = "variable"]',
      style: {
        'background-color': '#f39c12',
        'shape': 'ellipse',
        'width': '50px',
        'height': '25px',
        'font-size': '8px',
        'color': 'white'
      }
    },
    
    // Module color override
    {
      selector: 'node[modColorHex]',
      style: {
        'background-color': 'data(modColorHex)'
      }
    },
    
    // State classes
    {
      selector: 'node.collapsed',
      style: {
        'background-color': '#f1c40f',
        'border-width': 3,
        'border-color': '#f39c12'
      }
    },
    
    {
      selector: 'node.selected',
      style: {
        'border-width': 4,
        'border-color': '#e91e63',
        'background-color': '#fce4ec'
      }
    },
    
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 3,
        'border-color': '#ff5722',
        'background-color': '#ffccbc'
      }
    },
    
    // Edge styles
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#95a5a6',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#95a5a6',
        'curve-style': 'bezier',
        'edge-distances': 'intersection'
      }
    },
    
    // Different edge types
    {
      selector: 'edge[type = "calls"]',
      style: {
        'line-color': '#3498db',
        'target-arrow-color': '#3498db',
        'width': 2
      }
    },
    
    {
      selector: 'edge[type = "uses"]',
      style: {
        'line-color': '#e74c3c',
        'target-arrow-color': '#e74c3c',
        'line-style': 'dashed',
        'width': 1.5
      }
    },
    
    {
      selector: 'edge[type = "imports"]',
      style: {
        'line-color': '#9b59b6',
        'target-arrow-color': '#9b59b6',
        'line-style': 'dotted',
        'width': 1
      }
    },
    
    // Build steps and other special edges
    {
      selector: 'edge[type = "build_step"]',
      style: {
        'line-color': '#2c3e50',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#2c3e50'
      }
    },
    
    {
      selector: 'edge[type = "bash_entry"]',
      style: {
        'line-color': '#f39c12',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#f39c12'
      }
    }
  ];
}

class EnhancedViewer {
  private cy: cytoscape.Core;
  private expandCollapseApi: any;
  private selectedNodes: cytoscape.Collection;
  private currentFilterMode: 'hide' | 'fade' | 'disable' = 'hide';
  private interactionMode: 'default' | 'select' = 'default';
  private focusMode = false;
  
  constructor(container: HTMLElement, data: GraphData) {
    // Initialize Cytoscape with hierarchical elements
    this.cy = cytoscape({
      container,
      elements: createHierarchicalElements(data),
      style: createAdvancedStyle(),
      layout: {
        name: 'fcose',
        animate: true,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
        uniformNodeDimensions: false,
        packComponents: true,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500
      }
    });
    
    this.selectedNodes = this.cy.collection();
    this.initializeExtensions();
    this.setupEventHandlers();
    this.initializeTooltips();
    
    status(`Ready • ${this.cy.nodes().length} nodes, ${this.cy.edges().length} edges`);
  }
  
  private initializeExtensions() {
    // Initialize expand-collapse
    this.expandCollapseApi = this.cy.expandCollapse({
      layoutBy: {
        name: 'fcose',
        animate: true,
        fit: false,
        padding: 10
      },
      fisheye: true,
      animate: true,
      undoable: false,
      cueEnabled: true,
      expandCollapseCuePosition: 'top-left',
      expandCollapseCueSize: 12
    });
    
    // Initialize context menu
    this.cy.contextMenus({
      menuItems: [
        {
          id: 'expand-collapse',
          content: (ele: any) => {
            if (ele.isParent()) {
              return this.expandCollapseApi.isCollapsible(ele) ? 'Collapse' : 'Expand';
            }
            return null;
          },
          selector: 'node:parent',
          onClickFunction: (event: any) => {
            const node = event.target;
            if (this.expandCollapseApi.isCollapsible(node)) {
              this.expandCollapseApi.collapse(node);
            } else {
              this.expandCollapseApi.expand(node);
            }
          }
        },
        {
          id: 'focus',
          content: 'Focus on This',
          selector: 'node',
          onClickFunction: (event: any) => {
            this.focusOnNode(event.target);
          }
        },
        {
          id: 'select',
          content: 'Select Node',
          selector: 'node',
          onClickFunction: (event: any) => {
            this.toggleNodeSelection(event.target);
          }
        },
        // Note: The context-menus plugin requires either submenu or onClickFunction. Avoid bare separators.
        {
          id: 'hide',
          content: 'Hide Node',
          selector: 'node',
          onClickFunction: (event: any) => {
            event.target.style('display', 'none');
            status(`Hidden ${event.target.data('label')}`);
          }
        }
      ],
      menuRadius: 100,
      fillColor: 'rgba(0, 0, 0, 0.75)',
      activeFillColor: 'rgba(92, 194, 237, 0.75)'
    });
  }
  
  private setupEventHandlers() {
    // Node click handling
    this.cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      
      if (this.interactionMode === 'select') {
        this.toggleNodeSelection(node);
      } else if (this.focusMode) {
        this.focusOnNode(node);
      } else {
        this.highlightNode(node);
      }
    });
    
    // Background click to clear
    this.cy.on('tap', (evt) => {
      if (evt.target === this.cy) {
        this.clearHighlights();
        this.clearSelections();
      }
    });
    
    // Hover effects
    this.cy.on('mouseover', 'node', (evt) => {
      if (!this.focusMode) {
        evt.target.addClass('highlighted');
      }
    });
    
    this.cy.on('mouseout', 'node', (evt) => {
      if (!this.focusMode) {
        evt.target.removeClass('highlighted');
      }
    });
  }
  
  private initializeTooltips() {
    this.cy.nodes().forEach((node) => {
      // Skip tooltips for parent nodes
      if (node.data('type') === 'module' || node.data('type') === 'file') return;
      
      const ref = node.popperRef();
      const tip = tippy(ref, {
        content: () => this.createTooltipContent(node),
        allowHTML: true,
        placement: 'top',
        hideOnClick: false,
        sticky: true,
        appendTo: document.body,
        interactive: true
      });
      
      node.data('tooltip', tip);
    });
  }

  public search(term: string) {
    const value = (term || '').toLowerCase().trim();
    if (!value) {
      this.cy.elements().style('display', 'element');
      this.clearHighlights();
      status('Search cleared');
      return;
    }
    const matches = this.cy.nodes().filter((n) => {
      const label = (n.data('label') || '').toLowerCase();
      const file = (n.data('fullPath') || n.data('file') || '').toLowerCase();
      return label.includes(value) || file.includes(value) || n.id().toLowerCase().includes(value);
    });
    this.cy.batch(() => {
      this.cy.elements().style('display', 'none');
      matches.style('display', 'element');
      matches.connectedEdges().style('display', 'element');
      matches.connectedEdges().connectedNodes().style('display', 'element');
    });
    status(`Search: ${matches.length} matches`);
  }
  
  private createTooltipContent(node: cytoscape.NodeSingular): string {
    const data = node.data();
    const inDegree = node.indegree();
    const outDegree = node.outdegree();
    
    return `
      <div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 12px; font-size: 12px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #2c3e50;">${data.label}</h3>
        <div style="margin-bottom: 8px;">
          <div style="margin-bottom: 2px; color: #6c757d;"><strong>Type:</strong> ${data.type}</div>
          ${data.signature ? `<div style="margin-bottom: 2px; color: #6c757d;"><strong>Signature:</strong> ${data.signature}</div>` : ''}
          ${data.complexity ? `<div style="margin-bottom: 2px; color: #6c757d;"><strong>Complexity:</strong> ${data.complexity}</div>` : ''}
          ${data.description ? `<div style="margin-bottom: 2px; color: #6c757d;"><strong>Description:</strong> ${data.description}</div>` : ''}
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">
          <h4 style="margin: 0 0 4px 0; font-size: 12px; color: #495057;">Connections</h4>
          <div>Incoming: ${inDegree}</div>
          <div>Outgoing: ${outDegree}</div>
        </div>
      </div>
    `;
  }
  
  private focusOnNode(node: cytoscape.NodeSingular) {
    const connectedNodes = node.neighborhood().nodes();
    const allConnected = connectedNodes.union(node);
    
    this.cy.nodes().style('opacity', 0.2);
    this.cy.edges().style('opacity', 0.1);
    
    allConnected.style('opacity', 1);
    node.connectedEdges().style('opacity', 0.8);
    
    status(`Focused on ${node.data('label')}`);
  }
  
  private highlightNode(node: cytoscape.NodeSingular) {
    this.clearHighlights();
    node.addClass('highlighted');
    node.neighborhood().addClass('highlighted');
  }
  
  private clearHighlights() {
    this.cy.elements().removeClass('highlighted');
    this.cy.nodes().style('opacity', 1);
    this.cy.edges().style('opacity', 1);
  }
  
  private toggleNodeSelection(node: cytoscape.NodeSingular) {
    if (this.selectedNodes.contains(node)) {
      this.selectedNodes = this.selectedNodes.difference(node);
      node.removeClass('selected');
    } else {
      this.selectedNodes = this.selectedNodes.union(node);
      node.addClass('selected');
    }
    status(`${this.selectedNodes.length} nodes selected`);
  }
  
  private clearSelections() {
    this.selectedNodes.removeClass('selected');
    this.selectedNodes = this.cy.collection();
    status('Selection cleared');
  }
  
  // Public API methods
  public expandAll() {
    this.expandCollapseApi.expandAll();
    status('Expanded all groups');
  }
  
  public collapseAll() {
    this.expandCollapseApi.collapseAll();
    status('Collapsed all groups');
  }
  
  public applyLayout(layoutName: string, edgeLength: number = 150) {
    const layoutOptions: { [key: string]: any } = {
      'fcose': {
        name: 'fcose',
        animate: true,
        fit: true,
        padding: 30,
        idealEdgeLength: edgeLength,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2000
      },
      'cola': {
        name: 'cola',
        animate: true,
        fit: true,
        edgeLength: edgeLength,
        nodeSpacing: 10,
        flow: { axis: 'y', minSeparation: 30 }
      },
      'circle': {
        name: 'circle',
        animate: true,
        fit: true,
        radius: edgeLength * 2
      },
      'grid': {
        name: 'grid',
        animate: true,
        fit: true
      }
    };
    
    this.cy.layout(layoutOptions[layoutName] || layoutOptions['fcose']).run();
    status(`Applied ${layoutName} layout`);
  }
  
  public filterByType(showFunctions: boolean, showClasses: boolean, showVariables: boolean) {
    this.cy.batch(() => {
      this.cy.nodes('[type = "function"]').forEach((node) => {
        this.setNodeVisibility(node, showFunctions);
      });
      
      this.cy.nodes('[type = "class"]').forEach((node) => {
        this.setNodeVisibility(node, showClasses);
      });
      
      this.cy.nodes('[type = "variable"]').forEach((node) => {
        this.setNodeVisibility(node, showVariables);
      });
    });
  }
  
  private setNodeVisibility(node: cytoscape.NodeSingular, visible: boolean) {
    if (this.currentFilterMode === 'hide') {
      node.style('display', visible ? 'element' : 'none');
    } else if (this.currentFilterMode === 'fade') {
      node.style('opacity', visible ? 1 : 0.2);
    } else if (this.currentFilterMode === 'disable') {
      node.style('events', visible ? 'yes' : 'no');
      node.style('opacity', visible ? 1 : 0.5);
    }
  }
  
  public setFilterMode(mode: 'hide' | 'fade' | 'disable') {
    this.currentFilterMode = mode;
    status(`Filter mode: ${mode}`);
  }
  
  public resetFilters() {
    this.cy.nodes().style({
      'display': 'element',
      'opacity': 1,
      'events': 'yes'
    });
    this.clearHighlights();
    status('Filters reset');
  }
  
  public setInteractionMode(mode: 'default' | 'select') {
    this.interactionMode = mode;
    if (mode === 'select') {
      status('Multi-select mode active');
    } else {
      status('Default interaction mode');
      this.clearSelections();
    }
  }
  
  public setFocusMode(enabled: boolean) {
    this.focusMode = enabled;
    if (!enabled) {
      this.clearHighlights();
    }
  }
  
  public fit() {
    this.cy.fit();
    status('Fitted graph to screen');
  }
  
  public center() {
    this.cy.center();
    status('Centered graph');
  }
  
  public getSelectedCount(): number {
    return this.selectedNodes.length;
  }

  public setDarkMode(enabled: boolean) {
    const body = document.body;
    if (enabled) {
      body.classList.add('dark');
      this.cy.style()
        .selector('node')
        .style({ 'color': '#e9ecef' })
        .selector('edge')
        .style({ 'line-color': '#6c757d', 'target-arrow-color': '#6c757d' })
        .update();
    } else {
      body.classList.remove('dark');
      this.cy.style()
        .selector('node')
        .style({ 'color': '#2c3e50' })
        .selector('edge')
        .style({ 'line-color': '#95a5a6', 'target-arrow-color': '#95a5a6' })
        .update();
    }
  }

  public exportPNG() {
    const dataUrl = this.cy.png({ scale: 2, full: true, bg: '#ffffff' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'codeviz-graph.png';
    link.click();
  }
}

// Enhanced main function
async function main() {
  const container = document.getElementById('app');
  if (!container) throw new Error('#app not found');
  
  try {
    const data = await loadGraph();
    const viewer = new EnhancedViewer(container, data);
    
    // Make viewer available globally for control panel
    (window as any).enhancedViewer = viewer;
    
    // Initialize control panel if it exists
    initializeControlPanel(viewer);
    
  } catch (error) {
    console.error('Failed to initialize enhanced viewer:', error);
    status('Failed to load graph data');
  }
}

function initializeControlPanel(viewer: EnhancedViewer) {
  // Look for control elements in the existing interface
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => viewer.expandAll());
  }
  
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => viewer.collapseAll());
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (evt) => {
    if (evt.target && (evt.target as HTMLElement).tagName === 'INPUT') return;
    
    switch (evt.key) {
      case 'Escape':
        viewer.resetFilters();
        break;
      case 'f':
        if (evt.ctrlKey) {
          evt.preventDefault();
          viewer.fit();
        }
        break;
      case 'c':
        if (evt.ctrlKey) {
          evt.preventDefault();
          viewer.center();
        }
        break;
      case '1':
        if (evt.ctrlKey) {
          evt.preventDefault();
          viewer.applyLayout('fcose');
        }
        break;
      case '2':
        if (evt.ctrlKey) {
          evt.preventDefault();
          viewer.applyLayout('cola');
        }
        break;
      case '3':
        if (evt.ctrlKey) {
          evt.preventDefault();
          viewer.applyLayout('circle');
        }
        break;
    }
  });
}

main().catch((e) => {
  console.error(e);
  status('Error loading enhanced viewer');
});

// Wire up global helpers for the control panel declared in HTML
(window as any).onSearchChanged = (value: string) => {
  if ((window as any).enhancedViewer) {
    (window as any).enhancedViewer.search(value);
  }
};

(window as any).setDarkMode = (enabled: boolean) => {
  if ((window as any).enhancedViewer) {
    (window as any).enhancedViewer.setDarkMode(enabled);
  }
};