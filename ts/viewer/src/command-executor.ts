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

const ALLOWED_COLLECTION_OPS = new Set(["addClass", "removeClass", "show", "hide", "style"]);
const ALLOWED_CORE_OPS = new Set(["layout", "fit", "center", "zoom", "resetViewport", "resetAll"]);
const ALLOWED_CLASSES = new Set(["highlighted", "faded"]);
const ALLOWED_STYLE_KEYS = new Set(["opacity", "background-color", "line-color", "width", "text-opacity"]);

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

async function execCollectionOp(cy: Core, q: string | undefined, op: string, arg?: any): Promise<void> {
  const eles: Collection = q ? cy.$(q) : cy.elements();
  if (op === "addClass") {
    if (typeof arg !== "string" || !ALLOWED_CLASSES.has(arg)) return;
    eles.addClass(arg);
    return;
  }
  if (op === "removeClass") {
    if (typeof arg !== "string" || !ALLOWED_CLASSES.has(arg)) return;
    eles.removeClass(arg);
    return;
  }
  if (op === "show") {
    eles.style("display", "element");
    return;
  }
  if (op === "hide") {
    eles.style("display", "none");
    return;
  }
  if (op === "style") {
    const safe = sanitizeStyleArg(arg);
    for (const [k, v] of Object.entries(safe)) {
      eles.style(k, v as any);
    }
    return;
  }
}

async function execCoreOp(cy: Core, q: string | undefined, op: string, arg?: any): Promise<void> {
  if (op === "layout") {
    const nameRaw = (arg?.name ?? arg ?? "fcose") as string;
    const name = normalizeLayoutName(nameRaw);
    await applyLayout(cy, name);
    return;
  }
  if (op === "fit") {
    if (q) cy.fit(cy.$(q));
    else cy.fit();
    return;
  }
  if (op === "center") {
    if (q) cy.center(cy.$(q));
    else cy.center();
    return;
  }
  if (op === "zoom") {
    const level = typeof arg === "number" ? arg : undefined;
    if (typeof level === "number" && isFinite(level) && level > 0) cy.zoom(level);
    return;
  }
  if (op === "resetViewport") {
    cy.reset();
    return;
  }
  if (op === "resetAll") {
    cy.elements().removeClass("highlighted");
    cy.elements().removeClass("faded");
    cy.elements().style("display", "element");
    await applyLayout(cy, "fcose");
    cy.fit();
    return;
  }
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
          await execCollectionOp(cy, q, op, arg);
          applied++;
          continue;
        }
        if (isCoreOp(op)) {
          await execCoreOp(cy, q, op, arg);
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
          if (isCollectionOp(opName)) await execCollectionOp(cy, q, opName, opArg);
          else if (isCoreOp(opName)) await execCoreOp(cy, q, opName, opArg);
          else errors.push(`Unsupported op in chain: ${opName}`);
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


