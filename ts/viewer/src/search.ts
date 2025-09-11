import type { Core, Collection } from "cytoscape";

export function search(cy: Core, term: string, mode: 'hide'|'fade' = 'fade'): { matches: Collection } {
  const q = term.trim().toLowerCase();
  if (!q) {
    cy.elements().removeClass('faded').style('display', 'element');
    return { matches: cy.collection() };
  }
  const matches = cy.nodes().filter(n => {
    const label = (n.data('label') || '').toLowerCase();
    const moduleName = (n.data('module') || '').toLowerCase();
    const file = (n.data('file') || '').toLowerCase();
    return label.includes(q) || moduleName.includes(q) || file.includes(q) || n.id().toLowerCase().includes(q);
  });
  const rest = cy.elements().difference(matches.closedNeighborhood());
  if (mode === 'fade') rest.addClass('faded'); else rest.style('display', 'none');
  matches.removeClass('faded').style('display', 'element');
  return { matches };
}


