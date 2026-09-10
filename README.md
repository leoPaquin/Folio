# Folio

Application personnelle de suivi des investissements en francais, construite avec React, TypeScript et Vinext.

## Pages

- `/` redirige vers les importations si le portefeuille est vide, sinon vers le portefeuille.
- `/importations` : catalogue canadien, PDF Disnat, CSV de positions, restauration JSON, apercu et validation.
- `/portefeuille` : synthese, repartition, comptes et historique reel.
- `/placements` : recherche, filtres, tri, saisie et modification.
- `/comptes` : ajout et suppression des comptes.
- `/preferences` : conversion USD/CAD et sauvegardes.

## Developpement

`npm install`, puis `npm run dev`. Compilation : `npm run build`.

## Donnees

Aucune donnee fictive. Les comptes et placements sont conserves exclusivement dans le navigateur sous `folio.portfolio.v2`. Les PDF sont lus localement avec PDF.js. Aucun releve utilisateur ne doit etre ajoute au depot. Exporter une sauvegarde JSON pour changer d'appareil.

L'import PDF Disnat controle les totaux de chaque compte et du portefeuille avant validation. Les valeurs comptables et marchandes du releve sont conservees, avec leurs devises. Un nouveau releve remplace les positions des comptes concernes, afin de retirer les positions vendues.

L'import CSV accepte des positions consolidees; les historiques de transactions Exodus ne sont pas pris en charge. Les actions et FNB peuvent être actualisés à la demande avec Yahoo Finance, et les cryptos avec CoinGecko. Un aperçu permet de vérifier les identifiants, devises et dates avant application. Les cours peuvent être différés; aucun flux continu ni taux de change automatique. Les coûts d’achat et les prix indisponibles sont conservés. Voir [les sources et limites](docs/market-data.md).

## Plateformes canadiennes

Catalogue avec recherche, choix libre d’établissement et import CSV configurable. Les plateformes ajoutées sont disponibles pour le suivi manuel et les positions adaptées au modèle Folio; elles ne sont pas connectées automatiquement. Voir [la portée et les sources](docs/platforms.md).

Vérification : `node --experimental-strip-types scripts/check-platforms.mjs`.

## Verification d'un releve local

`node --experimental-strip-types scripts/check-statement.mjs CHEMIN_DU_PDF`

La verification necessite Python et pypdf. Elle ne copie pas le document et n'affiche pas les details des positions.
