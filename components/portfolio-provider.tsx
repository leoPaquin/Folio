'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { EMPTY_PORTFOLIO, validPortfolio, withSnapshot, type Currency, type Portfolio } from '../lib/portfolio';

const KEY = 'folio.portfolio.v2';
type Context = { state: Portfolio; ready: boolean; error: string; hidden: boolean; setHidden: (v: boolean) => void; commit: (next: Portfolio, snapshot?: boolean) => boolean; notice: string; notify: (v: string) => void; owner?: { id: string; email: string; name?: string }; displayCurrency: Currency; toggleCurrency: () => void };
const PortfolioContext = createContext<Context | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Portfolio>(EMPTY_PORTFOLIO);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState<{ id: string; email: string; name?: string }>();
  const [storageKey, setStorageKey] = useState(KEY);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('CAD');
  const [hidden, setHidden] = useState(false);
  const [notice, notify] = useState('');
  useEffect(() => {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    let local: Portfolio | undefined;
    let localUser: { id: string; email: string; name?: string } | undefined;
    if (isLocal) { try { localUser = JSON.parse(localStorage.getItem('folio.local.session') || 'null'); } catch { localUser = undefined; } if (localUser?.id) { setOwner(localUser); setStorageKey(KEY + ':' + localUser.id); const savedCurrency = localStorage.getItem('folio.display-currency:' + localUser.id); if (savedCurrency === 'USD') setDisplayCurrency('USD'); } }
    const activeKey = localUser?.id ? KEY + ':' + localUser.id : KEY;
    try { const raw = localStorage.getItem(activeKey); if (raw) { const parsed = JSON.parse(raw); if (!validPortfolio(parsed)) throw Error('Les données enregistrées sont invalides. Restaurez une sauvegarde depuis les importations.'); local = parsed; setState(parsed); } }
    catch (e) { setError(e instanceof Error ? e.message : 'Le cache local est indisponible.'); }
    if (isLocal) { setReady(true); return; }
    fetch('/api/portfolio', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw Error(response.status === 401 ? 'Connectez-vous pour accéder à votre portefeuille.' : 'Le portefeuille partagé est indisponible.');
      const payload = await response.json() as { state: Portfolio | null; user: { id: string; email: string; name?: string } };
      setOwner(payload.user);
      try { if (localStorage.getItem('folio.display-currency:' + payload.user.id) === 'USD') setDisplayCurrency('USD'); } catch { /* optional preference */ }
      if (payload.state && validPortfolio(payload.state)) { setState(payload.state); try { localStorage.setItem(activeKey, JSON.stringify(payload.state)); } catch { /* cache facultatif */ } }
      else if (local) await fetch('/api/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: local }) });
    }).catch(e => { if (!local) setError(e instanceof Error ? e.message : 'Connexion au portefeuille impossible.'); }).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (notice) { const timer = setTimeout(() => notify(''), 5000); return () => clearTimeout(timer); } }, [notice]);
  function commit(next: Portfolio, snapshot = false) {
    const result = snapshot ? withSnapshot(next) : next;
    if (!validPortfolio(result)) { notify('Les données contiennent une erreur et n’ont pas été enregistrées.'); return false; }
    try { localStorage.setItem(storageKey, JSON.stringify(result)); } catch { /* cache facultatif */ }
    setState(result); setError('');
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) void fetch('/api/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: result }) }).then(response => { if (!response.ok) notify('Le cache local a été mis à jour, mais la sauvegarde partagée a échoué.'); });
    return true;
  }
  function toggleCurrency() { const next: Currency = displayCurrency === 'CAD' ? 'USD' : 'CAD'; setDisplayCurrency(next); try { localStorage.setItem('folio.display-currency:' + (owner?.id || 'anonymous'), next); } catch { /* optional preference */ } }
  return <PortfolioContext.Provider value={{ state, ready, error, hidden, setHidden, commit, notice, notify, owner, displayCurrency, toggleCurrency }}>{children}</PortfolioContext.Provider>;
}
export function usePortfolio() { const context = useContext(PortfolioContext); if (!context) throw Error('PortfolioProvider requis'); return context; }
