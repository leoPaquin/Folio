'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { usePortfolio } from '../../components/portfolio-provider';
import { HoldingsTable } from '../../components/holdings-table';
import { PageHeading, Metrics } from '../../components/portfolio-ui';

function Content() {
  const query = useSearchParams(), { state } = usePortfolio();
  const id = query.get('compte') || undefined;
  const account = state.accounts.find(a => a.id === id);
  return <><PageHeading title="Mes placements" subtitle="Chaque position, au même endroit." />{state.positions.length > 0 && <Metrics />}{id && <div className="account-filter"><span>{account ? account.provider + ' · ' + account.name : 'Compte introuvable'}</span><Link className="icon-button" href="/placements" aria-label="Retirer le filtre" title="Retirer le filtre"><X /></Link></div>}<HoldingsTable accountId={id} /></>;
}
export default function PlacementsPage() { return <Suspense fallback={<div className="empty">Ouverture des placements…</div>}><Content /></Suspense>; }
