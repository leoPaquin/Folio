'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '../components/portfolio-provider';

export default function Home() {
  const { state, ready } = usePortfolio();
  const router = useRouter();
  useEffect(() => { if (ready) router.replace(state.accounts.length && state.positions.length ? '/portefeuille' : '/importations'); }, [ready, state.accounts.length, state.positions.length, router]);
  return <div className="empty" role="status">Ouverture de votre espace…</div>;
}
