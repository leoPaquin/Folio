import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + '.ts', context);
    throw error;
  }
} });
const { EMPTY_PORTFOLIO, validPortfolio } = await import('../lib/portfolio.ts');
assert.equal(validPortfolio(structuredClone(EMPTY_PORTFOLIO)), true);
for (const value of [null, undefined, true, 123, 'portfolio', [], {}, { ...EMPTY_PORTFOLIO, version: 1 }]) {
  assert.equal(validPortfolio(value), false);
}
for (const field of ['accounts', 'positions', 'imports', 'snapshots']) {
  for (const invalid of [null, {}, [null], [123], [{}]]) {
    assert.equal(validPortfolio({ ...EMPTY_PORTFOLIO, [field]: invalid }), false, field);
  }
}
const account = { id: 'a', name: 'CELI', provider: 'Wealthsimple', currency: 'CAD' };
const position = { id: 'p', accountId: 'a', symbol: 'TEST', name: 'Validation fixture', kind: 'Action', quantity: 1, cost: 10, price: 12, currency: 'CAD' };
const portfolio = { ...EMPTY_PORTFOLIO, accounts: [account], positions: [position] };
assert.equal(validPortfolio(portfolio), true);
assert.equal(validPortfolio({ ...portfolio, accounts: [account, account] }), false);
assert.equal(validPortfolio({ ...portfolio, positions: [position, { ...position, id: 'p2' }] }), false);
assert.equal(validPortfolio({ ...portfolio, positions: [{ ...position, accountId: 'another-account' }] }), false);
for (const invalid of [{ kind: { toString: null } }, { asOf: { toString: null } }, { quantity: -1 }, { market: null }]) {
  assert.equal(validPortfolio({ ...portfolio, positions: [{ ...position, ...invalid }] }), false);
}
assert.equal(validPortfolio({ ...portfolio, imports: [{ name: 'Import', source: 'CSV', count: 1, date: { toString: null } }] }), false);
assert.equal(validPortfolio({ ...portfolio, snapshots: [{ date: { toString: null }, value: 12, cost: 10 }] }), false);
console.log('Portfolio validation: valid data accepted; malformed, duplicate and orphaned data rejected.');
