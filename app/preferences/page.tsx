'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Check, Download, Trash2, Upload } from 'lucide-react';
import { usePortfolio } from '../../components/portfolio-provider';
import { PageHeading } from '../../components/portfolio-ui';
import { Modal } from '../../components/modal';
import { download } from '../../lib/csv';
import { EMPTY_PORTFOLIO } from '../../lib/portfolio';

export default function PreferencesPage() {
  const { state, commit, notify } = usePortfolio(), router = useRouter();
  const [resetting, setResetting] = useState(false);
  const backup = () => download('folio-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(state, null, 2), 'application/json');
  function saveRate(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const rate = Number(new FormData(e.currentTarget).get('rate')); if (rate > 0 && rate <= 100 && commit({ ...state, usdCad: rate }, state.positions.length > 0)) notify('Taux de change enregistré.'); }
  function reset() { if (commit({ ...EMPTY_PORTFOLIO })) { notify('Les données locales ont été effacées.'); router.push('/importations'); } }
  return <><PageHeading title="Préférences" subtitle="Les paramètres de votre espace personnel." actions={false} /><div className="settings-form"><div className="setting-row"><div><h3>Devise de référence</h3><p>Affichage consolidé en dollars canadiens</p></div><span className="tag">CAD</span></div><form className="setting-row" onSubmit={saveRate}><div><h3>Taux de change USD → CAD</h3><p>Taux manuel ou extrait du dernier relevé PDF.<br />Les gains de change historiques ne sont pas calculés.</p></div><div className="rate-control"><label className="field"><span>1 USD en CAD</span><input key={state.usdCad} name="rate" type="number" min="0.01" max="100" step="any" required defaultValue={state.usdCad} /></label><button className="button" type="submit"><Check />Enregistrer</button></div></form><div className="setting-row"><div><h3>Sauvegarde complète</h3><p>Comptes, positions et historique du portefeuille</p></div><button className="button" onClick={backup}><Download />Sauvegarder</button></div><div className="setting-row"><div><h3>Restaurer une sauvegarde</h3><p>Fichier Folio au format JSON</p></div><Link className="button" href="/importations"><Upload />Restaurer</Link></div><div className="setting-row"><div><h3>Stockage des données</h3><p>Sur ce navigateur et cet appareil uniquement.<br />Une sauvegarde permet de changer d’appareil.</p></div><span className="tag">Local</span></div><div className="setting-row"><div><h3>Effacer le portefeuille</h3><p>Supprime les comptes et leurs données de cet appareil.</p></div><button className="icon-button" onClick={() => setResetting(true)} aria-label="Effacer le portefeuille" title="Effacer le portefeuille"><Trash2 /></button></div></div>
    {resetting && <Modal title="Effacer le portefeuille ?" onClose={() => setResetting(false)}><p className="form-note">Les comptes, les placements et l’historique seront supprimés. Vous pouvez conserver une sauvegarde avant de continuer.</p><div className="modal-footer"><button className="button" onClick={backup}><Download />Sauvegarder</button><button className="button" onClick={() => setResetting(false)}>Annuler</button><button className="button danger" onClick={reset}><Trash2 />Tout effacer</button></div></Modal>}
  </>;
}
