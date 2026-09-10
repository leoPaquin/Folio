# Folio

Application de suivi des investissements au Canada, en français, avec Next.js, React, TypeScript et Supabase. Hébergement prévu sur Vercel.

## Démarrage

1. Installer Node.js 24 et exécuter `npm ci`.
2. Copier `.env.example` vers `.env` si le fichier local n’existe pas déjà.
3. Renseigner l’URL et la clé publique du projet Supabase.
4. Exécuter [supabase/schema.sql](supabase/schema.sql) dans le SQL Editor de Supabase.
5. Lancer `npm run dev`, puis ouvrir http://localhost:3000.

Le [guide Vercel et Supabase](docs/vercel-supabase.md) détaille la création du projet, la connexion, les variables d’environnement, le déploiement et la consultation de la base.

`.env`, `.env.local` et les autres fichiers d’environnement réels sont ignorés par Git. Seul `.env.example`, sans valeurs de connexion, est versionné. Ne pas ajouter de relevés personnels au dépôt.

## Données

Les comptes et portefeuilles sont enregistrés dans PostgreSQL chez Supabase, par utilisateur authentifié. Les politiques RLS limitent chaque utilisateur à sa propre ligne. Les mots de passe sont gérés par Supabase Auth. Une clé de service privilégiée n’est pas nécessaire.

Les PDF sont lus dans le navigateur ; les positions importées et confirmées sont ensuite sauvegardées dans Supabase. Une sauvegarde JSON permet de récupérer les données de l’ancienne version locale ou Cloudflare : aucune migration implicite entre profils.

L’import PDF Disnat contrôle les totaux et conserve les valeurs comptables et marchandes avec leurs devises. Le CSV accepte des positions consolidées, pas un historique de transactions. Le catalogue canadien et le choix libre d’établissement permettent le suivi manuel ; les institutions financières ne sont pas connectées automatiquement. Voir [les plateformes](docs/platforms.md).

Les actions et FNB peuvent être actualisés avec Yahoo Finance, et les cryptos avec CoinGecko. L’aperçu précède l’application ; les coûts d’achat restent conservés. La courbe reçoit un point lors de l’actualisation. Voir [les sources et limites](docs/market-data.md).

## Vérification

- `npm run build` : compilation de production et TypeScript.
- `node --experimental-strip-types scripts/check-platforms.mjs` : import et catalogue.
- `node --experimental-strip-types scripts/check-market.mjs` : cours et historique.
- `node --experimental-strip-types scripts/check-portfolio-validation.mjs` : validation des données entrantes.
- `node scripts/check-auth.mjs` : tests HTTP anonymes après compilation, sur le port local 3197.
- `node --experimental-strip-types scripts/check-statement.mjs CHEMIN_DU_PDF` : relevé local, nécessite Python et pypdf.
