import type { Core, Collection } from "cytoscape";
import { applyLayout, normalizeLayoutName } from "./layout-manager.js";

export type CompactCommand = {
  q?: string;
  op?: string;
  arg?: any;
  ops?: Array<[string, any?]>;
};

export type ExecutionResult = {
  appliedCount: number;
  errors: string[];
};

const ALLOWED_COLLECTION_OPS = new Set(["addClass", "removeClass", "show", "hide", "style", "lock", "unlock", "showConnectedEdges", "hideConnectedEdges", "collapse", "expand"]);
const ALLOWED_CORE_OPS = new Set(["layout", "fit", "center", "zoom", "resetViewport", "resetAll", "pan", "viewport", "batch", "select", "setOp", "clearSet", "clearAllSets", "collapseAll", "expandAll", "selectPath", "selectByDegree", "selectComponents", "selectEdgesBetween", "filterSet", "selectEdgesIncident"]);
const ALLOWED_CLASSES = new Set(["highlighted", "faded", "focus", "incoming-node", "outgoing-node", "incoming-edge", "outgoing-edge", "second-degree", "module-highlight"]);
const ALLOWED_STYLE_KEYS = new Set([
  // existing
  "opacity", "background-color", "line-color", "width", "text-opacity",
  // node styles
  "border-width", "border-color", "shape", "font-size", "text-outline-width", "text-outline-color",
  // edge styles
  "line-style", "line-opacity", "curve-style", "target-arrow-shape", "target-arrow-color"
]);

function isCollectionOp(op: string): boolean {
  return ALLOWED_COLLECTION_OPS.has(op);
}

function isCoreOp(op: string): boolean {
  return ALLOWED_CORE_OPS.has(op);
}

function sanitizeStyleArg(arg: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (!arg || typeof arg !== "object") return out;
  for (const [k, v] of Object.entries(arg)) {
    if (ALLOWED_STYLE_KEYS.has(k)) out[k] = v as any;
  }
  return out;
}

// ---------------- Named set registry (bounded) ----------------
const MAX_SETS = 16;
const MAX_SET_SIZE = 5000;
const MAX_TRAVERSAL_STEPS = 3;
const MAX_PATH_EDGES = 1000;

const namedSets: Map<string, Set<string>> = new Map();

function sanitizeSetName(name: any): string | null {
  const s = String(name ?? "").trim();
  if (!s) return null;
  if (!/^[A-Za-z][A-Za-z0-9_\-]{0,31}$/.test(s)) return null;
  return s;
}

function parseSetRef(maybeRef: any): string | null {
  const s = String(maybeRef ?? "").trim();
  if (!s.startsWith("$")) return null;
  const name = s.slice(1);
  return sanitizeSetName(name);
}

function getSetIds(name: string): string[] {
  const set = namedSets.get(name);
  if (!set) return [];
  return Array.from(set);
}

function setSetIds(name: string, ids: Iterable<string>): void {
  const safeName = sanitizeSetName(name);
  if (!safeName) return;
  if (!namedSets.has(safeName) && namedSets.size >= MAX_SETS) {
    // Evict oldest set (in insertion order)
    const firstKey = namedSets.keys().next().value as string | undefined;
    if (firstKey) namedSets.delete(firstKey);
  }
  const set = new Set<string>();
  let count = 0;
  for (const id of ids) {
    set.add(id);
    count++;
    if (count >= MAX_SET_SIZE) break;
  }
  namedSets.set(safeName, set);
}

function clearSet(name: string): void {
  const safe = sanitizeSetName(name);
  if (!safe) return;
  namedSets.delete(safe);
}

function clearAllSets(): void {
  namedSets.clear();
}

function resolveCollection(cy: Core, q: string | undefined): Collection {
  if (!q) return cy.elements();
  const setName = parseSetRef(q);
  if (setName) {
    const ids = getSetIds(setName);
    let col = cy.collection();
    for (const id of ids) {
      const el = cy.getElementById(id);
      if (el && el.nonempty()) col = col.union(el);
    }
    return col;
  }
  return cy.$(q);
}

