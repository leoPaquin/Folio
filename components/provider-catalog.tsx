'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ProviderIcon } from './portfolio-ui';
import { PROVIDERS, PROVIDER_GROUPS, findProvider, normalizeProvider, searchProviders } from '../lib/providers';

const FEATURED = ['Disnat', 'Wealthsimple', 'BMO InvestorLine', 'Questrade', 'RBC Placements en Direct', 'Banque Nationale Courtage direct'];
export function ProviderCatalog({ source, disabled, onSelect }: { source: string; disabled: boolean; onSelect: (name: string) => void }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState(''), [expanded, setExpanded] = useState(false);
  const matches = searchProviders(query, category);
  const visible = query || category || expanded ? matches : FEATURED.map(name => findProvider(name)!);
  return <section className="provider-catalog" aria-label="Plateformes et établissements">
    <div className="section-head"><h2>Vos plateformes, réunies</h2><span className="muted small">{PROVIDERS.length - 1} établissements et portefeuilles référencés</span></div>
    <p className="form-note">Suivez vos placements au Canada par fichier ou saisie manuelle. Aucune connexion automatique aux établissements.</p>
    <div className="provider-filters"><label className="field"><span>Rechercher une plateforme</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Wealthsimple, BMO, caisse…" /></label><label className="field"><span>Catégorie</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="">Toutes les catégories</option>{PROVIDER_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label></div>
    <div className="import-source-grid provider-results">{visible.map(provider => <button className={'source-card source-choice ' + (normalizeProvider(source) === provider.name ? 'selected' : '')} key={provider.name} aria-pressed={normalizeProvider(source) === provider.name} disabled={disabled} onClick={() => onSelect(provider.name)}><div className="source-choice-top"><ProviderIcon name={provider.name} />{normalizeProvider(source) === provider.name && <CheckCircle2 size={18} />}</div><h2>{provider.name}</h2><p>{provider.pdf ? 'PDF Disnat · CSV à adapter · Manuel' : 'CSV à adapter · Saisie manuelle'}</p><span className="muted small">{provider.group}</span></button>)}</div>
    {!visible.length && <p className="form-note" role="status">Aucun résultat. Saisissez le nom de votre établissement ci-dessous pour l’utiliser.</p>}
    {!query && !category && <button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Afficher les plateformes principales' : 'Voir toutes les plateformes'}</button>}
  </section>;
}
