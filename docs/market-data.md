# Actualisation des cours

Le bouton « Actualiser les cours » du portefeuille et des placements récupère les
derniers cours disponibles, puis présente un aperçu avant application.
Aucun accès aux comptes bancaires. Seuls les identifiants de titres et devises
sont envoyés aux fournisseurs; pas les quantités, noms de comptes ou coûts.

- Actions et FNB : données publiques Yahoo Finance, dernier prix de séance,
  horodatage du fournisseur et contrôle strict de la devise. Ce point d'accès
  public n'est pas une API contractuelle et peut devenir indisponible.
- Cryptos : API publique CoinGecko simple/price, CAD et USD, avec last_updated_at.
  Les principales cryptos ont une correspondance explicite par identifiant.
  Les autres nécessitent la saisie de leur identifiant CoinGecko unique.
- Les suffixes boursiers proposés doivent être vérifiés dans l'aperçu. Aucune
  conversion automatique d'un cours dans une autre devise.
- Cache public en mémoire de 60 secondes, concurrence limitée, délai réseau
  de 8 secondes, lots de 50 identifiants, résultats partiels avec erreurs par titre.
- Refus des cours crypto de plus de 15 minutes, des cours boursiers de plus de
  7 jours, des prix nuls/non finis et des dates futures de plus de 5 minutes.
- Un cours plus ancien que la valorisation existante n'est pas appliqué.
  Une position modifiée après ouverture de l'aperçu n'est pas écrasée.
- L'actualisation préserve quantité, coût unitaire, valeur comptable et devise
  comptable d'origine. La valeur marchande est recalculée à partir du prix courant.
  Le taux USD/CAD reste celui des Préférences.
- L'ancien minuteur Alpha Vantage a été retiré; aucune clé n'est nécessaire pour
  ces sources publiques. Leur disponibilité et leurs limites ne sont pas garanties.

Sources consultées le 10 septembre 2026 :
- https://help.yahoo.com/kb/SLN2310.html
- https://docs.coingecko.com/docs/keyless-public-api
- https://docs.coingecko.com/reference/simple-price

Tests : node --experimental-strip-types scripts/check-market.mjs

## Courbe du portefeuille

L’application de cours enregistre immédiatement une valorisation horodatée et
rafraîchit la courbe. Plusieurs points d’une même journée sont conservés; la vue
1J couvre les dernières 24 heures. Un point isolé reste visible. Sans historique,
les valeurs connues avant et après application sont enregistrées à cet instant,
sans inventer de cours passés. Les anciennes sauvegardes avec des dates seules
restent compatibles. Les 5 000 dernières valorisations sont conservées.
Une récupération annulée, échouée ou sans cours applicable n’ajoute aucun point.
