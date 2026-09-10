'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ArrowDownToLine, ChartNoAxesCombined, ChevronRight, Eye, EyeOff, LayoutDashboard, LogOut, Menu, Settings2, Wallet, X } from 'lucide-react';
import { usePortfolio } from './portfolio-provider';
import { PublicHome } from './public-home';

const nav = [
  { path: '/portefeuille', name: 'Vue d’ensemble', Icon: LayoutDashboard },
  { path: '/placements', name: 'Mes placements', Icon: ChartNoAxesCombined },
  { path: '/comptes', name: 'Mes comptes', Icon: Wallet },
  { path: '/importations', name: 'Importations', Icon: ArrowDownToLine },
];
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { state, ready, error, notice, hidden, setHidden, owner, displayCurrency, toggleCurrency } = usePortfolio();
  const [menu, setMenu] = useState(false);
  const title = nav.find(n => n.path === path)?.name || (path === '/preferences' ? 'Préférences' : 'Mon espace');
  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (ready && isLocal && !owner) return <PublicHome />;
  function logout() {
    if (isLocal) localStorage.removeItem('folio.local.session');
    window.location.href = isLocal ? '/' : '/signout-with-chatgpt?return_to=%2F';
  }
  return <div className={hidden ? 'privacy-blur' : ''}>
    {menu && <button className="mobile-scrim" aria-label="Fermer le menu" onClick={() => setMenu(false)} />}
    <aside className={'sidebar' + (menu ? ' open' : '')}>
      <Link className="brand" href="/" onClick={() => setMenu(false)}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>folio<span style={{ color: '#9eaf9d' }}>.</span></Link>
      <div className="workspace"><div className="avatar">MP</div><div><strong>Mon espace personnel</strong><div className="muted" style={{ marginTop: 4, fontSize: 10 }}>Patrimoine & investissements</div></div></div>
      <p className="nav-label">Espace investisseur</p>
      <nav className="nav" aria-label="Navigation principale">{nav.map(({ path: target, name, Icon }) => <Link key={target} href={target} className={path === target ? 'active' : ''} aria-current={path === target ? 'page' : undefined} onClick={() => setMenu(false)}><Icon />{name}{target === '/importations' && state.imports.length > 0 && <span className="count">{state.imports.length}</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><Link className={'bottom-link' + (path === '/preferences' ? ' active' : '')} href="/preferences" onClick={() => setMenu(false)}><Settings2 />Préférences</Link></div>
    </aside>
    <div className="app"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} title="Ouvrir le menu" aria-label="Ouvrir le menu" aria-expanded={menu}>{menu ? <X /> : <Menu />}</button><span>Mon espace</span><ChevronRight size={12} /><span style={{ color: '#36473b' }}>{title}</span></div><div className="top-right"><span className="pill">{ready && state.accounts.length ? <><span className="dot" />Portefeuille actif</> : 'Aucun compte ajouté'}</span><button className="icon-button" onClick={() => setHidden(!hidden)} title={hidden ? 'Afficher les montants' : 'Masquer les montants'} aria-label={hidden ? 'Afficher les montants' : 'Masquer les montants'}>{hidden ? <EyeOff /> : <Eye />}</button><button className="currency-toggle" onClick={toggleCurrency} title={'Afficher les montants en ' + (displayCurrency === 'CAD' ? 'USD' : 'CAD')} aria-label={'Changer la devise, actuellement ' + displayCurrency}>{displayCurrency}</button><div className="avatar">{owner?.name ? owner.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() : owner?.email ? owner.email.slice(0, 2).toUpperCase() : 'MP'}</div><button className="icon-button" onClick={logout} title="Se déconnecter" aria-label="Se déconnecter"><LogOut /></button></div></header>
      <main>{error && <p className="error storage-error" role="alert">{error}</p>}{ready ? children : <div className="empty" role="status">Ouverture de votre espace…</div>}<footer><span>Folio · Mon patrimoine, en perspective.</span><span title={owner?.email || undefined}>{owner ? 'Compte connecté' : 'Connexion requise'}</span></footer></main>
    </div>{notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}
