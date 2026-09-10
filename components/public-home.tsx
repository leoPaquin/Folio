'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ChartNoAxesCombined, FileUp, LockKeyhole, Wallet } from 'lucide-react';

export function PublicHome() {
  const local = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [error, setError] = useState('');
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!local) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget)), email = String(fields.email).trim().toLowerCase(), password = String(fields.password);
    if (!email || !password || password.length < 6) { setError('Utilisez une adresse courriel et un mot de passe de 6 caractères minimum.'); return; }
    const accounts = JSON.parse(localStorage.getItem('folio.local.accounts') || '[]') as { id: string; email: string; name: string; password: string }[];
    const existing = accounts.find(account => account.email === email);
    if (mode === 'create') {
      if (existing) { setError('Ce compte existe déjà. Choisissez « Se connecter ».'); return; }
      const account = { id: crypto.randomUUID(), email, name: String(fields.name || email.split('@')[0]), password };
      localStorage.setItem('folio.local.accounts', JSON.stringify([...accounts, account]));
      localStorage.setItem('folio.local.session', JSON.stringify({ id: account.id, email: account.email, name: account.name }));
    } else {
      if (!existing || existing.password !== password) { setError('Courriel ou mot de passe incorrect.'); return; }
      localStorage.setItem('folio.local.session', JSON.stringify({ id: existing.id, email: existing.email, name: existing.name }));
    }
    window.location.href = '/importations';
  }
  return <main className="public-home"><div className="public-nav"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>folio<span style={{ color: '#9eaf9d' }}>.</span></Link><span className="public-status"><LockKeyhole size={14} /> Espace privé</span></div><section className="public-hero"><div className="public-hero-grid"><div className="public-copy"><div className="public-kicker">MON PATRIMOINE, EN PERSPECTIVE.</div><h1>Vos investissements,<br /><em>enfin réunis.</em></h1><p>Centralisez vos comptes Disnat, Exodus et vos placements manuels dans un espace clair et personnel.</p>{local ? <div className="local-auth"><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Se connecter</button><button className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); setError(''); }}>Créer un compte</button></div><form onSubmit={submit}><label className="field"><span>Courriel</span><input name="email" type="email" autoComplete="email" required /></label>{mode === 'create' && <label className="field"><span>Votre nom</span><input name="name" autoComplete="name" maxLength={80} required /></label>}<label className="field"><span>Mot de passe</span><input name="password" type="password" minLength={6} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button primary public-cta" type="submit">{mode === 'create' ? 'Créer mon espace' : 'Ouvrir mon espace'} <ArrowRight /></button></form><p className="auth-local-note">Mode local : ce compte reste sur cet appareil.</p></div> : <Link className="button primary public-cta" href="/signin-with-chatgpt?return_to=%2Fportefeuille">Se connecter avec ChatGPT <ArrowRight /></Link>}<p className="public-note"><LockKeyhole size={13} /> Vos données sont séparées pour chaque utilisateur.</p></div><aside className="public-preview" aria-label="Aperçu de Folio"><div className="preview-top"><span className="preview-dot" /><span>Votre espace Folio</span><span className="preview-lock"><LockKeyhole size={12} /> privé</span></div><div className="preview-empty"><div className="preview-mark"><i /><i /><i /></div><strong>Un espace clair pour vos placements</strong><span>Importez vos comptes pour commencer.</span></div><div className="preview-lines"><span /><span /><span /></div><div className="preview-footer"><span>Disnat</span><span>Exodus</span><span>Manuel</span></div></aside></div></section><section className="public-features"><div><FileUp /><strong>Import simple</strong><span>PDF Disnat, CSV Exodus ou sauvegarde Folio.</span></div><div><ChartNoAxesCombined /><strong>Vue consolidée</strong><span>Valeurs, comptes et répartition au même endroit.</span></div><div><Wallet /><strong>Contrôle manuel</strong><span>Ajoutez et corrigez vos placements quand vous voulez.</span></div></section><footer className="public-footer"><span>folio · Suivi privé des investissements</span><span>Connexion requise pour utiliser l’application</span></footer></main>;
}
