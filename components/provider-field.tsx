'use client';

import { useId } from 'react';
import { PROVIDERS } from '../lib/providers';

export function ProviderField({ value, onChange, defaultValue = 'Disnat', disabled = false }: { value?: string; onChange?: (value: string) => void; defaultValue?: string; disabled?: boolean }) {
  const id = useId();
  return <label className="field"><span>Établissement</span><input name="provider" list={id} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={e => onChange?.(e.target.value)} disabled={disabled} placeholder="Rechercher ou saisir un établissement" required maxLength={100} autoComplete="off" /><datalist id={id}>{PROVIDERS.map(p => <option value={p.name} key={p.name}>{p.aliases.join(' · ') || p.group}</option>)}</datalist><small className="muted">Choisissez une plateforme ou saisissez son nom.</small></label>;
}
