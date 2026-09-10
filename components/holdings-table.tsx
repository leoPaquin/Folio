'use client';

import { useState } from 'react';
import { ChevronsUpDown, Download, Pencil, Search } from 'lucide-react';
import { usePortfolio } from './portfolio-provider';
import { PositionEditor } from './position-editor';
import { displayMoney, number, percent, positionCost, positionValue, type Position } from '../lib/portfolio';
import { exportPositions } from '../lib/csv';

export function HoldingsTable({ accountId }: { accountId?: string }) {
  const { state, displayCurrency } = usePortfolio();
  const [filter, setFilter] = useState('Tous'), [query, setQuery] = useState(''), [sort, setSort] = useState('value'), [direction, setDirection] = useState(-1);
  const [editing, setEditing] = useState<Position>();
  const rows = state.positions.filter(p => (!accountId || p.accountId === accountId) && (filter === 'Tous' || p.kind === filter) && (p.symbol + ' ' + p.name).toLowerCase().includes(query.toLowerCase()));
  rows.sort((a, b) => direction * (sort === 'symbol' ? a.symbol.localeCompare(b.symbol) : sort === 'gain' ? positionValue(a, state.usdCad) - positionCost(a, state.usdCad) - positionValue(b, state.usdCad) + positionCost(b, state.usdCad) : positionValue(a, state.usdCad) - positionValue(b, state.usdCad)));
  function sortBy(key: string) { if (key === sort) setDirection(-direction); else { setSort(key); setDirection(key === 'symbol' ? 1 : -1); } }
  return <section className="holdings-section"><div className="section-head" style={{ marginBottom: 5 }}><h2>Mes placements <span className="muted small">{rows.length}</span></h2><button className="text-button" disabled={!rows.length} onClick={() => exportPositions(state, rows)}><Download />Exporter</button></div>
    <div className="table-toolbar"><div className="tabs" aria-label="Catégorie des placements">{['Tous', 'FNB', 'Action', 'Crypto', 'Liquidités'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f === 'Action' ? 'Actions' : f}</button>)}</div><label className="search"><Search /><input type="search" aria-label="Rechercher un placement" placeholder="Rechercher un placement…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <div className="table-scroll"><table><thead><tr><th><button onClick={() => sortBy('symbol')}>Actif<ChevronsUpDown /></button></th><th>Compte</th><th className="numeric">Quantité</th><th className="numeric">Prix unitaire</th><th className="numeric"><button onClick={() => sortBy('value')}>Valeur (CAD)<ChevronsUpDown /></button></th><th className="numeric"><button onClick={() => sortBy('gain')}>Gain latent<ChevronsUpDown /></button></th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(p => {
      const gain = positionValue(p, state.usdCad) - positionCost(p, state.usdCad), cost = positionCost(p, state.usdCad), account = state.accounts.find(a => a.id === p.accountId);
      return <tr key={p.id}><td><div className="asset-cell"><span className={'asset-logo ' + (p.kind === 'Crypto' ? 'crypto-logo' : '')}>{p.symbol === 'BTC' ? '₿' : p.symbol === 'ETH' ? 'Ξ' : p.symbol.slice(0, 2)}</span><div><strong>{p.symbol}{p.priceUncertain && <span title="Prix signalé comme incertain sur le relevé"> *</span>}</strong><span className="muted">{p.name}</span></div></div></td><td><span className="tag">{account?.name}</span></td><td className="numeric">{number(p.quantity)}</td><td className="numeric money">{number(p.price)} <span className="muted small">{p.currency}</span></td><td className="numeric money"><strong style={{ fontWeight: 550 }}>{displayMoney(positionValue(p, state.usdCad), displayCurrency, state.usdCad)}</strong></td><td className={'numeric money ' + (gain >= 0 ? 'positive' : 'negative')}>{gain >= 0 ? '+' : ''}{displayMoney(gain, displayCurrency, state.usdCad)}<div style={{ fontSize: 9, marginTop: 4 }}>{gain >= 0 ? '+' : ''}{percent(cost ? gain / cost : 0)}</div></td><td><button className="icon-button table-edit" onClick={() => setEditing(p)} aria-label={'Modifier ' + p.symbol} title={'Modifier ' + p.symbol}><Pencil size={14} /></button></td></tr>;
    })}{!rows.length && <tr><td className="empty" colSpan={7}>{state.positions.length ? 'Aucun placement ne correspond à votre recherche.' : 'Aucun placement ajouté.'}</td></tr>}</tbody></table></div><div className="table-footer"><span>{rows.length} placement{rows.length > 1 ? 's' : ''} affiché{rows.length > 1 ? 's' : ''}</span><span>Prix saisis ou importés · Aucun cours en direct</span></div>
    {editing && <PositionEditor position={editing} onClose={() => setEditing(undefined)} />}
  </section>;
}
