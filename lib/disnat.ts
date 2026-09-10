import type { Account, Currency, Position } from './portfolio';

export type Statement = { accounts: Account[]; positions: Position[]; usdCad: number; asOf: string; total: number; warnings: string[] };
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u00a0\u202f]/g, ' ');
const numeric = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.'));
const amounts = (s: string) => [...s.matchAll(/\d[\d ]*,\d{2}/g)].map(m => numeric(m[0]));

export function parseDisnatPages(pages: string[]): Statement {
  const text = normalized(pages.join('\n'));
  if (!/disnat|Desjardins Courtage/i.test(text) || !/Releve de portefeuille/i.test(text)) throw Error('Ce PDF n’est pas un relevé de portefeuille Disnat reconnu.');
  const rateMatch = text.match(/1[,.]00\s*USD\s*=\s*([\d,.]+)\s*CAD/i);
  const rate = rateMatch ? numeric(rateMatch[1]) : NaN;
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) throw Error('Le taux USD/CAD du relevé est introuvable.');
  const dateMatch = text.match(/Au\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i);
  const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  const month = dateMatch ? months.indexOf(dateMatch[2].toLowerCase()) + 1 : 0;
  if (!dateMatch || !month) throw Error('La date du relevé est introuvable.');
  const asOf = dateMatch[3] + '-' + String(month).padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0');
  const accounts: Account[] = [], positions: Position[] = [], warnings: string[] = [];
  const expected = new Map<string, number>();
  let account: Account | undefined, inAssets = false, expectedPortfolio: number | undefined;
  const moneyPattern = '([\\d ]+,\\d{2})';
  const rowPattern = new RegExp('^(.+?)\\s+([A-Z][A-Z0-9.\\-]{0,15})\\s+([\\d ]+(?:,\\d+)?)\\s+([\\d ]+,\\d{4})\\s+' + moneyPattern + '\\s+([\\d ]+,\\d{4})\\s*(\\*)?\\s*(USD|CAD)?\\s*' + moneyPattern + '\\s+([\\d ]+,\\d{2})\\s+.*[ABCD]\\s*$');
  for (const page of pages) {
    for (const raw of normalized(page).split(/\r?\n/)) {
      const line = raw.replace(/\s+/g, ' ').trim();
      if (!line) continue;
      if (/^Total de votre portefeuille/i.test(line)) { const values = amounts(line); if (values.length >= 4) expectedPortfolio = values[3]; }
      const profile = line.match(/Profil de votre compte (.+?)\s*-\s*([A-Z0-9]+)\s*$/i);
      if (profile) {
        const currency: Currency = /USD/i.test(profile[1]) ? 'USD' : 'CAD';
        const reference = profile[2];
        account = accounts.find(a => a.reference === reference);
        if (!account) { account = { id: 'disnat-' + reference, reference, provider: 'Disnat', currency, name: /CELIAPP/i.test(profile[1]) ? 'CELIAPP' : /CELI/i.test(profile[1]) ? 'CELI' : /REER/i.test(profile[1]) ? 'REER' : 'Comptant ' + currency }; accounts.push(account); }
        inAssets = false;
      }
      if (/^Details de vos actifs/i.test(line)) { inAssets = true; continue; }
      if (/^Valeur totale de votre compte/i.test(line) && account) {
        const values = amounts(line); if (values.length >= 3) expected.set(account.id, values.at(-2)!);
        inAssets = false; continue;
      }
      if (!inAssets || !account) continue;
      if (/^ENCAISSE\s/i.test(line)) {
        const values = amounts(line), balance = values[0];
        if (balance > 0) positions.push({ id: crypto.randomUUID(), accountId: account.id, symbol: account.currency, name: 'Encaisse', kind: 'Liquidités', quantity: balance, cost: 1, price: 1, currency: account.currency, costCurrency: account.currency, valuationCurrency: account.currency, bookValue: balance, marketValue: balance, asOf });
        continue;
      }
      const row = line.match(rowPattern);
      if (!row) continue;
      const [, name, symbol, quantityRaw, costRaw, bookRaw, priceRaw, uncertain, quoteCurrency, marketRaw] = row;
      const quantity = numeric(quantityRaw), cost = numeric(costRaw), bookValue = numeric(bookRaw), price = numeric(priceRaw), marketValue = numeric(marketRaw);
      if (![quantity, cost, bookValue, price, marketValue].every(Number.isFinite) || quantity <= 0 || [cost, bookValue, price, marketValue].some(v => v < 0)) throw Error('La position ' + symbol + ' contient des montants non reconnus.');
      positions.push({ id: crypto.randomUUID(), accountId: account.id, symbol, name, kind: /ETF|FNB|ISHARES|VANGUARD/i.test(name) ? 'FNB' : 'Action', quantity, cost, price, currency: (quoteCurrency || account.currency) as Currency, costCurrency: account.currency, valuationCurrency: account.currency, bookValue, marketValue, asOf, priceUncertain: !!uncertain });
      if (uncertain) warnings.push(symbol + ' : prix signalé comme incertain dans le relevé.');
    }
  }
  if (!positions.length || !accounts.length) throw Error('Aucune position lisible. Les PDF numérisés et les formats différents ne sont pas encore pris en charge.');
  if (new Set(positions.map(p => [p.accountId, p.symbol, p.currency].join('|'))).size !== positions.length) throw Error('Le relevé contient des positions répétées. Import interrompu pour éviter les doublons.');
  for (const a of accounts) {
    const sum = positions.filter(p => p.accountId === a.id).reduce((v, p) => v + (p.marketValue || 0), 0), target = expected.get(a.id);
    if (target === undefined || Math.abs(sum - target) > 0.03) throw Error('Le total extrait du compte ' + a.name + ' ne correspond pas au relevé. Aucune donnée n’a été importée.');
  }
  const total = accounts.reduce((sum, a) => sum + expected.get(a.id)! * (a.currency === 'USD' ? rate : 1), 0);
  if (expectedPortfolio === undefined || Math.abs(total - expectedPortfolio) > 0.05) throw Error('Le total du portefeuille n’a pas pu être rapproché du relevé. Aucune donnée n’a été importée.');
  return { accounts, positions, usdCad: rate, asOf, total, warnings };
}

export async function readDisnatPdf(file: File, workerSrc = '/pdf.worker.min.mjs'): Promise<Statement> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  try {
    if (doc.numPages > 100) throw Error('Le PDF dépasse la limite de 100 pages.');
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n), content = await page.getTextContent();
      const lines: { y: number; items: { x: number; text: string }[] }[] = [];
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = item.transform[5];
        let line = lines.find(l => Math.abs(l.y - y) < 2);
        if (!line) { line = { y, items: [] }; lines.push(line); }
        line.items.push({ x: item.transform[4], text: item.str });
      }
      pages.push(lines.sort((a, b) => b.y - a.y).map(l => l.items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ')).join('\n'));
    }
    return parseDisnatPages(pages);
  } finally { await task.destroy(); }
}
