import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Match the app bundler's extensionless local TypeScript imports without new dependencies.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + '.ts', context);
    throw error;
  }
}});
const { PROVIDERS, findProvider, searchProviders, normalizeProvider, importAccountUrl } = await import('../lib/providers.ts');
const { ALIASES, normalize, readCsv, mapCsv } = await import('../lib/csv.ts');
const { EMPTY_PORTFOLIO, mergeImport, totals, validPortfolio } = await import('../lib/portfolio.ts');
const mapping = data => Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => [key, data.headers.find(h => aliases.includes(normalize(h))) || '']));
const parse = (text, provider = 'Wealthsimple', account = 'CELI') => {
  const data = readCsv(text);
  return mapCsv(data, mapping(data), { provider, account, currency: 'CAD', kind: 'FNB' });
};
const csv = 'Symbol,Quantity,Average Cost,Market Price,Currency\nTEST,10,20,25,CAD';
for (const provider of PROVIDERS) {
  const result = parse(csv, provider.name);
  assert.deepEqual(result.errors, [], provider.name);
  const state = mergeImport(EMPTY_PORTFOLIO, result.accounts, result.positions, false);
  assert(validPortfolio(state), provider.name);
  assert.equal(state.accounts[0].provider, provider.name);
  assert.equal(totals(state).value, 250);
  const repeat = parse(csv, provider.name);
  const replay = mergeImport(state, repeat.accounts, repeat.positions, false);
  assert.equal(replay.accounts.length, 1);
  assert.equal(replay.positions.length, 1);
}
assert.equal(normalizeProvider('RBC Direct Investing'), 'RBC Placements en Direct');
assert.equal(findProvider('desjardins courtage en ligne').name, 'Disnat');
assert.equal(findProvider('IBKR').name, 'Interactive Brokers');
assert(searchProviders('bmo').length >= 3);
assert(searchProviders('nationale').length >= 2);
assert(searchProviders('', 'Crypto et portefeuilles').every(p => p.group === 'Crypto et portefeuilles'));
assert.equal(normalizeProvider(' Ma caisse locale '), 'Ma caisse locale');
assert.equal(importAccountUrl('compte & 1'), '/importations?compte=compte%20%26%201');
const custom = parse(csv, 'Ma caisse locale');
assert.equal(custom.accounts[0].provider, 'Ma caisse locale');
const incoming = parse(csv, 'RBC Direct Investing');
const existing = { ...EMPTY_PORTFOLIO, accounts: [{ id: 'existing', name: 'CELI', provider: 'RBC Direct Investing', currency: 'CAD' }] };
const attached = mergeImport(existing, incoming.accounts, incoming.positions, false);
assert.equal(attached.accounts.length, 1);
assert.equal(attached.positions[0].accountId, 'existing');
const both = parse('Symbol,Quantity,Average Cost,Market Price,Currency,Institution,Account\nTEST,10,20,25,CAD,Wealthsimple,CELI\nTEST,3,20,25,CAD,BMO InvestorLine,CELI');
assert.equal(both.accounts.length, 2);
assert.equal(both.positions.length, 2);
assert(validPortfolio(mergeImport(EMPTY_PORTFOLIO, both.accounts, both.positions, false)));
const usd = parse('Symbol,Quantity,Average Cost,Market Price,Currency,Cost Currency\nTEST,2,10,15,usd,usd');
assert.deepEqual(usd.errors, []);
assert.equal(totals(mergeImport(EMPTY_PORTFOLIO, usd.accounts, usd.positions, false, 1.4)).value, 42);
assert(parse(csv, 'BMO InvestorLine', '').errors.length > 0, 'Require a named account');
assert(parse(csv.replace('10,20', '-10,20')).errors.length > 0, 'Reject invalid quantities');
assert(parse(csv + '\nTEST,10,20,25,CAD').errors.length > 0, 'Reject duplicate positions');
assert(parse(csv.replace('Average Cost', 'Cost')).errors.length > 0, 'Do not infer total cost as unit cost');
assert.throws(() => readCsv('Transaction Type,Symbol,Quantity,Price\nBUY,TEST,1,20'), /historique/);
assert.throws(() => readCsv('Activity Type,Symbol,Quantity,Price\nBuy,TEST,1,20'), /historique/);
console.log(JSON.stringify({ platforms: PROVIDERS.length - 1, csvImports: 'passed', customProviders: 'passed', existingAccounts: 'passed', replayIdempotent: 'passed', invalidInputs: 'rejected' }));
