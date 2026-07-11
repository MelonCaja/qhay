// Aplica archivos SQL a la BD remota de Supabase vía Management API.
// Requiere SUPABASE_ACCESS_TOKEN (sbp_…) en el entorno, en .env, o el token
// guardado por `supabase login` en ~/.supabase/access-token.
// Uso: node scripts/apply-remote-sql.mjs <archivo1.sql> [archivo2.sql …]
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT_REF = 'uyydzcoytlwsfticqkot';

function leerToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  if (existsSync('.env')) {
    const m = readFileSync('.env', 'utf8').match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    if (m) return m[1].trim();
  }
  const f = join(homedir(), '.supabase', 'access-token');
  if (existsSync(f)) return readFileSync(f, 'utf8').trim();
  console.error('Sin token: exporta SUPABASE_ACCESS_TOKEN o corre `npx supabase login`.');
  process.exit(1);
}

async function ejecutar(token, query, etiqueta) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`✗ ${etiqueta}: HTTP ${res.status}\n${body}`);
    process.exit(1);
  }
  console.log(`✓ ${etiqueta}`);
  return body ? JSON.parse(body) : null;
}

const token = leerToken();
for (const archivo of process.argv.slice(2)) {
  await ejecutar(token, readFileSync(archivo, 'utf8'), archivo);
}

// Verificación: conteo por categoría + total de ingredientes
const conteo = await ejecutar(
  token,
  `select category, count(*)::int as recetas from public.recipes group by category order by 1;`,
  'verificación recipes'
);
console.table(conteo);
const ing = await ejecutar(
  token,
  `select count(*)::int as ingredientes from public.recipe_ingredients;`,
  'verificación recipe_ingredients'
);
console.table(ing);
