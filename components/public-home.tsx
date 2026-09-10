'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ChartNoAxesCombined, FileUp, LockKeyhole, Wallet } from 'lucide-react';
import { createClient } from '../lib/supabase/client';

export function PublicHome({ configured = false }: { configured?: boolean }) {
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const search = useSearchParams();
  const confirmationError = search.has('auth_error') ? 'Le lien de confirmation a expiré ou est invalide. Réessayez de vous connecter après avoir confirmé votre adresse courriel.' : '';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') || '').trim().toLowerCase();
    const password = String(fields.get('password') || '');
    setBusy(true); setError(''); setMessage('');
    try {
      const supabase = createClient();
      if (mode === 'create') {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: String(fields.get('name') || '').trim() }, emailRedirectTo: window.location.origin + '/auth/callback' },
        });
        if (authError) throw authError;
        if (!data.session) { setMessage('Vérifiez votre courriel pour confirmer votre inscription, puis revenez vous connecter.'); return; }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
      window.location.assign('/portefeuille');
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : '';
      setError(reason === 'Invalid login credentials' ? 'Courriel ou mot de passe incorrect.' : reason === 'Email not confirmed' ? 'Confirmez votre adresse courriel avant de vous connecter.' : 'Connexion impossible. Vérifiez vos informations et réessayez dans quelques instants.');
    } finally { setBusy(false); }
  }
  return <main className="public-home">
    <div className="public-nav"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>folio<span style={{ color: '#9eaf9d' }}>.</span></Link><span className="public-status"><LockKeyhole size={14} /> Espace privé</span></div>
    <section className="public-hero"><div className="public-hero-grid"><div className="public-copy">
      <div className="public-kicker">MON PATRIMOINE, EN PERSPECTIVE.</div><h1>Vos investissements,<br /><em>enfin réunis.</em></h1>
      <p>Centralisez vos placements Wealthsimple, BMO, Disnat et ceux de vos autres établissements au Canada dans un espace clair et personnel.</p>
      {configured ? <div className="local-auth">
        <div className="auth-tabs"><button disabled={busy} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Se connecter</button><button disabled={busy} className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); setError(''); setMessage(''); }}>Créer un compte</button></div>
        <form onSubmit={submit}>
          <label className="field"><span>Courriel</span><input name="email" type="email" autoComplete="email" required /></label>
          {mode === 'create' && <label className="field"><span>Votre nom</span><input name="name" autoComplete="name" maxLength={80} required /></label>}
          <label className="field"><span>Mot de passe</span><input name="password" type="password" minLength={8} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required /></label>
          {(error || confirmationError) && <p className="error" role="alert">{error || confirmationError}</p>}{message && <p role="status">{message}</p>}
          <button disabled={busy} className="button primary public-cta" type="submit">{busy ? 'Connexion…' : mode === 'create' ? 'Créer mon espace' : 'Ouvrir mon espace'} <ArrowRight /></button>
        </form>
      </div> : <p role="status">L’espace de connexion est en cours de configuration. Revenez bientôt.</p>}
      <p className="public-note"><LockKeyhole size={13} /> Vos données sont séparées pour chaque utilisateur.</p>
    </div><aside className="public-preview" aria-label="Aperçu de Folio"><div className="preview-top"><span className="preview-dot" /><span>Votre espace Folio</span><span className="preview-lock"><LockKeyhole size={12} /> privé</span></div><div className="preview-empty"><div className="preview-mark"><i /><i /><i /></div><strong>Un espace clair pour vos placements</strong><span>Importez vos comptes pour commencer.</span></div><div className="preview-lines"><span /><span /><span /></div><div className="preview-footer"><span>Wealthsimple</span><span>BMO</span><span>Disnat</span><span>Et bien plus</span></div></aside></div></section>
    <section className="public-features"><div><FileUp /><strong>Import simple</strong><span>Modèle CSV pour tout établissement, PDF Disnat et sauvegarde Folio.</span></div><div><ChartNoAxesCombined /><strong>Vue consolidée</strong><span>Valeurs, comptes et répartition au même endroit.</span></div><div><Wallet /><strong>Contrôle manuel</strong><span>Ajoutez et corrigez vos placements quand vous voulez.</span></div></section>
    <footer className="public-footer"><span>folio · Suivi privé des investissements</span><span>Connexion requise pour utiliser l’application</span></footer>
  </main>;
}
