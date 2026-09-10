import { withSnapshot } from './portfolio';
import type { Currency, Portfolio, Position } from './portfolio';

export type QuoteRequest = { key: string; lookup: string; kind: 'Action' | 'FNB' | 'Crypto'; currency: Currency };
export type MarketQuote = { key: string; lookup: string; price: number; currency: Currency; name: string; source: 'Yahoo Finance' | 'CoinGecko'; quotedAt: string; fetchedAt: string };
export type QuoteResult = { quotes: Record<string, MarketQuote>; errors: Record<string, string> };
export const CRYPTO_IDS: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', LTC: 'litecoin', BCH: 'bitcoin-cash', AVAX: 'avalanche-2', LINK: 'chainlink', XLM: 'stellar', USDC: 'usd-coin', USDT: 'tether', SHIB: 'shiba-inu', UNI: 'uniswap', ATOM: 'cosmos', BNB: 'binancecoin' };
export const canQuote = (p: Position) => ['Action', 'FNB', 'Crypto'].includes(p.kind);
export function suggestedLookup(p: Position) {
  if (p.market?.lookup) return p.market.lookup;
  if (p.kind === 'Crypto') return CRYPTO_IDS[p.symbol.toUpperCase()] || '';
  const symbol = p.symbol.toUpperCase();
  if (/\.(TO|V|CN|NE)$/.test(symbol)) return symbol;
  return p.currency === 'CAD' ? symbol.replace(/\./g, '-') + '.TO' : symbol.replace(/\./g, '-');
}
export function quoteRequest(p: Position, lookup: string): QuoteRequest {
  const normalized = p.kind === 'Crypto' ? lookup.trim().toLowerCase() : lookup.trim().toUpperCase();
  return { key: [p.kind, normalized, p.currency].join(':'), lookup: normalized, kind: p.kind as QuoteRequest['kind'], currency: p.currency };
}
export function validQuoteRequest(value: unknown): value is QuoteRequest {
  if (!value || typeof value !== 'object') return false;
  const q = value as QuoteRequest;
  return ['Action', 'FNB', 'Crypto'].includes(q.kind) && ['CAD', 'USD'].includes(q.currency)
    && typeof q.lookup === 'string' && (q.kind === 'Crypto' ? /^[a-z0-9][a-z0-9-]{0,79}$/ : /^[A-Z0-9][A-Z0-9.^=-]{0,29}$/).test(q.lookup)
    && q.key === [q.kind, q.lookup, q.currency].join(':');
}
export function usableQuote(q: MarketQuote | undefined, request: QuoteRequest, now = Date.now()): q is MarketQuote {
  if (!q || q.key !== request.key || q.lookup !== request.lookup || q.currency !== request.currency
    || q.source !== (request.kind === 'Crypto' ? 'CoinGecko' : 'Yahoo Finance')
    || typeof q.quotedAt !== 'string' || typeof q.fetchedAt !== 'string' || typeof q.name !== 'string'
    || !Number.isFinite(q.price) || q.price <= 0 || q.price > 1e12) return false;
  const at = Date.parse(q.quotedAt), fetched = Date.parse(q.fetchedAt);
  const maxAge = request.kind === 'Crypto' ? 15 * 60_000 : 7 * 24 * 60 * 60_000;
  return Number.isFinite(at) && at <= now + 300_000 && now - at <= maxAge && Number.isFinite(fetched) && fetched <= now + 300_000;
}
export function applyMarketQuotes(state: Portfolio, updates: { before: Position; request: QuoteRequest; quote: MarketQuote }[], now = Date.now()) {
  let updated = 0;
  const byId = new Map(updates.map(item => [item.before.id, item]));
  const positions = state.positions.map(p => {
    const item = byId.get(p.id);
    // A changed or deleted position must never be overwritten by an in-flight quote.
    if (!item || JSON.stringify(p) !== JSON.stringify(item.before) || !canQuote(p)
      || item.request.kind !== p.kind || item.request.currency !== p.currency || !usableQuote(item.quote, item.request, now)) return p;
    const day = item.quote.quotedAt.slice(0, 10);
    if (p.asOf && day < p.asOf || p.market && Date.parse(item.quote.quotedAt) < Date.parse(p.market.quotedAt)) return p;
    updated++;
    // Recalculate market value from the live unit price. Retain statement book value
    // and its original valuation currency so refreshing never changes the cost basis.
    return { ...p, price: item.quote.price, marketValue: undefined, asOf: day, priceUncertain: false,
      market: { lookup: item.quote.lookup, source: item.quote.source, quotedAt: item.quote.quotedAt, fetchedAt: item.quote.fetchedAt } };
  });
  if (!updated) return { state, updated, skipped: updates.length };
  // Record the known before/after valuations at the actual refresh time when
  // starting history. Do not backdate a baseline or reconstruct past prices.
  const baseline = state.snapshots.length ? state : withSnapshot(state, new Date(now));
  const next = withSnapshot({ ...baseline, positions }, new Date(now));
  return { state: next, updated, skipped: updates.length - updated };
}
