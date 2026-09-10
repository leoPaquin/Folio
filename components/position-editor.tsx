'use client';

import { ProviderField } from './provider-field';
import { normalizeProvider } from '../lib/providers';

import { useState, type FormEvent } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Modal } from './modal';
import { usePortfolio } from './portfolio-provider';
import { COLORS, positionKey, uid, validPosition, type Position, type Currency, type AssetKind } from '../lib/portfolio';

export function PositionEditor({ position, onClose }: { position?: Position; onClose: () => void }) {
  const { state, commit, notify } = usePortfolio();
  const [error, setError] = useState(''), [confirmDelete, setConfirmDelete] = useState(false);
  const [accountId, setAccountId] = useState(position?.accountId || state.accounts[0]?.id || 'new');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const accounts = [...state.accounts];
    let targetId = accountId;
    if (accountId === 'new') {
      const name = String(fields.accountName).trim(), provider = normalizeProvider(String(fields.provider)), currency = fields.currency as Currency;
      if (!name || !provider) { setError('Renseignez le compte et l’établissement.'); return; }
      const existing = accounts.find(a => a.name.toLowerCase() === name.toLowerCase() && normalizeProvider(a.provider) === provider && a.currency === currency);
      targetId = existing?.id || uid();
      if (!existing) accounts.push({ id: targetId, name, provider, currency });
    }
    const p: Position = { id: position?.id || uid(), accountId: targetId, symbol: String(fields.symbol).trim().toUpperCase(), name: String(fields.name).trim(), kind: fields.kind as AssetKind, quantity: Number(fields.quantity), cost: Number(fields.cost), price: Number(fields.price), currency: fields.currency as Currency, costCurrency: fields.costCurrency as Currency, asOf: String(fields.asOf) };
    if (!validPosition(p)) { setError('Vérifiez les champs obligatoires, la quantité et les prix.'); return; }
    if (state.positions.some(x => x.id !== p.id && positionKey(x) === positionKey(p))) { setError('Cette position existe déjà dans ce compte. Modifiez-la depuis la liste des placements.'); return; }
    const rate = fields.rate ? Number(fields.rate) : state.usdCad;
    if ((p.currency === 'USD' || p.costCurrency === 'USD') && ((!fields.rate && state.usdCad === 1) || !Number.isFinite(rate) || rate <= 0 || rate > 100)) { setError('Renseignez le taux USD/CAD pour ce placement.'); return; }
    const positions = [...state.positions], index = positions.findIndex(x => x.id === p.id);
    if (index >= 0) positions[index] = p; else positions.push(p);
    if (commit({ ...state, accounts, positions, usdCad: rate }, true)) { notify('Placement enregistré.'); onClose(); }
  }
  function remove() { if (commit({ ...state, positions: state.positions.filter(p => p.id !== position?.id) }, true)) { notify('Placement supprimé.'); onClose(); } }
  return <Modal title={confirmDelete ? 'Supprimer ce placement ?' : position ? 'Modifier le placement' : 'Ajouter un placement'} onClose={onClose}>
    {confirmDelete ? <><p className="form-note">{position?.symbol} sera retiré de votre portefeuille.</p><div className="modal-footer"><button className="button" onClick={() => setConfirmDelete(false)}>Annuler</button><button className="button danger" onClick={remove}><Trash2 />Supprimer</button></div></> : <form onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>Symbole</span><input name="symbol" required maxLength={30} defaultValue={position?.symbol} autoFocus /></label>
        <label className="field"><span>Nom du placement</span><input name="name" required maxLength={150} defaultValue={position?.name} /></label>
        <label className="field"><span>Catégorie</span><select name="kind" defaultValue={position?.kind || 'FNB'}>{Object.keys(COLORS).map(k => <option key={k}>{k}</option>)}</select></label>
        <label className="field"><span>Compte</span><select value={accountId} onChange={e => setAccountId(e.target.value)}>{state.accounts.map(a => <option key={a.id} value={a.id}>{a.provider} · {a.name}</option>)}<option value="new">Nouveau compte</option></select></label>
        {accountId === 'new' && <><ProviderField /><label className="field"><span>Nom du compte</span><input name="accountName" placeholder="CELI, REER…" required maxLength={100} /></label></>}
        <label className="field"><span>Quantité</span><input name="quantity" type="number" required min="0.00000001" max="1000000000000" step="any" defaultValue={position?.quantity} /></label>
        <label className="field"><span>Prix unitaire</span><input name="price" type="number" required min="0" max="1000000000000" step="any" defaultValue={position?.price} /></label>
        <label className="field"><span>Devise du prix</span><select name="currency" defaultValue={position?.currency || 'CAD'}><option>CAD</option><option>USD</option></select></label>
        <label className="field"><span>Coût moyen par unité</span><input name="cost" type="number" required min="0" max="1000000000000" step="any" defaultValue={position?.bookValue !== undefined ? position.bookValue / position.quantity : position?.cost} /></label>
        <label className="field"><span>Devise du coût</span><select name="costCurrency" defaultValue={position?.costCurrency || position?.currency || 'CAD'}><option>CAD</option><option>USD</option></select></label>
        <label className="field"><span>Date de valorisation</span><input name="asOf" type="date" required defaultValue={position?.asOf || new Date().toISOString().slice(0, 10)} /></label>
        <label className="field"><span>Taux USD → CAD, si applicable</span><input name="rate" type="number" min="0.01" max="100" step="any" defaultValue={state.usdCad === 1 ? undefined : state.usdCad} placeholder="1 USD en CAD" /></label>
      </div>
      {position?.marketValue !== undefined && <p className="form-note">Après modification, la valeur sera recalculée à partir de la quantité et du prix saisis.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-footer">{position && <button type="button" className="button danger" onClick={() => setConfirmDelete(true)}><Trash2 />Supprimer</button>}<button type="button" className="button" onClick={onClose}>Annuler</button><button className="button primary" type="submit"><Check />Enregistrer</button></div>
    </form>}
  </Modal>;
}
