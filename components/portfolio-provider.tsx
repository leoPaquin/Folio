'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EMPTY_PORTFOLIO, validPortfolio, withSnapshot, type Currency, type Portfolio } from '../lib/portfolio';

type Owner = { id: string; email: string; name?: string };
type Context = { state: Portfolio; ready: boolean; error: string; hidden: boolean; setHidden: (v: boolean) => void; commit: (next: Portfolio, snapshot?: boolean) => boolean; flushSaves: () => Promise<boolean>; notice: string; notify: (v: string) => void; owner?: Owner; displayCurrency: Currency; toggleCurrency: () => void };
const PortfolioContext = createContext<Context | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Portfolio>(EMPTY_PORTFOLIO);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState<Owner>();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('CAD');
  const [hidden, setHidden] = useState(false);
  const [notice, notify] = useState('');
  const saves = useRef<Promise<boolean>>(Promise.resolve(true));
  const dirty = useRef(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/portfolio', { cache: 'no-store' }).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw Error(payload.error || 'Le portefeuille est indisponible.');
      if (payload.state !== null && !validPortfolio(payload.state)) throw Error('Les données enregistrées sont invalides. Contactez le responsable du site.');
      if (cancelled) return;
      setOwner(payload.user); setState(payload.state ?? EMPTY_PORTFOLIO);
      try { if (localStorage.getItem('folio.display-currency:' + payload.user.id) === 'USD') setDisplayCurrency('USD'); } catch { /* Optional preference. */ }
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Connexion au portefeuille impossible.'); })
      .finally(() => { if (!cancelled) setReady(true); });
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { cancelled = true; window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
  useEffect(() => { if (notice) { const timer = setTimeout(() => notify(''), 5000); return () => clearTimeout(timer); } }, [notice]);

  function commit(next: Portfolio, snapshot = false) {
    if (!ready || !owner) { notify('Attendez le chargement de votre portefeuille avant de le modifier.'); return false; }
    const result = snapshot ? withSnapshot(next) : next;
    if (!validPortfolio(result)) { notify('Les données contiennent une erreur et n’ont pas été enregistrées.'); return false; }
    const body = JSON.stringify({ state: result, userId: owner.id });
    if (new TextEncoder().encode(body).byteLength > 4_000_000) { notify('Le portefeuille dépasse la limite de sauvegarde de 4 Mo.'); return false; }
    setState(result); dirty.current = true;
    // Serialize saves so an earlier request cannot overwrite a later edit.
    const pending = saves.current.then(async () => {
      try {
        const response = await fetch('/api/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
        if (!response.ok) throw Error('Sauvegarde en ligne échouée. Gardez cette page ouverte et exportez une sauvegarde JSON depuis Importations avant de réessayer.');
        if (saves.current === pending) { dirty.current = false; setError(''); }
        return true;
      } catch {
        setError('Sauvegarde en ligne échouée. Gardez cette page ouverte et exportez une sauvegarde JSON depuis Importations avant de réessayer.');
        return false;
      }
    });
    saves.current = pending;
    return true;
  }
  function toggleCurrency() {
    const next: Currency = displayCurrency === 'CAD' ? 'USD' : 'CAD'; setDisplayCurrency(next);
    try { localStorage.setItem('folio.display-currency:' + (owner?.id || 'anonymous'), next); } catch { /* Optional preference. */ }
  }
  return <PortfolioContext.Provider value={{ state, ready, error, hidden, setHidden, commit, flushSaves: () => saves.current, notice, notify, owner, displayCurrency, toggleCurrency }}>{children}</PortfolioContext.Provider>;
}
export function usePortfolio() { const context = useContext(PortfolioContext); if (!context) throw Error('PortfolioProvider requis'); return context; }
