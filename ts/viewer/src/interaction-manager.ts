import type { Core, NodeSingular, Collection } from "cytoscape";

export type FilterMode = 'hide' | 'fade';

export function InteractionManager(cy: Core) {
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

  function installBasics() {
    cy.on('tap', 'node', (evt) => {
      focus(evt.target.id());
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) clearFocus();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') clearFocus();
    });
  }

  return { setFilterMode, focus, clearFocus, installBasics };
}


