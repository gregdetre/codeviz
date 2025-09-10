import Ajv2020 from 'ajv/dist/2020';

export async function validateGraph(data: unknown): Promise<{ ok: true } | { ok: false; errors: string[] }> {
  // Try local static schema first (served by Vite public/), then backend proxy
  async function trySchema(url: string) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (resp.ok) return await resp.json();
    } catch {}
    return null;
  }
  const localSchema = await trySchema('/schema/codebase_graph.schema.json');
  const proxiedSchema = localSchema || await trySchema('/gdviz/schema/codebase_graph.schema.json');
  if (!proxiedSchema) return { ok: false, errors: ['Failed to load codebase_graph.schema.json'] };
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(proxiedSchema);
  const valid = validate(data);
  if (valid) return { ok: true };
  const errs = (validate.errors || []).map(e => `${e.instancePath || '(root)'} ${e.message || ''}`.trim());
  return { ok: false, errors: errs };
}