async function execCollectionOp(cy: Core, q: string | undefined, op: string, arg?: any): Promise<string[]> {
  const errors: string[] = [];
  const eles: Collection = resolveCollection(cy, q);
  if (op === "addClass") {
    if (typeof arg !== "string") return errors;
    // Alias legacy project-specific class to standard one
    const className = (arg === 'group-highlight') ? 'highlighted' : arg;
    if (!ALLOWED_CLASSES.has(className)) return errors;
    eles.addClass(className);
    return errors;
  }
  if (op === "removeClass") {
    if (typeof arg !== "string") return errors;
    const className = (arg === 'group-highlight') ? 'highlighted' : arg;
    if (!ALLOWED_CLASSES.has(className)) return errors;
    eles.removeClass(className);
    return errors;
  }
  if (op === "show") {
    eles.style("display", "element");
    return errors;
  }
  if (op === "hide") {
    eles.style("display", "none");
    return errors;
  }
  if (op === "style") {
    const safe = sanitizeStyleArg(arg);
    for (const [k, v] of Object.entries(safe)) {
      eles.style(k, v as any);
    }
    return errors;
  }
  if (op === "lock") {
    eles.nodes().lock();
    return errors;
  }
  if (op === "unlock") {
    eles.nodes().unlock();
    return errors;
  }
  if (op === "showConnectedEdges") {
    const edges = (eles as any).connectedEdges ? (eles as any).connectedEdges() : eles.nodes().connectedEdges();
    edges.style("display", "element");
    return errors;
  }
  if (op === "hideConnectedEdges") {
    const edges = (eles as any).connectedEdges ? (eles as any).connectedEdges() : eles.nodes().connectedEdges();
    edges.style("display", "none");
    return errors;
  }
  if (op === "collapse" || op === "expand") {
    const ec = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
    if (!ec) {
      // Optional feature; warn but don't error hard
      console.warn('expandCollapse plugin not available');
      return errors;
    }
    try {
      if (op === 'collapse') {
        ec.collapse(eles.nodes());
      } else {
        // Preflight: ensure meta-edges are expanded so leaf edges are restored on expand
        try { if (typeof (ec as any).expandAllEdges === 'function') (ec as any).expandAllEdges(); } catch {}
        ec.expand(eles.nodes());
      }
      // Targeted re-aggregation around collapsed endpoints
      try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {}
    } catch (e: any) {
      errors.push(String(e?.message || e));
    }
    return errors;
  }
  return errors;
}

