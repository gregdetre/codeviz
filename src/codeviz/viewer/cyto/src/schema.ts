import Ajv2020 from 'ajv/dist/2020';

export async function validateGraph(data: unknown): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  // Dev-only: fetch schema from repo path via proxy
  const resp = await fetch('/gdviz/schema/codebase_graph.schema.json');
  if (!resp.ok) return { ok: false, errors: ['Failed to load codebase_graph.schema.json'] };
  const schema = await resp.json();
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (valid) return { ok: true };
  const errs = (validate.errors || []).map(e => `${e.instancePath || '(root)'} ${e.message || ''}`.trim());
  return { ok: false, errors: errs };
}



