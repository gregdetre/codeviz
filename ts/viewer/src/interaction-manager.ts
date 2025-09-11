import type { Core, NodeSingular, Collection } from "cytoscape";
import type { Graph, ViewerConfig } from "./graph-types.js";
import { openFileInEditor } from "./file-opener.js";

export type FilterMode = 'hide' | 'fade';

export function InteractionManager(cy: Core, graph: Graph, vcfg?: ViewerConfig) {
  let filterMode: FilterMode = 'fade';
  const highlight = vcfg?.highlight || {} as any;
  const steps: number = Math.max(1, Number(highlight?.steps ?? 1));
  const hideNonHighlightedEdges: boolean = Boolean(highlight?.hideNonHighlightedEdges ?? true);

  function setFilterMode(mode: FilterMode) {
    filterMode = mode;
  }

  function clearFocus() {
    cy.batch(() => {
      cy.elements().removeClass('faded');
      cy.elements().removeClass('focus incoming-node outgoing-node second-degree module-highlight');
      cy.edges().removeClass('incoming-edge outgoing-edge second-degree');
      cy.elements().style('display', 'element');
    });
  }

  function focus(nodeId?: string) {
    if (!nodeId) {
      clearFocus();
      return;
    }
    const node = cy.getElementById(nodeId);
    if (!node || node.empty()) return;
    cy.batch(() => {
      // Clear previous state
      cy.elements().removeClass('faded focus incoming-node outgoing-node second-degree module-highlight');
      cy.edges().removeClass('incoming-edge outgoing-edge second-degree');
      cy.elements().style('display', 'element');

      // First-degree
      const E_out = node.outgoers('edge');
      const N_out = E_out.targets();
      const E_in = node.incomers('edge');
      const N_in = E_in.sources();
      const E_self = node.connectedEdges().filter(e => e.source().id() === node.id() && e.target().id() === node.id());

      // Second-degree if enabled: neighbors of neighbors (excluding first-degree and self)
      let N2 = cy.collection();
      let E2 = cy.collection();
      if (steps >= 2) {
        const N1 = N_out.union(N_in);
        const N2cand = N1.outgoers('node').union(N1.incomers('node'));
        N2 = N2cand.difference(N1.union(node));
        E2 = N2.connectedEdges().difference(E_out.union(E_in).union(E_self));
      }

      // Modules containing highlighted nodes
      const modules = node.union(N_in).union(N_out).union(N2).parents('node[type = "module"]');

      // Apply classes
      node.addClass('focus');
      N_out.addClass('outgoing-node');
      N_in.addClass('incoming-node');
      E_out.addClass('outgoing-edge');
      E_in.addClass('incoming-edge');
      E_self.addClass('outgoing-edge');
      if (steps >= 2) {
        N2.addClass('second-degree');
        E2.addClass('second-degree');
      }
      modules.addClass('module-highlight');

      const keep = node.union(N_in).union(N_out).union(E_in).union(E_out).union(E_self).union(N2).union(E2).union(modules);
      const rest = cy.elements().difference(keep);

      if (hideNonHighlightedEdges) {
        rest.edges().style('display', 'none');
      }

      if (filterMode === 'fade') {
        rest.nodes().addClass('faded');
        keep.removeClass('faded');
      } else {
        rest.nodes().style('display', 'none');
        keep.nodes().style('display', 'element');
      }
    });
  }

  function handleNodeClick(evt: any) {
    const nodeId = evt.target.id();
    
    // Check for Cmd+click (Mac) or Ctrl+click (Windows/Linux) for file opening
    if (evt.originalEvent && (evt.originalEvent.metaKey || evt.originalEvent.ctrlKey)) {
      // Find the node data from the graph
      const nodeData = graph.nodes.find(n => n.id === nodeId);
      if (nodeData && nodeData.file && nodeData.line) {
        openFileInEditor(nodeData.file, nodeData.line);
        return; // Don't focus when opening file
      }
    }
    
    // Normal click behavior - focus on the node
    focus(nodeId);
  }

  function installBasics() {
    cy.on('tap', 'node', handleNodeClick);
    cy.on('tap', (evt) => {
      if (evt.target === cy) clearFocus();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') clearFocus();
    });
  }

  return { setFilterMode, focus, clearFocus, installBasics };
}


