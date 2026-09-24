const PROJECTS = new Set([
  'morning-evening-night',
  'casamar',
  'ryzon',
  'labirinto-noir',
  'guru-spirit-packaging',
  'guru-spirit-folder',
  'grupo-pirasa',
  'deposito-23',
  'epj-corrida',
  'malhafil',
  'agencia-trees-carnaval',
  'fluis',
  'vies-liberdade-sem-rotulos',
]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
});

const validProject = (value) => typeof value === 'string' && PROJECTS.has(value);

export async function onRequestGet({ request, env }) {
  const project = new URL(request.url).searchParams.get('project');
  if (!validProject(project)) return json({ error: 'Invalid project.' }, 400);
  if (!env.LIKES) return json({ error: 'Like storage is unavailable.' }, 503);

  const stored = await env.LIKES.get(`likes:${project}`);
  const count = Math.max(0, Number.parseInt(stored || '0', 10) || 0);
  return json({ project, count });
}

export async function onRequestPost({ request, env }) {
  if (!env.LIKES) return json({ error: 'Like storage is unavailable.' }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const project = payload?.project;
  if (!validProject(project)) return json({ error: 'Invalid project.' }, 400);

  const key = `likes:${project}`;
  const stored = await env.LIKES.get(key);
  const count = Math.max(0, Number.parseInt(stored || '0', 10) || 0) + 1;
  await env.LIKES.put(key, String(count));
  return json({ project, count });
}
