import type { Core } from "cytoscape";

// Hide groups (modules/folders) automatically when all their member entity nodes are hidden
// Applies a non-destructive overlay class so explicit hides elsewhere aren't overridden
export function updateAutoGroupVisibility(cy: Core): void {
  try { cy.style().selector('.cv-group-hidden-auto').style({ display: 'none' } as any).update(); } catch {}
  try { cy.style().selector('edge.cv-group-hidden-auto').style({ display: 'none' } as any).update(); } catch {}

  try {
    const groups = cy.nodes("node[type = 'module'], node[type = 'folder']");
    groups.forEach((g: any) => {
      try {
        // Consider entity descendants (functions/classes/variables) visibility; if none are visible, hide the group
        const hasVisibleEntityDesc = g.descendants
          ? g.descendants("node[type != 'module'][type != 'folder']:visible").length > 0
          : (g.children ? g.children("node[type != 'module'][type != 'folder']:visible").length > 0 : false);
        if (hasVisibleEntityDesc) g.removeClass('cv-group-hidden-auto'); else g.addClass('cv-group-hidden-auto');
      } catch {}
    });
  } catch {}

  // Also hide collapsed meta-edges whose endpoints are hidden by this auto rule
  try {
    const hiddenGroupIds = new Set<string>();
    cy.nodes("node[type = 'module'].cv-group-hidden-auto, node[type = 'folder'].cv-group-hidden-auto").forEach((n: any) => { hiddenGroupIds.add(String(n.id())); });
    cy.edges('.cy-expand-collapse-collapsed-edge').forEach((e: any) => {
      try {
        const sId = String(e.source().id());
        const tId = String(e.target().id());
        if (hiddenGroupIds.has(sId) || hiddenGroupIds.has(tId)) e.addClass('cv-group-hidden-auto'); else e.removeClass('cv-group-hidden-auto');
      } catch {}
    });
  } catch {}
}


