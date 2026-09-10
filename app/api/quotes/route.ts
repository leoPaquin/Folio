import { headers } from 'next/headers';
import { validQuoteRequest } from '../../../lib/market';
import { getMarketQuotes } from '../../../lib/market-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestHeaders = await headers();
  if (!requestHeaders.get('oai-authenticated-user-id') && process.env.NODE_ENV === 'production') return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 20_000) return Response.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
    const body = JSON.parse(text);
    if (!Array.isArray(body.assets) || body.assets.length < 1 || body.assets.length > 50 || !body.assets.every(validQuoteRequest)) return Response.json({ error: 'Envoyez de 1 à 50 symboles valides avec leur devise.' }, { status: 400 });
    return Response.json(await getMarketQuotes(body.assets), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Requête invalide ou service de cours indisponible.' }, { status: 400 });
  }
}