async function execCoreOp(cy: Core, q: string | undefined, op: string, arg?: any): Promise<string[]> {
  const errors: string[] = [];
  if (op === "layout") {
    const nameRaw = (arg?.name ?? arg ?? "fcose") as string;
    const name = normalizeLayoutName(nameRaw);
    try {
      await applyLayout(cy, name, arg);
    } catch (e: any) {
      errors.push(String(e?.message || e));
    }
    return errors;
  }
  if (op === "fit") {
    try { (cy as any).resize?.(); } catch {}
    if (q) cy.fit(resolveCollection(cy, q), 20);
    else cy.fit(cy.elements(':visible'), 20);
    return errors;
  }
  if (op === "center") {
    try { (cy as any).resize?.(); } catch {}
    if (q) cy.center(resolveCollection(cy, q));
    else cy.center(cy.elements(':visible'));
    return errors;
  }
  if (op === "zoom") {
    const level = typeof arg === "number" ? arg : undefined;
    if (typeof level === "number" && isFinite(level) && level > 0) cy.zoom(level);
    return errors;
  }
  if (op === "resetViewport") {
    cy.reset();
    return errors;
  }
  if (op === "resetAll") {
    cy.elements().removeClass("highlighted");
    cy.elements().removeClass("faded");
    cy.elements().style("display", "element");
    await applyLayout(cy, "fcose");
    try { (cy as any).resize?.(); } catch {}
    cy.fit(cy.elements(':visible'), 20);
    return errors;
  }
  if (op === "pan") {
    if (arg && typeof arg.x === "number" && typeof arg.y === "number") {
      cy.pan({ x: arg.x, y: arg.y });
    }
    return errors;
  }
  if (op === "viewport") {
    const zoom = typeof arg?.zoom === "number" ? arg.zoom : undefined;
    const panArg = arg?.pan;
    if (typeof zoom === "number" && isFinite(zoom) && zoom > 0) cy.zoom(zoom);
    if (panArg && typeof panArg.x === "number" && typeof panArg.y === "number") cy.pan({ x: panArg.x, y: panArg.y });
    return errors;
  }
  if (op === "batch") {
    const commands: CompactCommand[] = Array.isArray(arg?.commands) ? arg.commands : [];
    if (commands.length > 0) {
      cy.startBatch();
      try {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const nested = await executeCompactCommands(cy, commands);
        if (nested.errors?.length) errors.push(...nested.errors);
      } finally {
        cy.endBatch();
      }
    }
    return errors;
  }
  if (op === "select") {
    const asName = sanitizeSetName(arg?.as ?? (arg?.name ?? (arg?.dest))) || sanitizeSetName((arg ? arg.as : undefined) ?? (arg ? arg.name : undefined));
    const finalAs = asName ?? sanitizeSetName((arg && arg.as) || (arg && arg.name)) ?? sanitizeSetName((op as any).as);
    const targetName = sanitizeSetName((arg?.as ?? arg?.name) ?? (op as any)?.as) || sanitizeSetName((op as any)?.name) || sanitizeSetName((arg?.dest));
    const outName = sanitizeSetName((arg?.as ?? arg?.name) || (targetName ?? (asName ?? (arg?.dest)))) || sanitizeSetName((op as any)?.as);
    const setName = outName;
    if (!setName) {
      errors.push("select: missing 'as' name");
      return errors;
    }
    // Two modes: by selector q, or traversal from set
    let col: Collection | null = null;
    if (typeof (arg?.q ?? q) === 'string') {
      col = resolveCollection(cy, (arg?.q ?? q) as string);
    } else if (typeof arg?.from === 'string' && typeof arg?.rel === 'string') {
      const fromSet = parseSetRef(arg.from);
      if (!fromSet) {
        errors.push("select: 'from' must be a $set reference");
        return errors;
      }
      let current = resolveCollection(cy, `$${fromSet}`);
      const relRaw = String(arg.rel).toLowerCase();
      const steps = Math.max(1, Math.min(MAX_TRAVERSAL_STEPS, Number(arg.steps) || 1));
      let accum = cy.collection();
      for (let i = 0; i < steps; i++) {
        let next: Collection;
        if (relRaw === 'neighborhood') next = (current as any).neighborhood();
        else if (relRaw === 'incomers') next = (current as any).incomers();
        else if (relRaw === 'outgoers') next = (current as any).outgoers();
        else if (relRaw === 'closedneighborhood' || relRaw === 'closed-neighborhood' || relRaw === 'closed_neighborhood') next = (current as any).closedNeighborhood ? (current as any).closedNeighborhood() : current.neighborhood().union(current);
        else if (relRaw === 'ancestors') next = (current as any).ancestors ? (current as any).ancestors() : (current as any).parents();
        else if (relRaw === 'descendants') next = (current as any).descendants ? (current as any).descendants() : (current as any).children().descendants().union((current as any).children());
        else if (relRaw === 'children') next = (current as any).children ? (current as any).children() : (current as any).filter(':child');
        else if (relRaw === 'parent') next = (current as any).parent ? (current as any).parent() : (current as any).parents();
        else {
          errors.push(`select: unsupported rel: ${arg.rel}`);
          return errors;
        }
        accum = accum.union(next);
        current = next;
      }
      col = accum;
    } else {
      errors.push("select: requires 'q' or ('from' and 'rel')");
      return errors;
    }
    const ids: string[] = [];
    if (col) {
      for (let i = 0; i < col.length; i++) ids.push(col[i].id());
    }
    setSetIds(setName, ids);
    return errors;
  }
  if (op === "setOp") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    if (!setName) {
      errors.push("setOp: missing 'as'");
      return errors;
    }
    const getIdsFromRefs = (refs: any): string[] => {
      const out: string[] = [];
      for (const r of Array.isArray(refs) ? refs : []) {
        const nm = parseSetRef(r);
        if (nm) out.push(...getSetIds(nm));
      }
      return out;
    };
    let result = new Set<string>();
    if (Array.isArray(arg?.union)) {
      for (const id of getIdsFromRefs(arg.union)) {
        if (result.size >= MAX_SET_SIZE) break;
        result.add(id);
      }
    } else if (Array.isArray(arg?.intersection)) {
      const lists = (arg.intersection as any[]).map((r: any) => new Set(getIdsFromRefs([r])));
      if (lists.length > 0) {
        result = new Set(Array.from(lists[0]).filter((id) => lists.every((s) => s.has(id))));
      }
    } else if (Array.isArray(arg?.difference)) {
      const base = new Set(getIdsFromRefs([arg.difference?.[0]]));
      const rest = new Set<string>();
      for (const r of (arg.difference as any[]).slice(1)) for (const id of getIdsFromRefs([r])) rest.add(id);
      result = new Set(Array.from(base).filter((id) => !rest.has(id)));
    } else {
      errors.push("setOp: requires 'union' | 'intersection' | 'difference'");
      return errors;
    }
    setSetIds(setName, result);
    return errors;
  }
  if (op === "clearSet") {
    const name = sanitizeSetName(arg?.name ?? arg?.as ?? q);
    if (!name) {
      errors.push("clearSet: missing 'name'");
      return errors;
    }
    clearSet(name);
    return errors;
  }
  if (op === "clearAllSets") {
    clearAllSets();
    return errors;
  }
  if (op === "collapseAll" || op === "expandAll") {
    const ec = (cy as any).expandCollapse ? (cy as any).expandCollapse('get') : null;
    if (!ec) {
      console.warn('expandCollapse plugin not available');
      return errors;
    }
    try {
      if (op === 'collapseAll') {
        ec.collapseAll();
      } else {
        // Preflight: restore leaf edges before expanding nodes
        try { if (typeof (ec as any).expandAllEdges === 'function') (ec as any).expandAllEdges(); } catch {}
        ec.expandAll();
      }
      // Targeted re-aggregation around collapsed endpoints
      try { (window as any).__cv?.reaggregateCollapsedEdges?.(); } catch {}
    } catch (e: any) {
      errors.push(String(e?.message || e));
    }
    return errors;
  }
  if (op === "selectPath") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    const fromNm = parseSetRef(arg?.from);
    const toNm = parseSetRef(arg?.to);
    if (!setName || !fromNm || !toNm) {
      errors.push("selectPath: requires 'from', 'to' ($set) and 'as'");
      return errors;
    }
    const fromIds = getSetIds(fromNm).filter(Boolean);
    const toIds = getSetIds(toNm).filter(Boolean);
    if (fromIds.length === 0 || toIds.length === 0) {
      setSetIds(setName, []);
      return errors;
    }
    const source = cy.getElementById(fromIds[0]);
    const target = cy.getElementById(toIds[0]);
    if (!source.nonempty() || !target.nonempty()) {
      setSetIds(setName, []);
      return errors;
    }
    try {
      const res = cy.elements().dijkstra({ root: source as any, directed: true, weight: () => 1 });
      const path = res.pathTo(target as any);
      const ids: string[] = [];
      const len = Math.min(path.length, MAX_PATH_EDGES);
      const nodesOnly = Boolean(arg?.nodesOnly);
      for (let i = 0; i < len; i++) {
        const el = path[i];
        if (nodesOnly && el.isEdge && el.isEdge()) continue;
        ids.push(el.id());
      }
      setSetIds(setName, ids);
    } catch (e: any) {
      errors.push(String(e?.message || e));
    }
    return errors;
  }
  if (op === "filterSet") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    const fromNm = parseSetRef(arg?.from);
    const qSel = typeof arg?.q === 'string' ? arg.q : undefined;
    if (!setName || !fromNm || !qSel) {
      errors.push("filterSet: requires 'from' ($set), 'q', and 'as'");
      return errors;
    }
    const base = resolveCollection(cy, `$${fromNm}`);
    const refined = base.filter(qSel);
    const ids: string[] = [];
    for (let i = 0; i < refined.length && i < MAX_SET_SIZE; i++) ids.push(refined[i].id());
    setSetIds(setName, ids);
    return errors;
  }
  if (op === "selectEdgesIncident") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    const fromNm = parseSetRef(arg?.from);
    if (!setName || !fromNm) {
      errors.push("selectEdgesIncident: requires 'from' ($set) and 'as'");
      return errors;
    }
    const nodes = resolveCollection(cy, `$${fromNm}`).nodes();
    const edges = nodes.connectedEdges();
    const ids: string[] = [];
    for (let i = 0; i < edges.length && i < MAX_SET_SIZE; i++) ids.push(edges[i].id());
    setSetIds(setName, ids);
    return errors;
  }
  if (op === "selectByDegree") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    if (!setName) {
      errors.push("selectByDegree: missing 'as'");
      return errors;
    }
    const min = typeof arg?.min === 'number' ? arg.min : undefined;
    const max = typeof arg?.max === 'number' ? arg.max : undefined;
    const kind = String(arg?.kind || 'total').toLowerCase();
    const getDegree = (n: any) => {
      if (kind === 'in') return n.indegree ? n.indegree(false) : n.indegree();
      if (kind === 'out') return n.outdegree ? n.outdegree(false) : n.outdegree();
      return n.degree ? n.degree(false) : n.degree();
    };
    const nodes = cy.nodes().filter((n) => {
      const d = getDegree(n);
      if (typeof min === 'number' && d < min) return false;
      if (typeof max === 'number' && d > max) return false;
      return true;
    });
    const ids: string[] = [];
    for (let i = 0; i < nodes.length && i < MAX_SET_SIZE; i++) ids.push(nodes[i].id());
    setSetIds(setName, ids);
    return errors;
  }
  if (op === "selectComponents") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    if (!setName) {
      errors.push("selectComponents: missing 'as'");
      return errors;
    }
    const comps = cy.elements().components();
    const ids: string[] = [];
    for (const comp of comps) {
      const nodes = comp.nodes();
      for (let i = 0; i < nodes.length; i++) {
        ids.push(nodes[i].id());
        if (ids.length >= MAX_SET_SIZE) break;
      }
      if (ids.length >= MAX_SET_SIZE) break;
    }
    setSetIds(setName, ids);
    return errors;
  }
  if (op === "selectEdgesBetween") {
    const setName = sanitizeSetName(arg?.as ?? arg?.name);
    const fromNm = parseSetRef(arg?.from);
    const toNm = parseSetRef(arg?.to);
    if (!setName || !fromNm || !toNm) {
      errors.push("selectEdgesBetween: requires 'from', 'to' ($set) and 'as'");
      return errors;
    }
    const fromIds = new Set(getSetIds(fromNm));
    const toIds = new Set(getSetIds(toNm));
    const edges = cy.edges().filter((e) => fromIds.has(e.source().id()) && toIds.has(e.target().id()));
    const ids: string[] = [];
    for (let i = 0; i < edges.length && i < MAX_SET_SIZE; i++) ids.push(edges[i].id());
    setSetIds(setName, ids);
    return errors;
  }
  return errors;
}

