import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDisnatPages, readDisnatPdf } from '../lib/disnat.ts';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + '.ts', context);
    throw error;
  }
}});
const { EMPTY_PORTFOLIO, mergeImport, totals, validPortfolio } = await import('../lib/portfolio.ts');

const file = process.argv[2];
if (!file) throw Error('Pass a local PDF path.');
const output = execFileSync('python', ['-c', 'import json,sys; from pypdf import PdfReader; print(json.dumps([p.extract_text() for p in PdfReader(sys.argv[1]).pages]))', file], { encoding: 'utf8' });
const pages = JSON.parse(output);
const result = parseDisnatPages(pages);
assert(result.accounts.length > 0);
assert(result.positions.length > 0);
assert.throws(() => parseDisnatPages(pages.map(p => p.replace(/BANQUE DE NOUVELLE-ECOSSE BNS[^\n]+/g, ''))), /total/);
assert.throws(() => parseDisnatPages(['A different document']), /relevé/);
const browserParserResult = await readDisnatPdf(new File([readFileSync(file)], 'statement.pdf'), pathToFileURL(resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs')).href);
assert.equal(browserParserResult.positions.length, result.positions.length);
assert.equal(browserParserResult.accounts.length, result.accounts.length);
assert(Math.abs(browserParserResult.total - result.total) < .01);
const imported = mergeImport(EMPTY_PORTFOLIO, result.accounts, result.positions, true, result.usdCad);
assert(validPortfolio(imported));
assert(Math.abs(totals(imported).value - result.total) < .01);
const replay = mergeImport(imported, browserParserResult.accounts, browserParserResult.positions, true, result.usdCad);
assert.equal(replay.positions.length, imported.positions.length);
assert.equal(replay.accounts.length, imported.accounts.length);
const lastAccount = result.accounts.at(-1);
const preCreated = { ...EMPTY_PORTFOLIO, accounts: [{ ...lastAccount, id: 'manual-account', reference: undefined }] };
const attached = mergeImport(preCreated, result.accounts, result.positions, true, result.usdCad);
assert.equal(attached.accounts.length, result.accounts.length);
assert(attached.positions.some(p => p.accountId === 'manual-account'));
console.log(JSON.stringify({ accounts: result.accounts.length, positions: result.positions.length, date: result.asOf, reconciliation: 'passed', pdfjsMatchesPypdf: true, replayIdempotent: true, existingAccountReused: true, incompleteStatementRejected: true, unknownFormatRejected: true }));
