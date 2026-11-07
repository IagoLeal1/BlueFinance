// Escreve .env.local com as URLs e chaves do Supabase local (pnpm db:env).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const raw = execSync('pnpm --silent supabase status -o env', { encoding: 'utf8' });
const env = Object.fromEntries([...raw.matchAll(/^(\w+)="?([^"\n]*)"?$/gm)].map((m) => [m[1], m[2]]));
writeFileSync(
  '.env.local',
  `# Gerado por pnpm db:env (Supabase local). Não commitar.
NEXT_PUBLIC_SUPABASE_URL=${env.API_URL}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${env.PUBLISHABLE_KEY}
SUPABASE_SECRET_KEY=${env.SECRET_KEY}
`,
);
console.log('.env.local atualizado');
