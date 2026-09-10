'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Hexagon, Landmark, Plus, Upload, Wallet } from 'lucide-react';
import { usePortfolio } from './portfolio-provider';
import { PositionEditor } from './position-editor';
import { isCryptoProvider } from '../lib/providers';
import { displayMoney, percent, totals } from '../lib/portfolio';

export function ProviderIcon({ name }: { name: string }) {
  return <span className={'provider ' + (isCryptoProvider(name) ? 'exodus' : name === 'Disnat' ? '' : 'manual')}>{isCryptoProvider(name) ? <Wallet /> : name === 'Disnat' ? <Hexagon /> : <Landmark />}</span>;
}
export function PageHeading({ title, subtitle, actions = true }: { title: string; subtitle: string; actions?: boolean | ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p className="subtitle">{subtitle}</p></div>{actions === true ? <PortfolioActions /> : actions}</div>;
}
export function PortfolioActions() {
  const [edit, setEdit] = useState(false);
  return <><div className="actions"><Link className="button" href="/importations"><Upload />Importer un fichier</Link><button className="button primary" onClick={() => setEdit(true)}><Plus />Ajouter un placement</button></div>{edit && <PositionEditor onClose={() => setEdit(false)} />}</>;
}
export function Metrics() {
  const { state, displayCurrency } = usePortfolio();
  const t = totals(state), gain = t.value - t.cost;
  const metrics = [
    { label: 'Valeur du portefeuille', value: displayMoney(t.value, displayCurrency, state.usdCad), note: 'Tous les comptes réunis' },
    { label: 'Coût de revient', value: displayMoney(t.cost, displayCurrency, state.usdCad), note: 'Positions actuellement détenues' },
    { label: 'Gain / perte latent', value: displayMoney(gain, displayCurrency, state.usdCad), note: (gain >= 0 ? '+' : '') + percent(t.cost ? gain / t.cost : 0) + ' sur le coût de revient' },
    { label: 'Comptes ajoutés', value: state.accounts.length, note: state.positions.length + ' placements au total' },
  ];
  return <section className="metrics" aria-label="Synthèse du portefeuille">{metrics.map((m, i) => <div className="metric" key={m.label}><div className="metric-label">{m.label}</div><div className={'metric-value ' + (i < 3 ? 'money ' : '') + (i === 2 ? gain >= 0 ? 'positive' : 'negative' : '')}>{m.value}</div><div className={'metric-note ' + (i === 2 ? gain >= 0 ? 'positive' : 'negative' : 'muted')}>{m.note}</div></div>)}</section>;
}
export function AccountCards() {
  const { state, displayCurrency } = usePortfolio();
  return <div className="account-grid">{state.accounts.map(a => {
    const positions = state.positions.filter(p => p.accountId === a.id), t = totals(state, positions);
    return <article className="account-card" key={a.id}><div className="account-top"><ProviderIcon name={a.provider} /><div><div className="account-title">{a.provider}</div><div className="account-type">{a.name}{a.reference ? ' · ••' + a.reference.slice(-2) : ''}</div></div><Link className="icon-button" href={'/placements?compte=' + encodeURIComponent(a.id)} aria-label={'Voir ' + a.name} title={'Voir ' + a.name}><ArrowUpRight /></Link></div><div className="account-value money">{displayMoney(t.value, displayCurrency, state.usdCad)}</div><div className="account-footer"><span>{positions.length} placement{positions.length > 1 ? 's' : ''}</span><span className={t.value >= t.cost ? 'positive' : 'negative'}>{t.value >= t.cost ? '+' : ''}{percent(t.cost ? (t.value - t.cost) / t.cost : 0)}</span></div></article>;
  })}</div>;
}
export function EmptyPortfolio() { return <section className="empty-portfolio"><div className="empty-icon"><Wallet size={28} /></div><h2>Votre portefeuille commence ici</h2><p>Aucun compte ajouté.</p><Link className="button primary" href="/importations"><Upload />Importer mes placements</Link></section>; }
