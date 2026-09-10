import { authenticatedClient } from '../../../lib/supabase/server';
import { validPortfolio } from '../../../lib/portfolio';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!supabase) return Response.json({ error: 'Supabase doit être configuré sur le serveur.' }, { status: 503 });
  if (!user) return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  const { data, error } = await supabase.from('portfolio_state').select('state, updated_at').eq('user_id', user.id).maybeSingle();
  if (error) return Response.json({ error: 'Lecture du portefeuille impossible. Vérifiez la configuration de la base de données.' }, { status: 503 });
  return Response.json({
    user: { id: user.id, email: user.email || '', name: typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : undefined },
    state: data?.state ?? null,
    updatedAt: data?.updated_at ?? null,
  }, { headers: noStore });
}

export async function PUT(request: Request) {
  const { supabase, user } = await authenticatedClient();
  if (!supabase) return Response.json({ error: 'Supabase doit être configuré sur le serveur.' }, { status: 503 });
  if (!user) return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  let body: { state?: unknown; userId?: unknown };
  try {
    const text = await request.text();
    // Below Vercel's function request limit (4.5 MB), measured in UTF-8 bytes.
    if (new TextEncoder().encode(text).byteLength > 4_000_000) return Response.json({ error: 'Portefeuille trop volumineux (maximum 4 Mo).' }, { status: 413 });
    body = JSON.parse(text);
  } catch { return Response.json({ error: 'Requête JSON invalide.' }, { status: 400 }); }
  if (!body || !validPortfolio(body.state)) return Response.json({ error: 'Portefeuille invalide.' }, { status: 400 });
  if (body.userId !== user.id) return Response.json({ error: 'Le compte connecté a changé. Rechargez la page avant de modifier le portefeuille.' }, { status: 409 });
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('portfolio_state').upsert({ user_id: user.id, state: body.state, updated_at: updatedAt }, { onConflict: 'user_id' });
  if (error) return Response.json({ error: 'Sauvegarde impossible. Réessayez ou vérifiez la configuration de la base de données.' }, { status: 503 });
  return Response.json({ ok: true, updatedAt }, { headers: noStore });
}
