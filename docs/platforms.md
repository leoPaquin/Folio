# Plateformes de suivi au Canada

Catalogue vérifié et complété le 10 septembre 2026. Les entrées sont des noms
d'établissements pour le suivi de placements existants, pas des connexions bancaires.
Les portefeuilles autonomes (Exodus, Ledger, etc.) sont distingués des établissements.
La présence au catalogue ne garantit pas l'ouverture de comptes dans chaque province.

Chaque entrée permet la saisie manuelle et l'import de positions adaptées au modèle
CSV Folio. Aucune compatibilité avec un export natif non testé n'est annoncée.
Seul le relevé PDF Disnat dispose d'un lecteur spécifique validé. Les historiques
de transactions ne permettent pas de déterminer directement les positions détenues
et sont refusés lorsqu'ils sont reconnus. Les valeurs sont en CAD ou USD.
Tout établissement absent peut être saisi librement. Le catalogue n'est pas exhaustif.

Sources de référence :
- Courtiers : https://www.vanguard.ca/en/product/how-to-buy/online-brokerage
- Offres BMO : https://www.bmo.com/en-ca/main/personal/investments/direct-investing/
- Gestion de portefeuille : https://www.justwealth.com/
- Plateformes crypto : https://www.securities-administrators.ca/crypto-platforms-regulation-and-enforcement-actions/crypto-platforms-authorized-to-do-business-with-canadians/

Les libellés anglais et anciens noms univoques sont reconnus pour éviter les doublons.
Les différentes offres d'un même groupe (BMO, InvestorLine, SmartFolio, etc.) restent
distinctes. Le lien depuis un compte préremplit son établissement, son nom et sa devise.
Les colonnes explicites du CSV gardent priorité; l'aperçu expose le compte destinataire.

Vérification : node --experimental-strip-types scripts/check-platforms.mjs
