import { normalizeProvider } from './providers';

export type AssetKind = 'FNB' | 'Action' | 'Crypto' | 'Liquidités' | 'Autre';
export type Currency = 'CAD' | 'USD';
export type Account = { id: string; name: string; provider: string; currency: Currency; reference?: string };
export type Position = {
  id: string; accountId: string; symbol: string; name: string; kind: AssetKind;
  quantity: number; cost: number; price: number; currency: Currency;
  costCurrency?: Currency; valuationCurrency?: Currency; bookValue?: number;
  marketValue?: number; asOf?: string; priceUncertain?: boolean;
};
export type ImportRecord = { id: string; name: string; source: string; date: string; count: number; asOf?: string };
export type Snapshot = { date: string; value: number; cost: number };
export type Portfolio = { version: 2; accounts: Account[]; positions: Position[]; imports: ImportRecord[]; snapshots: Snapshot[]; usdCad: number };
export const EMPTY_PORTFOLIO: Portfolio = { version: 2, accounts: [], positions: [], imports: [], snapshots: [], usdCad: 1 };
export const COLORS: Record<AssetKind, string> = { FNB: '#42775a', Action: '#9caf8c', Crypto: '#a99ac4', Liquidités: '#d6c89b', Autre: '#a5afb1' };
export const uid = () => crypto.randomUUID();
export const money = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(n);
export const displayMoney = (cadValue: number, currency: Currency, usdCad: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency, maximumFractionDigits: 2 }).format(currency === 'USD' ? cadValue / usdCad : cadValue);
export const number = (n: number) => new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 8 }).format(n);
export const percent = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'percent', maximumFractionDigits: 1 }).format(n);
export const fx = (currency: Currency, rate: number) => currency === 'USD' ? rate : 1;
export const positionValue = (p: Position, rate: number) => p.marketValue !== undefined ? p.marketValue * fx(p.valuationCurrency || p.currency, rate) : p.quantity * p.price * fx(p.currency, rate);
export const positionCost = (p: Position, rate: number) => p.bookValue !== undefined ? p.bookValue * fx(p.valuationCurrency || p.costCurrency || p.currency, rate) : p.quantity * p.cost * fx(p.costCurrency || p.currency, rate);
export function totals(state: Portfolio, positions = state.positions) {
  return positions.reduce((a, p) => ({ value: a.value + positionValue(p, state.usdCad), cost: a.cost + positionCost(p, state.usdCad) }), { value: 0, cost: 0 });
}
export const positionKey = (p: Position) => [p.accountId, p.symbol.toUpperCase(), p.currency].join('|');
export const accountKey = (a: Account) => [normalizeProvider(a.provider).toLowerCase(), a.reference || a.name.toLowerCase(), a.currency].join('|');
export function validPosition(p: Position) {
  return p && ['id', 'accountId', 'symbol', 'name'].every(k => typeof p[k as keyof Position] === 'string' && String(p[k as keyof Position]).length > 0 && String(p[k as keyof Position]).length <= 200)
    && Object.hasOwn(COLORS, p.kind) && ['CAD', 'USD'].includes(p.currency)
    && [p.costCurrency, p.valuationCurrency].every(c => c === undefined || ['CAD', 'USD'].includes(c))
    && ['quantity', 'cost', 'price'].every(k => Number.isFinite(p[k as keyof Position]) && Number(p[k as keyof Position]) >= 0 && Number(p[k as keyof Position]) <= 1e12)
    && p.quantity > 0 && [p.bookValue, p.marketValue].every(v => v === undefined || Number.isFinite(v) && v >= 0)
    && (!p.asOf || /^\d{4}-\d{2}-\d{2}$/.test(p.asOf));
}
export function validPortfolio(s: Portfolio): boolean {
  if (!s || s.version !== 2 || !Array.isArray(s.accounts) || !Array.isArray(s.positions) || !Array.isArray(s.imports) || !Array.isArray(s.snapshots) || s.positions.length > 10000 || !Number.isFinite(s.usdCad) || s.usdCad <= 0 || s.usdCad > 100) return false;
  if (!s.accounts.every(a => a && ['id', 'name', 'provider'].every(k => typeof a[k as keyof Account] === 'string' && String(a[k as keyof Account]).length > 0 && String(a[k as keyof Account]).length <= 200) && ['CAD', 'USD'].includes(a.currency))) return false;
  const ids = new Set(s.accounts.map(a => a.id));
  return ids.size === s.accounts.length && s.positions.every(p => validPosition(p) && ids.has(p.accountId)) && new Set(s.positions.map(positionKey)).size === s.positions.length
    && s.imports.every(i => typeof i.name === 'string' && typeof i.source === 'string' && Number.isFinite(i.count) && !Number.isNaN(Date.parse(i.date)))
    && s.snapshots.every(i => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && Number.isFinite(i.value) && Number.isFinite(i.cost));
}
export function withSnapshot(state: Portfolio): Portfolio {
  const date = new Date().toISOString().slice(0, 10);
  return { ...state, snapshots: [...state.snapshots.filter(s => s.date !== date), { date, ...totals(state) }].slice(-730) };
}
export function mergeImport(state: Portfolio, accounts: Account[], positions: Position[], replaceAccounts: boolean, rate?: number): Portfolio {
  const nextAccounts = [...state.accounts], mapping = new Map<string, string>();
  for (const incoming of accounts) {
    let existing = nextAccounts.find(a => accountKey(a) === accountKey(incoming));
    if (!existing) {
      const candidates = nextAccounts.filter(a => normalizeProvider(a.provider).toLowerCase() === normalizeProvider(incoming.provider).toLowerCase() && a.name.toLowerCase() === incoming.name.toLowerCase() && a.currency === incoming.currency && (!a.reference || !incoming.reference));
      if (candidates.length === 1) {
        existing = candidates[0];
        if (incoming.reference && !existing.reference) { existing = { ...existing, reference: incoming.reference }; nextAccounts[nextAccounts.findIndex(a => a.id === existing!.id)] = existing; }
      }
    }
    mapping.set(incoming.id, existing?.id || incoming.id);
    if (!existing) nextAccounts.push(incoming);
  }
  const imported = positions.map(p => ({ ...p, accountId: mapping.get(p.accountId) || p.accountId }));
  const affected = new Set(mapping.values());
  const entries = new Map(state.positions.filter(p => !replaceAccounts || !affected.has(p.accountId)).map(p => [positionKey(p), p]));
  for (const p of imported) entries.set(positionKey(p), { ...p, id: entries.get(positionKey(p))?.id || p.id });
  return withSnapshot({ ...state, accounts: nextAccounts, positions: [...entries.values()], usdCad: rate || state.usdCad });
}
