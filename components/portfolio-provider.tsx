'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
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
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
  useEffect(() => {
    if (!ready || !state.positions.length) return;
    const key = 'folio.alpha-quotes:' + (owner?.id || 'local-preview');
    const due = () => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const date = parts.filter(p => ['year', 'month', 'day'].includes(p.type)).map(p => p.value).join('-');
      const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
      return { date, ready: hour >= 20 };
    };
    const refresh = async () => {
      const now = due();
      if (!now.ready || localStorage.getItem(key) === now.date) return;
      const symbols = [...new Set(state.positions.filter(p => p.kind === 'Action' || p.kind === 'FNB').map(p => p.symbol.toUpperCase()))].slice(0, 25);
      if (!symbols.length) { localStorage.setItem(key, now.date); return; }
      try {
        const response = await fetch('/api/quotes?symbols=' + encodeURIComponent(symbols.join(',')), { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as { quotes?: Record<string, { price: number; asOf: string }> };
        const quotes = payload.quotes || {};
        if (!Object.keys(quotes).length) return;
        const next = { ...state, positions: state.positions.map(p => { const q = quotes[p.symbol.toUpperCase()]; return q && (p.kind === 'Action' || p.kind === 'FNB') ? { ...p, price: q.price, marketValue: p.quantity * q.price, valuationCurrency: p.currency, asOf: q.asOf, priceUncertain: false } : p; }) };
        localStorage.setItem(storageKey, JSON.stringify(next));
        localStorage.setItem(key, now.date);
        setState(next);
        if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) void fetch('/api/portfolio', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: next }) });
        notify('Cours des actions et FNB mis à jour par Alpha Vantage.');
      } catch { /* mise à jour facultative */ }
    };
    void refresh();
    const next = new Date(); next.setHours(20, 1, 0, 0); if (next <= new Date()) next.setDate(next.getDate() + 1);
    quoteTimer.current = setTimeout(() => void refresh(), Math.min(next.getTime() - Date.now(), 2_147_000_000));
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [ready, state.positions.length, owner?.id]);
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
