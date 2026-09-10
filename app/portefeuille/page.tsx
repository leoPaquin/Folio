'use client';

import Link from 'next/link';
import { ArrowUpRight, ChartPie } from 'lucide-react';
import { usePortfolio } from '../../components/portfolio-provider';
import { AccountCards, EmptyPortfolio, Metrics, PageHeading } from '../../components/portfolio-ui';
import { HoldingsTable } from '../../components/holdings-table';
import { PortfolioChart } from '../../components/portfolio-chart';
import { COLORS, displayMoney, percent, positionValue, totals } from '../../lib/portfolio';

export default function PortefeuillePage() {
  const { state, displayCurrency } = usePortfolio();
  const total = totals(state).value;
  const groups = Object.entries(COLORS).map(([kind, color]) => ({ kind, color, value: state.positions.filter(p => p.kind === kind).reduce((v, p) => v + positionValue(p, state.usdCad), 0) })).filter(g => g.value > 0);
  let cursor = 0;
  const gradient = groups.map(g => { const start = cursor; cursor += total ? g.value / total * 100 : 0; return `${g.color} ${start}% ${cursor}%`; }).join(',');
  return <><PageHeading title="Vue d’ensemble" subtitle="Un regard clair sur l’ensemble de vos investissements." />{!state.accounts.length ? <EmptyPortfolio /> : <><Metrics /><div className="main-grid"><PortfolioChart /><section className="allocation"><div className="section-head"><h2>Répartition des actifs</h2><ChartPie size={15} className="muted" /></div><div className="donut" style={{ background: gradient ? `conic-gradient(${gradient})` : '#e6ebe5' }}><div className="donut-center"><strong>{state.positions.length}</strong><span>placements</span></div></div><div>{groups.map(g => <div className="allocation-row" key={g.kind}><span className="label"><span className="swatch" style={{ background: g.color }} />{g.kind}</span><span className="amount money">{displayMoney(g.value, displayCurrency, state.usdCad)}</span><strong>{percent(total ? g.value / total : 0)}</strong></div>)}</div></section></div><section className="accounts-section"><div className="section-head" style={{ marginBottom: 15 }}><h2>Mes comptes</h2><Link href="/comptes" className="text-button">Voir les comptes<ArrowUpRight /></Link></div><AccountCards /></section><HoldingsTable /></>}</>;
}
