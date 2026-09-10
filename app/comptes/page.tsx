'use client';

import { ProviderField } from '../../components/provider-field';
import { normalizeProvider, importAccountUrl } from '../../lib/providers';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Plus, Trash2, Upload } from 'lucide-react';
import { usePortfolio } from '../../components/portfolio-provider';
import { EmptyPortfolio, Metrics, PageHeading, ProviderIcon } from '../../components/portfolio-ui';
import { Modal } from '../../components/modal';
import { accountKey, money, totals, uid, type Account, type Currency } from '../../lib/portfolio';

export default function ComptesPage() {
  const { state, commit, notify } = usePortfolio(), router = useRouter();
  const [adding, setAdding] = useState(false), [removing, setRemoving] = useState<Account>(), [error, setError] = useState('');
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fields = Object.fromEntries(new FormData(e.currentTarget));
    const account: Account = { id: uid(), name: String(fields.name).trim(), provider: normalizeProvider(String(fields.provider)), currency: fields.currency as Currency };
    if (!account.name || !account.provider) { setError('Renseignez le nom du compte et de l’établissement.'); return; }
    if (state.accounts.some(a => accountKey(a) === accountKey(account))) { setError('Un compte de même nom et devise existe déjà pour cet établissement.'); return; }
    if (commit({ ...state, accounts: [...state.accounts, account] })) { notify('Compte ajouté. Importez maintenant vos placements.'); router.push(importAccountUrl(account.id)); }
  }
  function remove() {
    if (!removing) return;
    if (commit({ ...state, accounts: state.accounts.filter(a => a.id !== removing.id), positions: state.positions.filter(p => p.accountId !== removing.id) }, true)) { setRemoving(undefined); notify('Compte et positions supprimés.'); }
  }
  return <><PageHeading title="Mes comptes" subtitle="Votre patrimoine, compte par compte." actions={<div className="actions"><Link className="button" href="/importations"><Upload />Importer un relevé</Link><button className="button primary" onClick={() => { setError(''); setAdding(true); }}><Plus />Ajouter un compte</button></div>} />
    {!state.accounts.length ? <EmptyPortfolio /> : <><Metrics /><div className="account-grid">{state.accounts.map(a => { const positions = state.positions.filter(p => p.accountId === a.id), t = totals(state, positions); return <article className="account-card account-detail" key={a.id}><div className="account-top"><ProviderIcon name={a.provider} /><div><div className="account-title">{a.provider}</div><div className="account-type">{a.name}{a.reference ? ' · ••' + a.reference.slice(-2) : ''}</div></div><button className="icon-button" onClick={() => setRemoving(a)} aria-label={'Supprimer ' + a.name} title={'Supprimer ' + a.name}><Trash2 size={14} /></button></div><div className="account-value money">{money(t.value)}</div><div className="account-footer"><span>{positions.length} positions · {a.currency}</span><span>{positions.length ? 'Données importées ou saisies' : 'Aucune position'}</span></div><Link className="text-button account-open" href={positions.length ? '/placements?compte=' + encodeURIComponent(a.id) : importAccountUrl(a.id)}>{positions.length ? 'Voir les placements' : 'Importer les placements'}<ArrowUpRight /></Link></article>; })}</div></>}
    {adding && <Modal title="Ajouter un compte" onClose={() => setAdding(false)}><form onSubmit={add}><div className="form-grid"><ProviderField /><label className="field"><span>Devise du compte</span><select name="currency"><option>CAD</option><option>USD</option></select></label><label className="field wide"><span>Nom du compte</span><input name="name" placeholder="CELI, REER, Portefeuille crypto…" maxLength={100} required /></label></div>{error && <p className="error" role="alert">{error}</p>}<div className="modal-footer"><button className="button" type="button" onClick={() => setAdding(false)}>Annuler</button><button className="button primary" type="submit"><Check />Ajouter et importer</button></div></form></Modal>}
    {removing && <Modal title={'Supprimer ' + removing.name + ' ?'} onClose={() => setRemoving(undefined)}><p className="form-note">Ce compte et ses {state.positions.filter(p => p.accountId === removing.id).length} positions seront supprimés de cet appareil.</p><div className="modal-footer"><button className="button" onClick={() => setRemoving(undefined)}>Annuler</button><button className="button danger" onClick={remove}><Trash2 />Supprimer le compte</button></div></Modal>}
  </>;
}
