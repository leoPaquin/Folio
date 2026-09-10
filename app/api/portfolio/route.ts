import { headers } from 'next/headers';
import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

const schema = `CREATE TABLE IF NOT EXISTS portfolio_state (user_id TEXT PRIMARY KEY, email TEXT, state_json TEXT NOT NULL, updated_at TEXT NOT NULL)`;

async function identity() {
  const requestHeaders = await headers();
  const id = requestHeaders.get('oai-authenticated-user-id');
  const email = requestHeaders.get('oai-authenticated-user-email') || '';
  const encodedName = requestHeaders.get('oai-authenticated-user-full-name');
  const name = encodedName && requestHeaders.get('oai-authenticated-user-full-name-encoding') === 'percent-encoded-utf-8' ? decodeURIComponent(encodedName) : undefined;
  if (!id) {
    if (process.env.NODE_ENV !== 'production') return { id: 'local-preview', email: 'local@preview', name: 'Aperçu local' };
    return null;
  }
  return { id, email, name };
}

async function ensureSchema() {
  await (env as unknown as { DB: D1Database }).DB.prepare(schema).run();
}

export async function GET() {
  const user = await identity();
  if (!user) return Response.json({ error: 'Sign-in required' }, { status: 401 });
  await ensureSchema();
  const db = (env as unknown as { DB: D1Database }).DB;
  const row = await db.prepare('SELECT state_json, updated_at FROM portfolio_state WHERE user_id = ?').bind(user.id).first<{ state_json: string; updated_at: string }>();
  return Response.json({ user, state: row ? JSON.parse(row.state_json) : null, updatedAt: row?.updated_at || null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const user = await identity();
  if (!user) return Response.json({ error: 'Sign-in required' }, { status: 401 });
  const body = await request.json() as { state?: unknown };
  if (!body || !body.state || typeof body.state !== 'object') return Response.json({ error: 'Invalid state' }, { status: 400 });
  const serialized = JSON.stringify(body.state);
  if (serialized.length > 5_000_000) return Response.json({ error: 'Portfolio too large' }, { status: 413 });
  await ensureSchema();
  const updatedAt = new Date().toISOString();
  await (env as unknown as { DB: D1Database }).DB.prepare('INSERT INTO portfolio_state (user_id, email, state_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, state_json = excluded.state_json, updated_at = excluded.updated_at').bind(user.id, user.email, serialized, updatedAt).run();
  return Response.json({ ok: true, user, updatedAt });
}
