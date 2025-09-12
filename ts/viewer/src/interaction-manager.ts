import type { Core, NodeSingular, Collection } from "cytoscape";
import type { Graph, ViewerConfig } from "./graph-types.js";
import { openFileInEditor } from "./file-opener.js";

export type FilterMode = 'hide' | 'fade';

export function InteractionManager(cy: Core, graph: Graph, vcfg?: ViewerConfig) {
  let filterMode: FilterMode = 'fade';
  const highlight = vcfg?.highlight || {} as any;
  const steps: number = Math.max(1, Number(highlight?.steps ?? 1));
  const hideNonHighlightedEdges: boolean = Boolean(highlight?.hideNonHighlightedEdges ?? true);

  // Space-hold pan mode state
  let isSpacePanActive = false;
  let isMouseDown = false;
  let isMiddlePanActive = false;
  let previousAutoungrabify = false;
  let previousBoxSelection = false;
  let previousUserPanning = true;
  let previousPanning = true;
  const container = cy.container() as HTMLElement;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const dbg = (...args: any[]) => { try { if ((window as any).__cvPanDebug) console.debug('[cv-pan]', ...args); } catch {} };

  function isEditableTarget(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if ((el as any).isContentEditable) return true;
    // If inside a searchable field container, treat as editable
    return Boolean(el.closest && (el.closest('#searchBox') || el.closest('[contenteditable="true"]')));
  }

  function updateCursor() {
    if (!container) return;
    if (isSpacePanActive) {
      container.style.cursor = isMouseDown ? 'grabbing' : 'grab';
    } else if (isMiddlePanActive && isMouseDown) {
      container.style.cursor = 'grabbing';
    } else {
      container.style.cursor = '';
    }
  }

  function enableSpacePan() {
    if (isSpacePanActive) return;
    isSpacePanActive = true;
    // Snapshot previous interaction flags to restore later
    try { previousAutoungrabify = cy.autoungrabify(); } catch { previousAutoungrabify = false; }
    try { previousBoxSelection = cy.boxSelectionEnabled(); } catch { previousBoxSelection = false; }
    try { previousUserPanning = cy.userPanningEnabled(); } catch { previousUserPanning = true; }
    try { previousPanning = typeof (cy as any).panningEnabled === 'function' ? (cy as any).panningEnabled() : true; } catch { previousPanning = true; }
    // Disable node dragging and box selection so dragging pans the viewport even over nodes
    try { cy.autoungrabify(true); } catch {}
    try { cy.boxSelectionEnabled(false); } catch {}
    try { cy.userPanningEnabled(true); } catch {}
    try { if (typeof (cy as any).panningEnabled === 'function') (cy as any).panningEnabled(true); } catch {}
    dbg('space: enablePan', { previousAutoungrabify, previousBoxSelection, previousUserPanning, previousPanning });
    updateCursor();
  }

  function disableSpacePan() {
    if (!isSpacePanActive) return;
    isSpacePanActive = false;
    isMouseDown = false;
    // Restore previous interaction flags
    try { cy.autoungrabify(previousAutoungrabify); } catch {}
    try { cy.boxSelectionEnabled(previousBoxSelection); } catch {}
    try { cy.userPanningEnabled(previousUserPanning); } catch {}
    try { if (typeof (cy as any).panningEnabled === 'function') (cy as any).panningEnabled(previousPanning); } catch {}
    dbg('space: disablePan');
    updateCursor();
  }

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
    // Keyboard handlers
    document.addEventListener('keydown', (e) => {
      try {
        if (e.key === 'Escape') clearFocus();
        // Space-hold temporary pan mode (ignored when typing in inputs)
        const isSpace = e.code === 'Space' || e.key === ' ';
        if (isSpace) {
          if (isEditableTarget(e.target)) return; // don't interfere with typing
          e.preventDefault();
          if (!isSpacePanActive) enableSpacePan();
          dbg('keydown space');
        }
      } catch {}
    });
    document.addEventListener('keyup', (e) => {
      try {
        const isSpace = e.code === 'Space' || e.key === ' ';
        if (isSpace) {
          e.preventDefault();
          disableSpacePan();
          dbg('keyup space');
        }
      } catch {}
    });
    // Defensive cleanup if window loses focus/visibility while space is held
    window.addEventListener('blur', () => { try { disableSpacePan(); } catch {} });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { try { disableSpacePan(); } catch {} } });
    // Manual pan when Space is held, even when starting over nodes/groups
    if (container) {
      const onPointerDown = (ev: PointerEvent) => {
        // Space-hold panning with left button
        if (isSpacePanActive && ev.button === 0) {
          if (isEditableTarget(ev.target)) return;
          try { container.setPointerCapture(ev.pointerId); } catch {}
          isMouseDown = true;
          lastPointerX = ev.clientX;
          lastPointerY = ev.clientY;
          updateCursor();
          ev.preventDefault();
          ev.stopPropagation();
          dbg('pointerdown space-pan', { x: ev.clientX, y: ev.clientY });
          return;
        }
        // Middle-mouse panning regardless of Space
        if (ev.button === 1) {
          if (isEditableTarget(ev.target)) return;
          isMiddlePanActive = true;
          try { container.setPointerCapture(ev.pointerId); } catch {}
          isMouseDown = true;
          lastPointerX = ev.clientX;
          lastPointerY = ev.clientY;
          updateCursor();
          ev.preventDefault();
          ev.stopPropagation();
          dbg('pointerdown middle-pan', { x: ev.clientX, y: ev.clientY });
          return;
        }
      };
      const onPointerMove = (ev: PointerEvent) => {
        if (!(isSpacePanActive || isMiddlePanActive) || !isMouseDown) return;
        const dx = ev.clientX - lastPointerX;
        const dy = ev.clientY - lastPointerY;
        lastPointerX = ev.clientX;
        lastPointerY = ev.clientY;
        try { cy.panBy({ x: dx, y: dy }); } catch {}
        ev.preventDefault();
        ev.stopPropagation();
        dbg('pointermove panBy', { dx, dy });
      };
      const onPointerUp = (ev: PointerEvent) => {
        if (!isMouseDown) return;
        isMouseDown = false;
        isMiddlePanActive = false;
        try { container.releasePointerCapture(ev.pointerId); } catch {}
        updateCursor();
        ev.preventDefault();
        ev.stopPropagation();
        dbg('pointerup');
      };
      container.addEventListener('pointerdown', onPointerDown, { capture: true } as any);
      container.addEventListener('pointermove', onPointerMove, { capture: true } as any);
      container.addEventListener('pointerup', onPointerUp, { capture: true } as any);
      container.addEventListener('pointercancel', onPointerUp, { capture: true } as any);
      container.addEventListener('dragstart', (e) => { e.preventDefault(); }, { capture: true } as any);
      container.addEventListener('mouseleave', () => { isMouseDown = false; updateCursor(); }, { capture: true } as any);
    }
  }

  return { setFilterMode, focus, clearFocus, installBasics };
}


