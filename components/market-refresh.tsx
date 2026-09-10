'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { usePortfolio } from './portfolio-provider';
import { Modal } from './modal';
import { number, type Position } from '../lib/portfolio';
import { applyMarketQuotes, canQuote, quoteRequest, suggestedLookup, usableQuote, validQuoteRequest, type QuoteResult } from '../lib/market';

export function MarketRefresh() {
  const { state, ready } = usePortfolio();
  const [open, setOpen] = useState(false);
  return <><button className="button" disabled={!ready || !state.positions.some(canQuote)} onClick={() => setOpen(true)}><RefreshCw />Actualiser les cours</button>{open && <MarketDialog onClose={() => setOpen(false)} />}</>;
}
function MarketDialog({ onClose }: { onClose: () => void }) {
  const { state, commit, notify } = usePortfolio();
  const [positions] = useState<Position[]>(() => state.positions.filter(canQuote));
  const [lookups, setLookups] = useState(() => Object.fromEntries(positions.map(p => [p.id, suggestedLookup(p)])));
  const [selected, setSelected] = useState(() => new Set(positions.map(p => p.id)));
  const [result, setResult] = useState<QuoteResult>({ quotes: {}, errors: {} });
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [loaded, setLoaded] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const rows = positions.map(p => ({ p, request: quoteRequest(p, lookups[p.id] || '') }));
  const updates = rows.filter(({ p, request }) => selected.has(p.id) && usableQuote(result.quotes[request.key], request)).map(({ p, request }) => ({ before: p, request, quote: result.quotes[request.key] }));
  async function refresh() {
    if (loading) return;
    const requests = [...new Map(rows.filter(({ p, request }) => selected.has(p.id) && validQuoteRequest(request)).map(({ request }) => [request.key, request])).values()];
    if (!requests.length) { setError('Choisissez un placement et renseignez un symbole ou un identifiant valide.'); return; }
    controller.current?.abort(); const active = new AbortController(); controller.current = active;
    setLoading(true); setError(''); setLoaded(false); setResult({ quotes: {}, errors: {} });
    const combined: QuoteResult = { quotes: {}, errors: {} };
    try {
      for (let offset = 0; offset < requests.length; offset += 50) {
        const batch = requests.slice(offset, offset + 50);
        try {
          const response = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assets: batch }), signal: active.signal });
          const payload = await response.json() as Partial<QuoteResult> & { error?: string };
          if (!response.ok) throw Error(payload.error || 'Récupération des cours impossible.');
          for (const request of batch) {
            const quote = payload.quotes?.[request.key];
            if (usableQuote(quote, request)) combined.quotes[request.key] = quote;
            else combined.errors[request.key] = payload.errors?.[request.key] || 'Aucun cours valide disponible.';
          }
        } catch (error) {
          if (active.signal.aborted) return;
          for (const request of batch) combined.errors[request.key] = error instanceof Error ? error.message : 'Service indisponible.';
        }
      }
      if (!active.signal.aborted) { setResult(combined); setLoaded(true); }
    } finally { if (!active.signal.aborted) setLoading(false); }
  }
  function apply() {
    const next = applyMarketQuotes(state, updates);
    if (!next.updated) { setError('Aucun cours applicable : les positions ont changé ou les prix sont plus anciens que vos données. Relancez la récupération.'); return; }
    if (commit(next.state)) { notify(next.updated + ' prix mis à jour. Courbe actualisée.' + (next.skipped ? ' ' + next.skipped + ' positions inchangées.' : '')); onClose(); }
  }
  return <Modal title="Actualiser les cours" onClose={onClose} wide>
    <p className="form-note market-intro">Vérifiez les titres avant d’appliquer les prix. Le suffixe .TO suggère Toronto, .V la Bourse de croissance TSX et .CN la CSE. Pour une crypto, utilisez son identifiant CoinGecko (bitcoin, ethereum…).</p>
    <div className="table-scroll market-table"><table><thead><tr><th>Inclure</th><th>Placement</th><th>Symbole / identifiant</th><th>Prix actuel</th><th>Nouveau cours</th></tr></thead><tbody>{rows.map(({ p, request }) => {
      const quote = result.quotes[request.key], issue = result.errors[request.key];
      return <tr key={p.id}><td><input type="checkbox" checked={selected.has(p.id)} disabled={loading} aria-label={'Actualiser ' + p.symbol + ' ' + p.id} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(p.id); else next.delete(p.id); return next; })} /></td><td><strong>{p.symbol}</strong><div className="muted small">{state.accounts.find(a => a.id === p.accountId)?.name} · {p.currency}</div></td><td><label className="field"><span className="sr-only">{p.kind === 'Crypto' ? 'Identifiant CoinGecko' : 'Symbole de cotation'} pour {p.symbol}</span><input value={lookups[p.id] || ''} disabled={loading} maxLength={80} placeholder={p.kind === 'Crypto' ? 'bitcoin' : 'VFV.TO'} onChange={e => { setLookups({ ...lookups, [p.id]: e.target.value }); setError(''); }} /></label>{!validQuoteRequest(request) && <small className="muted">Identifiant à renseigner</small>}</td><td className="money">{number(p.price)} {p.currency}</td><td>{quote ? <><strong className="money">{number(quote.price)} {quote.currency}</strong><div className="muted small">{quote.name}</div><div className="muted small">{new Date(quote.quotedAt).toLocaleString('fr-CA')} · {quote.source}</div></> : <span className={issue ? 'error' : 'muted'}>{issue || (loading ? 'Récupération…' : 'À récupérer')}</span>}</td></tr>;
    })}</tbody></table></div>
    <p className="form-note">Cours boursiers potentiellement différés; dernier cours de séance si le marché est fermé. Les prix indisponibles restent inchangés. Les coûts d’achat sont conservés. La conversion utilise votre taux USD/CAD dans Préférences.</p>
    <p className="form-note">Sources : <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">Yahoo Finance</a> · <a href="https://www.coingecko.com/en/api" target="_blank" rel="noreferrer">Powered by CoinGecko</a></p>
    {error && <p className="error" role="alert">{error}</p>}
    {loaded && <p className="form-note" role="status">{updates.length} position(s) avec un cours disponible. Vérifiez le nom, la devise et la date avant d’appliquer.</p>}
    <div className="modal-footer"><button className="button" onClick={onClose}>Annuler</button><button className="button" disabled={loading} onClick={() => void refresh()}><RefreshCw className={loading ? 'spin' : ''} />{loading ? 'Récupération…' : 'Récupérer les cours'}</button><button className="button primary" disabled={loading || !updates.length} onClick={apply}><Check />Appliquer {updates.length} prix</button></div>
  </Modal>;
}
