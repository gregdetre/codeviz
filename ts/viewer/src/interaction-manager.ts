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
    const neighborhood = node.closedNeighborhood();
    const rest = cy.elements().difference(neighborhood);
    if (filterMode === 'fade') {
      rest.addClass('faded');
      neighborhood.removeClass('faded');
    } else {
      rest.style('display', 'none');
      neighborhood.style('display', 'element');
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


