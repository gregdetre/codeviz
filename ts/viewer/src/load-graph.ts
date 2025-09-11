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
        await fetch('/client-log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: 'warn', message: 'Schema validation errors', data: errors }) }).catch(() => {});
      }
    } catch (e) {
      // non-fatal in dev
      console.warn('Validation failed to run', e);
    }
  }
  return json as Graph;
}


