import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) { if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + '.ts', context); throw error; }
}});
const { EMPTY_PORTFOLIO, positionCost, positionValue, validPortfolio } = await import('../lib/portfolio.ts');
const { quoteRequest, suggestedLookup, validQuoteRequest, usableQuote, applyMarketQuotes } = await import('../lib/market.ts');
const { getMarketQuotes } = await import('../lib/market-server.ts');
const now = Date.now(), stamp = Math.floor(now / 1000), date = new Date(now).toISOString();
const p = { id: 'position', accountId: 'account', symbol: 'VFV', name: 'Test ETF', kind: 'FNB', quantity: 10, cost: 90, price: 100, currency: 'CAD', bookValue: 800, marketValue: 750, valuationCurrency: 'USD' };
const request = quoteRequest(p, 'VFV.TO');
const q = { ...request, price: 150, source: 'Yahoo Finance', name: 'Test ETF', quotedAt: date, fetchedAt: date };
const state = { ...EMPTY_PORTFOLIO, usdCad: 1.4, accounts: [{ id: 'account', name: 'CELI', provider: 'Wealthsimple', currency: 'CAD' }], positions: [p] };
assert(validQuoteRequest(request));
assert(!validQuoteRequest({ ...request, lookup: 'https://untrusted.example' }));
assert(!validQuoteRequest({ ...request, currency: 'EUR' }));
assert(!validQuoteRequest({ ...request, key: 'another' }));
assert.equal(suggestedLookup(p), 'VFV.TO');
assert.equal(suggestedLookup({ ...p, symbol: 'BIP.UN' }), 'BIP-UN.TO');
assert.equal(suggestedLookup({ ...p, symbol: 'ABC.V' }), 'ABC.V');
assert.equal(suggestedLookup({ ...p, symbol: 'BTC', kind: 'Crypto' }), 'bitcoin');
assert.equal(suggestedLookup({ ...p, symbol: 'UNKNOWN', kind: 'Crypto' }), '');
assert(!usableQuote({ ...q, price: 0 }, request, now));
assert(!usableQuote({ ...q, price: NaN }, request, now));
assert(!usableQuote({ ...q, currency: 'USD' }, request, now));
assert(!usableQuote({ ...q, quotedAt: new Date(now - 8 * 86400000).toISOString() }, request, now));
assert(!usableQuote({ ...q, quotedAt: new Date(now + 600000).toISOString() }, request, now));
const applied = applyMarketQuotes(state, [{ before: p, request, quote: q }], now);
assert.equal(applied.updated, 1);
assert(validPortfolio(applied.state));
assert.equal(applied.state.positions[0].quantity, p.quantity);
assert.equal(positionValue(applied.state.positions[0], 1.4), 1500);
assert.equal(positionCost(applied.state.positions[0], 1.4), positionCost(p, 1.4), 'Preserve statement cost in its original currency');
assert.equal(applied.state.positions[0].marketValue, undefined);
assert.equal(applied.state.positions[0].bookValue, 800);
assert.equal(applied.state.positions[0].market.source, 'Yahoo Finance');
const edited = { ...state, positions: [{ ...p, quantity: 20 }] };
assert.equal(applyMarketQuotes(edited, [{ before: p, request, quote: q }], now).updated, 0, 'Do not overwrite an edited holding');
assert.equal(applyMarketQuotes({ ...state, positions: [] }, [{ before: p, request, quote: q }], now).updated, 0);
const futurePosition = { ...p, asOf: new Date(now + 86400000).toISOString().slice(0, 10) };
assert.equal(applyMarketQuotes({ ...state, positions: [futurePosition] }, [{ before: futurePosition, request, quote: q }], now).updated, 0, 'Never replace newer valuations');
const btc = quoteRequest({ ...p, kind: 'Crypto', symbol: 'BTC' }, 'bitcoin');
const eth = quoteRequest({ ...p, kind: 'Crypto', symbol: 'ETH', currency: 'USD' }, 'ethereum');
const wrongCurrency = quoteRequest({ ...p, symbol: 'AAPL' }, 'AAPL');
let calls = 0;
const fixture = async url => {
  calls++;
  if (url.hostname === 'api.coingecko.com') {
    assert.equal(url.searchParams.get('include_last_updated_at'), 'true');
    return Response.json({ bitcoin: { cad: 100000, last_updated_at: stamp }, ethereum: { usd: 2000, last_updated_at: stamp } });
  }
  return Response.json({ chart: { result: [{ meta: { symbol: url.pathname.endsWith('AAPL') ? 'AAPL' : 'VFV.TO', currency: url.pathname.endsWith('AAPL') ? 'USD' : 'CAD', instrumentType: 'ETF', regularMarketPrice: 150, regularMarketTime: stamp, longName: 'Fixture' } }] } });
};
const result = await getMarketQuotes([request, request, btc, eth, wrongCurrency], fixture, now, false);
assert.equal(calls, 3, 'Deduplicate equities and batch crypto IDs');
assert.equal(Object.keys(result.quotes).length, 3);
assert(result.errors[wrongCurrency.key].includes('Devise'));
assert.equal(result.quotes[btc.key].price, 100000);
assert.equal(result.quotes[eth.key].currency, 'USD');
const unavailable = await getMarketQuotes([request, btc], async () => new Response('', { status: 429 }), now, false);
assert.equal(Object.keys(unavailable.quotes).length, 0);
assert.equal(Object.keys(unavailable.errors).length, 2);
const old = await getMarketQuotes([btc], async () => Response.json({ bitcoin: { cad: 100000, last_updated_at: stamp - 3600 } }), now, false);
assert.equal(Object.keys(old.quotes).length, 0);
const empty = await getMarketQuotes([request], async () => Response.json({ chart: { result: [{ meta: { symbol: 'VFV.TO', currency: 'CAD', instrumentType: 'ETF', regularMarketPrice: 150 } }] } }), now, false);
assert.equal(Object.keys(empty.quotes).length, 0, 'Never invent a missing quote timestamp');
console.log('Market data checks passed: source parsing, currencies, timestamps, batching, partial failures, cost preservation and concurrent edits.');
