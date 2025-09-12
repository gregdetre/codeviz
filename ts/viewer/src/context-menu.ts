import type { Core, NodeSingular } from "cytoscape";
import type { Graph, ViewerConfig } from "./graph-types.js";
import { InteractionManager } from "./interaction-manager.js";
import { renderDetails } from "./details-panel.js";
import { openFileInEditor } from "./file-opener.js";

export function installContextMenu(
  cy: Core,
  graph: Graph,
  vcfg?: ViewerConfig,
  im?: ReturnType<typeof InteractionManager>
) {
  const mgr = im ?? InteractionManager(cy, graph, vcfg);

  // Node menu: functions, classes, variables
  (cy as any).cxtmenu({
    selector: 'node[type = "function"], node[type = "class"], node[type = "variable"]',
    menuRadius: 110,
    openMenuEvents: 'cxttapstart',
    commands: (ele: NodeSingular) => {
      const selectedNodes = (cy as any).$(':selected').filter('node');
      const selectedCount = (selectedNodes as any).length ?? 0;

      const cmds: any[] = [
        {
          content: 'Focus',
          select: () => {
            try { mgr.clearFocus(); } catch {}
            try { mgr.focus(ele.id()); } catch {}
            try { cy.center(ele); } catch {}
            try {
              const detailsEl = document.getElementById('details');
              if (detailsEl) renderDetails(detailsEl as any, ele as any);
            } catch {}
          }
        },
        {
          content: 'Fade others',
          select: () => {
            try { mgr.clearFocus(); } catch {}
            try { mgr.setFilterMode('fade' as any); } catch {}
            try { mgr.focus(ele.id()); } catch {}
          }
        },
        {
          content: 'Hide others',
          select: () => {
            try { mgr.clearFocus(); } catch {}
            try { mgr.setFilterMode('hide' as any); } catch {}
            try { mgr.focus(ele.id()); } catch {}
          }
        },
        {
          content: 'Unfocus',
          select: () => { try { mgr.clearFocus(); } catch {} }
        },
        {
          content: 'Hide',
          select: () => { try { (ele as any).style('display', 'none'); } catch {} }
        }
      ];

      if (selectedCount >= 2) {
        cmds.push({
          content: `Hide selected (${selectedCount})`,
          select: () => {
            try {
              const toHide = (selectedNodes as any).union((selectedNodes as any).descendants());
              (toHide as any).style('display', 'none');
            } catch {}
          }
        });
      }

      cmds.push({
        content: 'Open file',
        select: () => {
          try {
            const data = ele.data();
            if (data?.file && data?.line) openFileInEditor(String(data.file), Number(data.line));
          } catch {}
        }
      });

      return cmds;
    }
  });

  // Group menu: modules (files) and folders (explicit for now; generic parent nodes are handled by double-click)
  (cy as any).cxtmenu({
    selector: 'node[type = "module"], node[type = "folder"]',
    menuRadius: 120,
    openMenuEvents: 'cxttapstart',
    commands: (ele: NodeSingular) => {
      const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
      const canExpand = !!api && api.isExpandable && api.isExpandable(ele);
      const canCollapse = !!api && api.isCollapsible && api.isCollapsible(ele);
      const toggleLabel = canExpand ? 'Expand' : (canCollapse ? 'Collapse' : 'Expand/Collapse');
      const selectedNodes = (cy as any).$(':selected').filter('node');
      const selectedCount = (selectedNodes as any).length ?? 0;

      const cmds: any[] = [
        {
          content: 'Focus',
          select: () => { try { mgr.clearFocus(); mgr.focus(ele.id()); cy.center(ele); } catch {} }
        },
        {
          content: 'Fade others',
          select: () => { try { mgr.clearFocus(); mgr.setFilterMode('fade' as any); mgr.focus(ele.id()); } catch {} }
        },
        {
          content: 'Hide',
          select: () => { try { (ele as any).union((ele as any).descendants()).style('display', 'none'); } catch {} }
        }
      ];

      if (selectedCount >= 2) {
        cmds.push({
          content: `Hide selected (${selectedCount})`,
          select: () => {
            try {
              const toHide = (selectedNodes as any).union((selectedNodes as any).descendants());
              (toHide as any).style('display', 'none');
            } catch {}
          }
        });
      }

      cmds.push({
        content: toggleLabel,
        enabled: !!api,
        select: () => {
          try {
            if (!api) return;
            if (api.isExpandable(ele)) {
              // Preflight: restore any meta-edges so expand can rehydrate leaf edges
              try { if (typeof (api as any).expandAllEdges === 'function') (api as any).expandAllEdges(); } catch {}
              api.expand(ele, { animate: false });
            } else if (api.isCollapsible(ele)) {
              api.collapse(ele, { animate: false });
            }
            // Targeted re-aggregation: only around collapsed endpoints
            try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {}
          } catch {}
        }
      });

      cmds.push({
        content: 'Unfocus',
        select: () => { try { mgr.clearFocus(); } catch {} }
      });

      return cmds;
    }
  });

  // Core (whitespace) menu
  (cy as any).cxtmenu({
    selector: 'core',
    menuRadius: 120,
    openMenuEvents: 'cxttapstart',
    commands: () => {
      const api = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
      const reaggregate = () => { try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {} };
      const selectedNodes = (cy as any).$(':selected').filter('node');
      const selectedCount = (selectedNodes as any).length ?? 0;
      return [
        {
          content: 'Collapse all groups',
          enabled: !!api,
          select: () => {
            try {
              if (!api) return;
              const groups = cy.nodes('node:parent');
              api.collapse(groups, { animate: false });
              reaggregate();
            } catch {}
          }
        },
        {
          content: 'Expand all groups',
          enabled: !!api,
          select: () => {
            try {
              if (!api) return;
              const groups = cy.nodes('node:parent');
              // Preflight: ensure any meta-edges are expanded so leaf edges are restored
              try { if (typeof (api as any).expandAllEdges === 'function') (api as any).expandAllEdges(); } catch {}
              api.expand(groups, { animate: false });
              reaggregate();
            } catch {}
          }
        },
        {
          content: `Hide selected (${selectedCount})`,
          enabled: selectedCount > 0,
          select: () => {
            try {
              const toHide = (selectedNodes as any).union((selectedNodes as any).descendants());
              (toHide as any).style('display', 'none');
            } catch {}
          }
        },
        {
          content: 'Unfocus',
          select: () => { try { mgr.clearFocus(); cy.elements().style('display', 'element'); } catch {} }
        }
      ];
    }
  });
}


