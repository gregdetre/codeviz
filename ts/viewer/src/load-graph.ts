import type { Graph } from "./graph-types.js";

export async function loadGraph(validate = false): Promise<Graph> {
  const res = await fetch('/out/codebase_graph.json');
  const json = await res.json();
  if (validate) {
    try {
      const schemaRes = await fetch('/schema/codebase_graph.schema.json');
      const schema = await schemaRes.json();
      const { default: Ajv } = await import('ajv');
      const ajv = new Ajv({ allErrors: true, strict: false });
      const validateFn = ajv.compile(schema);
      const valid = validateFn(json);
      if (!valid) {
        const errors = (validateFn.errors ?? []).slice(0, 10);
        console.warn('Schema validation errors', errors);
      }
    } catch (e) {
      // non-fatal in dev
      console.warn('Validation failed to run', e);
    }
  }
  return json as Graph;
}

export async function loadAnnotations(): Promise<any | null> {
  try {
    const res = await fetch('/out/llm_annotation.json');
    // Treat 204 No Content and non-OK as "no annotations".
    if (res.status === 204) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