export async function executeCompactCommands(cy: Core, commands: CompactCommand[]): Promise<ExecutionResult> {
  const errors: string[] = [];
  let applied = 0;
  for (const cmd of commands ?? []) {
    try {
      const { q, op, arg, ops } = cmd || {} as CompactCommand;
      if (op && ops && ops.length > 0) {
        errors.push("Command has both 'op' and 'ops'; skipping");
        continue;
      }
      if (op) {
        if (isCollectionOp(op)) {
          const errs = await execCollectionOp(cy, q, op, arg);
          if (errs?.length) errors.push(...errs);
          applied++;
          continue;
        }
        if (isCoreOp(op)) {
          let mergedArg: any = arg;
          try {
            const extra = cmd as any;
            const isObj = mergedArg && typeof mergedArg === 'object';
            const base = isObj ? { ...mergedArg } : {};
            // Merge commonly used top-level fields for core ops
            mergedArg = { ...base, as: extra.as ?? base.as, name: extra.name ?? base.name, from: extra.from ?? base.from, to: extra.to ?? base.to, rel: extra.rel ?? base.rel, steps: extra.steps ?? base.steps, q: extra.q ?? base.q, union: extra.union ?? base.union, intersection: extra.intersection ?? base.intersection, difference: extra.difference ?? base.difference, min: extra.min ?? base.min, max: extra.max ?? base.max };
          } catch {}
          const errs = await execCoreOp(cy, q, op, mergedArg);
          if (errs?.length) errors.push(...errs);
          applied++;
          continue;
        }
        errors.push(`Unsupported op: ${op}`);
        continue;
      }
      if (ops && Array.isArray(ops)) {
        // Treat as collection chain by default
        for (const item of ops) {
          const opName = String(item?.[0] ?? "");
          const opArg = item?.[1];
          if (isCollectionOp(opName)) {
            const errs = await execCollectionOp(cy, q, opName, opArg);
            if (errs?.length) errors.push(...errs);
          } else if (isCoreOp(opName)) {
            const errs = await execCoreOp(cy, q, opName, opArg);
            if (errs?.length) errors.push(...errs);
          } else errors.push(`Unsupported op in chain: ${opName}`);
        }
        applied++;
        continue;
      }
      errors.push("Command missing 'op' or 'ops'");
    } catch (err: any) {
      errors.push(String(err?.message || err));
    }
  }
  return { appliedCount: applied, errors };
}

export function getSupportedOpsSummary() {
  return {
    collection: Array.from(ALLOWED_COLLECTION_OPS),
    core: Array.from(ALLOWED_CORE_OPS),
    classes: Array.from(ALLOWED_CLASSES),
    styleKeys: Array.from(ALLOWED_STYLE_KEYS)
  };
}



// Helper for snapshot: list sets by name and count only
export function listNamedSets(): Array<{ name: string; count: number }> {
  const out: Array<{ name: string; count: number }> = [];
  for (const [name, set] of namedSets.entries()) out.push({ name, count: set.size });
  return out;
}
