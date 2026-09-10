import Papa from 'papaparse';
import { normalizeProvider } from './providers';
import { COLORS, uid, validPosition, type Account, type Portfolio, type Position, type Currency, type AssetKind } from './portfolio';

export function download(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportPositions(state: Portfolio, positions = state.positions) {
  const rows = positions.map(p => ({ Symbole: p.symbol, Nom: p.name, Catégorie: p.kind, Établissement: state.accounts.find(a => a.id === p.accountId)?.provider, Compte: state.accounts.find(a => a.id === p.accountId)?.name, Quantité: p.quantity, 'Coût unitaire': p.cost, 'Prix unitaire': p.price, Devise: p.currency, 'Devise du coût': p.costCurrency || p.currency, 'Valeur comptable': p.bookValue ?? '', 'Valeur marchande': p.marketValue ?? '', 'Devise des valeurs': p.valuationCurrency ?? '', Date: p.asOf || '' }));
  download('folio-placements.csv', '\ufeff' + Papa.unparse(rows, { escapeFormulae: true }));
}
export function downloadTemplate() { download('folio-modele.csv', '\ufeffSymbole,Nom,Catégorie,Établissement,Compte,Quantité,Coût unitaire,Prix unitaire,Devise\r\n'); }
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const ALIASES: Record<string, string[]> = { symbol: ['symbole', 'symbol', 'ticker'], name: ['nom', 'name', 'description'], kind: ['categorie', 'category', 'type'], quantity: ['quantite', 'quantity', 'qty', 'shares', 'units', 'numberofshares', 'balance'], cost: ['coutunitaire', 'coutmoyen', 'averagecost', 'averageprice', 'avgcost', 'averagecostpershare', 'bookcostpershare', 'unitcost'], price: ['prixunitaire', 'prix', 'price', 'marketprice', 'currentprice', 'lastprice'], currency: ['devise', 'currency'], account: ['compte', 'account', 'accountname', 'accountnumber', 'numerodecompte', 'accounttype'], provider: ['etablissement', 'provider', 'source', 'institution', 'broker', 'brokerage'], costCurrency: ['deviseducout', 'costcurrency'], bookValue: ['valeurcomptable', 'bookvalue'], marketValue: ['valeurmarchande', 'marketvalue'], valuationCurrency: ['devisedesvaleurs', 'valuationcurrency'], asOf: ['date', 'asof'] };
export const LABELS: Record<string, string> = { symbol: 'Symbole *', quantity: 'Quantité *', cost: 'Coût unitaire *', price: 'Prix unitaire *', name: 'Nom', kind: 'Catégorie', currency: 'Devise du prix', account: 'Compte', provider: 'Établissement', costCurrency: 'Devise du coût', bookValue: 'Valeur comptable totale', marketValue: 'Valeur marchande totale', valuationCurrency: 'Devise des valeurs totales', asOf: 'Date de valorisation' };
export function parseNumber(raw: string) {
  let s = raw.trim().replace(/[\s\u00a0\u202f$]/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s) ? Number(s) : NaN;
}
export type CsvData = { headers: string[]; rows: Record<string, string>[] };
export function readCsv(raw: string): CsvData {
  const result = Papa.parse<Record<string, string>>(raw, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() });
  if (result.errors.length) throw Error('CSV invalide : ' + result.errors[0].message);
  if (!result.data.length || result.data.length > 10000) throw Error('Le fichier doit contenir entre 1 et 10 000 positions.');
  const headers = result.meta.fields || [];
  if (headers.some(h => ['incurrency', 'outcurrency', 'transactionid', 'txid', 'transactiontype', 'activitytype', 'typedetransaction', 'typedactivite', 'action', 'buyorsell'].includes(normalize(h)))) throw Error('Ce fichier est un historique de transactions. Cet import nécessite des positions consolidées avec quantités et prix.');
  return { rows: result.data, headers };
}
export function mapCsv(data: CsvData, map: Record<string, string>, defaults: { provider: string; account: string; currency: Currency; kind: AssetKind }) {
  const required = ['symbol', 'quantity', 'cost', 'price'];
  if (required.some(k => !map[k])) return { accounts: [], positions: [], errors: ['Associez les quatre colonnes obligatoires (*).'] };
  if (new Set(required.map(k => map[k])).size !== 4) return { accounts: [], positions: [], errors: ['Les champs obligatoires doivent utiliser des colonnes distinctes.'] };
  const accounts: Account[] = [], positions: Position[] = [], errors: string[] = [], keys = new Set<string>();
  for (const [index, raw] of data.rows.entries()) {
    const read = (k: string) => String(raw[map[k]] ?? '').trim();
    const provider = normalizeProvider(read('provider') || defaults.provider), name = read('account') || defaults.account, currency = (read('currency') || defaults.currency).toUpperCase() as Currency;
    const accountCurrency = (read('valuationCurrency') || currency).toUpperCase() as Currency;
    if (!provider || !name || provider.length > 100 || name.length > 100) { errors.push('Ligne ' + (index + 2) + ' : établissement et compte requis (100 caractères maximum).'); continue; }
    let account = accounts.find(a => a.name === name && a.provider === provider && a.currency === accountCurrency);
    if (!account) { account = { id: uid(), name, provider, currency: accountCurrency }; accounts.push(account); }
    const kindAliases: Record<string, AssetKind> = { etf: 'FNB', fnb: 'FNB', action: 'Action', actions: 'Action', stock: 'Action', crypto: 'Crypto', cash: 'Liquidités', liquidites: 'Liquidités', autre: 'Autre' };
    const kindRaw = read('kind') || defaults.kind;
    const p: Position = { id: uid(), accountId: account.id, symbol: read('symbol').toUpperCase(), name: read('name') || read('symbol'), kind: kindAliases[normalize(kindRaw)] || kindRaw as AssetKind, quantity: parseNumber(read('quantity')), cost: parseNumber(read('cost')), price: parseNumber(read('price')), currency, costCurrency: (read('costCurrency') || currency).toUpperCase() as Currency, asOf: read('asOf') || new Date().toISOString().slice(0, 10) };
    if (read('bookValue') || read('marketValue')) {
      if (!read('valuationCurrency')) { errors.push('Ligne ' + (index + 2) + ' : la devise des valeurs totales est obligatoire.'); continue; }
      p.valuationCurrency = read('valuationCurrency').toUpperCase() as Currency;
      if (read('bookValue')) p.bookValue = parseNumber(read('bookValue'));
      if (read('marketValue')) p.marketValue = parseNumber(read('marketValue'));
    }
    if (!validPosition(p) || !Object.hasOwn(COLORS, p.kind)) { errors.push('Ligne ' + (index + 2) + ' : symbole, quantité, prix, catégorie, date ou devise invalide.'); continue; }
    const key = [provider, name, accountCurrency, currency, p.symbol].join('|');
    if (keys.has(key)) { errors.push('Ligne ' + (index + 2) + ' : position répétée pour ' + p.symbol + '. Consolidez les lots avant import.'); continue; }
    keys.add(key); positions.push(p);
  }
  return { accounts, positions, errors };
}
