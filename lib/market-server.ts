import { usableQuote, type MarketQuote, type QuoteRequest, type QuoteResult } from './market';

type Fetcher = typeof fetch;
const cache = new Map<string, { until: number; quote: MarketQuote }>();
async function json<T>(url: URL, fetcher: Fetcher) {
  const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', 'User-Agent': 'Folio/1.0 (https://github.com/leoPaquin/Folio)' } });
  if (!response.ok) throw Error(response.status === 429 ? 'Limite du fournisseur atteinte. Réessayez plus tard.' : 'Le fournisseur de cours est indisponible.');
  return response.json() as Promise<T>;
}
export async function getMarketQuotes(requests: QuoteRequest[], fetcher: Fetcher = fetch, now = Date.now(), useCache = true): Promise<QuoteResult> {
  const result: QuoteResult = { quotes: {}, errors: {} };
  const pending: QuoteRequest[] = [];
  for (const request of new Map(requests.map(q => [q.key, q])).values()) {
    const found = useCache ? cache.get(request.key) : undefined;
    if (found && found.until > now && usableQuote(found.quote, request, now)) result.quotes[request.key] = found.quote;
    else pending.push(request);
  }
  const save = (request: QuoteRequest, quote: MarketQuote) => {
    if (!usableQuote(quote, request, now)) { result.errors[request.key] = 'Cours absent, ancien ou devise incompatible. Ancien prix conservé.'; return; }
    result.quotes[request.key] = quote;
    if (useCache) { if (cache.size >= 500) cache.delete(cache.keys().next().value!); cache.set(request.key, { quote, until: now + 60_000 }); }
  };
  const cryptos = pending.filter(q => q.kind === 'Crypto');
  const stocks = pending.filter(q => q.kind !== 'Crypto');
  const cryptoTask = async () => {
    if (!cryptos.length) return;
    try {
      const url = new URL('https://api.coingecko.com/api/v3/simple/price');
      url.searchParams.set('ids', [...new Set(cryptos.map(q => q.lookup))].join(','));
      url.searchParams.set('vs_currencies', 'cad,usd');
      url.searchParams.set('include_last_updated_at', 'true');
      const payload = await json<Record<string, Record<string, number>>>(url, fetcher);
      for (const request of cryptos) {
        const coin = payload[request.lookup];
        const stamp = Number(coin?.last_updated_at);
        if (!coin || !Number.isFinite(stamp) || stamp <= 0) { result.errors[request.key] = 'Crypto introuvable : vérifiez son identifiant CoinGecko.'; continue; }
        save(request, { ...request, name: request.lookup, price: Number(coin[request.currency.toLowerCase()]), source: 'CoinGecko', quotedAt: new Date(stamp * 1000).toISOString(), fetchedAt: new Date(now).toISOString() });
      }
    } catch (error) { for (const request of cryptos) result.errors[request.key] = error instanceof Error ? error.message : 'Cours crypto indisponibles.'; }
  };
  let cursor = 0;
  const worker = async () => {
    while (cursor < stocks.length) {
      const request = stocks[cursor++];
      try {
        const url = new URL('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(request.lookup));
        url.searchParams.set('interval', '1d'); url.searchParams.set('range', '1d');
        const payload = await json<{ chart?: { result?: { meta?: { symbol?: string; currency?: string; instrumentType?: string; regularMarketTime?: number; regularMarketPrice?: number; longName?: string; shortName?: string } }[] } }>(url, fetcher);
        const meta = payload.chart?.result?.[0]?.meta;
        if (!meta || meta.symbol?.toUpperCase() !== request.lookup || !['EQUITY', 'ETF'].includes(meta.instrumentType || '')) throw Error('Titre introuvable : vérifiez le symbole et la bourse.');
        if (meta.currency !== request.currency) throw Error('Devise reçue : ' + String(meta.currency) + '. Le placement attend ' + request.currency + '; ancien prix conservé.');
        const stamp = Number(meta.regularMarketTime);
        if (!Number.isFinite(stamp) || stamp <= 0) throw Error('Date du cours absente; ancien prix conservé.');
        save(request, { ...request, price: Number(meta.regularMarketPrice), source: 'Yahoo Finance', name: String(meta.longName || meta.shortName || request.lookup).slice(0, 200), quotedAt: new Date(stamp * 1000).toISOString(), fetchedAt: new Date(now).toISOString() });
      } catch (error) { result.errors[request.key] = error instanceof Error ? error.message : 'Cours indisponible.'; }
    }
  };
  await Promise.all([cryptoTask(), ...Array.from({ length: Math.min(stocks.length, 6) }, worker)]);
  return result;
}
