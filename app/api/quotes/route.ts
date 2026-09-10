import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function identity() {
  const requestHeaders = await headers();
  const id = requestHeaders.get('oai-authenticated-user-id');
  if (!id && process.env.NODE_ENV === 'production') return null;
  return id || 'local-preview';
}

export async function GET(request: Request) {
  if (!(await identity())) return Response.json({ error: 'Sign-in required' }, { status: 401 });
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return Response.json({ error: 'Alpha Vantage n’est pas configuré.' }, { status: 503 });
  const url = new URL(request.url);
  const symbols = [...new Set((url.searchParams.get('symbols') || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 25);
  if (!symbols.length) return Response.json({ quotes: {}, source: 'alpha-vantage' });
  const quotes: Record<string, { price: number; asOf: string }> = {};
  for (const symbol of symbols) {
    const api = new URL('https://www.alphavantage.co/query');
    api.searchParams.set('function', 'GLOBAL_QUOTE');
    api.searchParams.set('symbol', symbol);
    api.searchParams.set('apikey', key);
    const response = await fetch(api, { cache: 'no-store' });
    if (!response.ok) continue;
    const payload = await response.json() as { 'Global Quote'?: Record<string, string> };
    const quote = payload['Global Quote'];
    const price = Number(quote?.['05. price']);
    const asOf = quote?.['07. latest trading day'];
    if (Number.isFinite(price) && price >= 0) quotes[symbol] = { price, asOf: /^\d{4}-\d{2}-\d{2}$/.test(asOf || '') ? asOf! : new Date().toISOString().slice(0, 10) };
  }
  return Response.json({ quotes, source: 'alpha-vantage', updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
}
