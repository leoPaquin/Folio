'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2, CloudUpload, Download, FileCheck2, FileText, Files, LoaderCircle, Plus, SlidersHorizontal, Upload, X } from 'lucide-react';
import { usePortfolio } from '../../components/portfolio-provider';
import { PageHeading, ProviderIcon } from '../../components/portfolio-ui';
import { PositionEditor } from '../../components/position-editor';
import { ALIASES, LABELS, downloadTemplate, mapCsv, normalize, readCsv, type CsvData } from '../../lib/csv';
import { mergeImport, money, number, positionValue, uid, validPortfolio, type AssetKind, type Currency, type Portfolio } from '../../lib/portfolio';
import { readDisnatPdf, type Statement } from '../../lib/disnat';

export default function ImportationsPage() {
  const { state, commit, notify } = usePortfolio();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [source, setSource] = useState('Disnat'), [accountName, setAccountName] = useState(''), [currency, setCurrency] = useState<Currency>('CAD'), [kind, setKind] = useState<AssetKind>('FNB');
  const [csv, setCsv] = useState<CsvData>(), [mapping, setMapping] = useState<Record<string, string>>({}), [showMapping, setShowMapping] = useState(false), [statement, setStatement] = useState<Statement>(), [backup, setBackup] = useState<Portfolio>();
  const [name, setName] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false), [drag, setDrag] = useState(false), [manual, setManual] = useState(false), [rate, setRate] = useState(state.usdCad === 1 ? '' : String(state.usdCad));
  const mappingComplete = ['symbol', 'quantity', 'cost', 'price'].every(key => !!mapping[key]);
  const mapped = useMemo(() => csv ? mapCsv(csv, mapping, { provider: source === 'Autre fichier' ? 'Manuel' : source, account: accountName.trim() || 'Non enregistré', currency, kind }) : undefined, [csv, mapping, source, accountName, currency, kind]);
  const preview = statement || mapped;
  const hasUsd = preview?.positions.some(p => p.currency === 'USD' || p.costCurrency === 'USD' || p.valuationCurrency === 'USD');
  const previewRate = statement?.usdCad || (rate ? Number(rate) : state.usdCad);
  const rateValid = !hasUsd || !!statement || (Number(rate) > 0 && Number(rate) <= 100);
  const valid = !!preview?.positions.length && !mapped?.errors.length && rateValid && (!csv || !!accountName.trim() || !!mapping.account);
  const total = preview?.positions.reduce((sum, p) => sum + positionValue(p, previewRate), 0) || 0;

  function reset() { request.current++; setCsv(undefined); setStatement(undefined); setBackup(undefined); setError(''); setName(''); setLoading(false); if (fileInput.current) fileInput.current.value = ''; }
  async function loadFile(file: File) {
    reset(); const id = request.current;
    if (file.size > 10 * 1024 * 1024) { setError('La taille maximale est de 10 Mo.'); return; }
    if (!/\.(pdf|csv|json)$/i.test(file.name)) { setError('Choisissez un PDF Disnat, un fichier CSV ou une sauvegarde Folio JSON.'); return; }
    setName(file.name); setLoading(true);
    try {
      if (/\.pdf$/i.test(file.name)) {
        const result = await readDisnatPdf(file);
        if (id !== request.current) return;
        setSource('Disnat'); setStatement(result);
      } else if (/\.json$/i.test(file.name)) {
        const result = JSON.parse(await file.text());
        if (!validPortfolio(result)) throw Error('Cette sauvegarde Folio est invalide.');
        if (id !== request.current) return;
        setBackup(result);
      } else {
        const result = readCsv(await file.text());
        if (id !== request.current) return;
        setCsv(result); setShowMapping(false); setAccountName(source === 'Exodus' ? 'Exodus' : 'Import CSV'); setMapping(Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => [key, result.headers.find(h => aliases.includes(normalize(h))) || ''])));
      }
    } catch (e) { if (id === request.current) setError(e instanceof Error ? e.message : 'Lecture du fichier impossible.'); }
    finally { if (id === request.current) setLoading(false); }
  }
  function confirm() {
    if (backup) {
      if (commit(backup)) { notify('Sauvegarde restaurée.'); router.push(backup.positions.length ? '/portefeuille' : '/comptes'); }
      return;
    }
    if (!valid || !preview) return;
    const next = mergeImport(state, preview.accounts, preview.positions, !!statement, previewRate);
    next.imports = [{ id: uid(), name, source, date: new Date().toISOString(), count: preview.positions.length, asOf: statement?.asOf }, ...state.imports];
    if (commit(next)) { notify(preview.positions.length + ' positions importées et enregistrées.'); router.push('/portefeuille'); }
  }
  return <>
    <PageHeading title={state.accounts.length ? 'Importations' : 'Ajoutez votre premier compte'} subtitle={state.accounts.length ? 'Vos relevés et l’historique de vos imports.' : 'Aucun compte ajouté pour le moment.'} actions={<button className="button" onClick={() => setManual(true)}><Plus />Saisie manuelle</button>} />
    <div className="import-steps"><span className="active"><b>01</b>Source</span><span className={name ? 'active' : ''}><b>02</b>Fichier</span><span className={preview || backup ? 'active' : ''}><b>03</b>Validation</span></div>
    <div className="import-source-grid">{[
      ['Disnat', 'Relevé de portefeuille PDF · Positions CSV'],
      ['Exodus', 'Positions consolidées CSV'],
      ['Autre fichier', 'Positions CSV · Sauvegarde Folio JSON'],
    ].map(([label, description]) => <button className={'source-card source-choice ' + (source === label ? 'selected' : '')} key={label} aria-pressed={source === label} onClick={() => { if (loading) return; setSource(label); setKind(label === 'Exodus' ? 'Crypto' : 'FNB'); reset(); }}><div className="source-choice-top"><ProviderIcon name={label} />{source === label && <CheckCircle2 size={18} />}</div><h2>{label}</h2><p>{description}</p></button>)}</div>
    <section className="import-workspace">
      <div className="section-head"><h2>{preview || backup ? 'Vérifier l’import' : 'Votre fichier'}</h2><button className="text-button" onClick={downloadTemplate}><Download />Modèle CSV</button></div>
      <div className={'dropzone ' + (drag ? 'dragging' : '') + (loading ? ' loading' : '')} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) void loadFile(e.dataTransfer.files[0]); }}>
        {loading ? <LoaderCircle className="spin" /> : name ? <FileCheck2 /> : <CloudUpload />}
        <strong>{loading ? 'Lecture et contrôle des données…' : name || 'Déposez votre fichier ici'}</strong>
        <small>{source === 'Disnat' ? 'Relevé Disnat PDF ou positions CSV' : source === 'Exodus' ? 'Positions CSV avec quantités, coût et prix unitaires' : 'Positions CSV ou sauvegarde Folio JSON'} · 10 Mo maximum</small>
        <button className="button" onClick={() => fileInput.current?.click()} disabled={loading}><Upload />{name ? 'Changer de fichier' : 'Choisir un fichier'}</button>
        <input ref={fileInput} className="sr-only" type="file" accept={source === 'Disnat' ? '.pdf,.csv,.json' : '.csv,.json'} aria-label="Fichier à importer" onChange={e => { if (e.target.files?.[0]) void loadFile(e.target.files[0]); }} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {source === 'Exodus' && !name && <p className="form-note">Les exports d’historique de transactions Exodus ne sont pas encore pris en charge. Ce format nécessite un fichier de positions consolidées.</p>}
      {csv && <>{(!mappingComplete || showMapping) && <><h3 className="mapping-title">Correspondance des colonnes</h3><div className="mapping">{Object.entries(LABELS).map(([key, label]) => <label className="field" key={key}><span>{label}</span><select value={mapping[key] || ''} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}><option value="">{label.endsWith('*') ? 'Choisir une colonne' : 'Valeur par défaut'}</option>{csv.headers.map(h => <option key={h}>{h}</option>)}</select></label>)}</div></>}{mappingComplete && !showMapping && <div className="mapping-confirmed"><CheckCircle2 size={16} /><span>Importation réussi</span><button type="button" className="text-button" onClick={() => setShowMapping(true)}><SlidersHorizontal size={13} />Modifier</button></div>}{hasUsd && !statement && <label className="field import-rate"><span>Taux USD → CAD *</span><input type="number" min="0.01" max="100" step="any" value={rate} onChange={e => setRate(e.target.value)} placeholder="1 USD en CAD" /></label>}{mapped?.errors.length ? <p className="error" role="alert">{mapped.errors.slice(0, 5).join('\n')}{mapped.errors.length > 5 ? '\nEt ' + (mapped.errors.length - 5) + ' autres erreurs.' : ''}</p> : null}</>}
      {statement && <div className="statement-confirmed"><CheckCircle2 /><div><strong>Totaux rapprochés avec le relevé</strong><span>{statement.accounts.length} comptes · Au {statement.asOf} · 1 USD = {number(statement.usdCad)} CAD</span></div></div>}
      {preview && <><div className="preview-summary"><div><span className="muted small">Positions détectées</span><strong>{preview.positions.length}</strong></div><div><span className="muted small">Valeur totale en CAD</span><strong className="money">{rateValid ? money(total) : 'Taux à renseigner'}</strong></div></div><div className="table-scroll import-table"><table><thead><tr><th>Actif</th><th>Compte</th><th className="numeric">Quantité</th><th className="numeric">Prix</th><th className="numeric">Valeur (CAD)</th></tr></thead><tbody>{preview.positions.map(p => <tr key={p.id}><td><strong>{p.symbol}{p.priceUncertain ? ' *' : ''}</strong><div className="muted small">{p.name}</div></td><td>{preview.accounts.find(a => a.id === p.accountId)?.name}</td><td className="numeric">{number(p.quantity)}</td><td className="numeric money">{number(p.price)} {p.currency}</td><td className="numeric money">{rateValid ? money(positionValue(p, previewRate)) : '—'}</td></tr>)}</tbody></table></div>{statement?.warnings.map(w => <p className="form-note" key={w}>{w}</p>)}<p className="form-note">{statement ? 'Les positions des comptes présents dans ce relevé seront remplacées par celles du relevé. Les autres comptes seront conservés.' : 'Les positions de même compte, symbole et devise seront mises à jour; les autres seront conservées.'}</p><div className="import-actions"><button className="button" onClick={reset}><X />Annuler</button><button className="button primary" disabled={!valid} onClick={confirm}><Check />Importer {preview.positions.length} positions</button></div></>}
      {backup && <><div className="import-summary">{backup.accounts.length} comptes et {backup.positions.length} positions. La restauration remplacera toutes les données de cet appareil.</div><div className="import-actions"><button className="button" onClick={reset}>Annuler</button><button className="button primary" onClick={confirm}><Check />Restaurer la sauvegarde</button></div></>}
    </section>
    <section className="import-history"><div className="section-head"><h2>Historique des imports</h2><span className="muted small">{state.imports.length} fichier{state.imports.length > 1 ? 's' : ''}</span></div>{state.imports.length ? <div className="table-scroll"><table><thead><tr><th>Fichier</th><th>Source</th><th>Date d’import</th><th>Relevé au</th><th className="numeric">Positions</th><th>Statut</th></tr></thead><tbody>{state.imports.map(i => <tr key={i.id}><td><span className="file-name"><FileText size={14} />{i.name}</span></td><td>{i.source}</td><td>{new Date(i.date).toLocaleDateString('fr-CA')}</td><td>{i.asOf || '—'}</td><td className="numeric">{i.count}</td><td className="positive">Importé</td></tr>)}</tbody></table></div> : <div className="empty"><Files size={25} /><p>Aucun fichier importé.</p></div>}</section>
    {manual && <PositionEditor onClose={() => { setManual(false); }} />}
  </>;
}
