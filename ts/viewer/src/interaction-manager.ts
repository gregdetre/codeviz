import type { Core, NodeSingular, Collection } from "cytoscape";
import type { Graph } from "./graph-types.js";
import { openFileInEditor } from "./file-opener.js";

export type FilterMode = 'hide' | 'fade';

export function InteractionManager(cy: Core, graph: Graph) {
  let filterMode: FilterMode = 'fade';

  function setFilterMode(mode: FilterMode) {
    filterMode = mode;
  }

  function clearFocus() {
    cy.elements().removeClass('faded');
    cy.elements().style('display', 'element');
  }

  function focus(nodeId?: string) {
    if (!nodeId) {
      clearFocus();
      return;
    }
    const node = cy.getElementById(nodeId);
    if (!node || node.empty()) return;
    // Reset any previous fading/hiding first to avoid residual faded state on the focused node
    cy.elements().removeClass('faded').style('display', 'element');
    // Explicitly compute nodes + their connected edges to keep visible
    const focusNodes = node.closedNeighborhood().nodes().union(node);
    const focusEdges = focusNodes.connectedEdges();
    const keep = focusNodes.union(focusEdges);
    const rest = cy.elements().difference(keep);
    if (filterMode === 'fade') {
      rest.addClass('faded');
      keep.removeClass('faded');
    } else {
      rest.style('display', 'none');
      keep.style('display', 'element');
    }
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


