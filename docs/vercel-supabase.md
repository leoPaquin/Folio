# Configurer Folio sur Vercel avec Supabase

## 1. Créer Supabase

Créer un projet dans le tableau de bord Supabase. Choisir une région canadienne si elle est disponible et adaptée à votre usage. Le mot de passe PostgreSQL n’est pas utilisé par l’application : le conserver dans votre gestionnaire de mots de passe.

Dans les paramètres API du projet, récupérer l’URL du projet et la **publishable key**. Dans le **SQL Editor**, exécuter le fichier [schema.sql](../supabase/schema.sql). Il crée la table et les politiques RLS ; aucun portefeuille existant n’est importé ou effacé.

Dans **Authentication**, activer la connexion par courriel et la confirmation d’adresse. Pour ouvrir les inscriptions au public, configurer votre SMTP de production et vérifier les limites d’envoi du projet. Le formulaire nécessite un mot de passe d’au moins 8 caractères ; appliquer au minimum la même règle dans Supabase.

## 2. Variables locales

Le fichier `.env` est déjà prévu et ignoré par Git. Pour un nouveau clone, copier `.env.example` vers `.env`, puis renseigner :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en développement |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique du projet Supabase |

Les variables `NEXT_PUBLIC_*` sont visibles dans le navigateur. Elles ne doivent jamais contenir le mot de passe de la base, une clé secrète ou une clé `service_role`. La clé publique fonctionne avec les sessions des utilisateurs et les politiques RLS.

Lancer `npm ci`, puis `npm run dev`. Redémarrer après une modification de `.env`.

## 3. Déployer dans Vercel

Importer le dépôt GitHub **leoPaquin/Folio**, choisir **Next.js**, la racine du dépôt et Node.js **24.x**. Les commandes sont déclarées dans `vercel.json`.

Dans **Settings → Environment Variables**, ajouter les trois variables ci-dessus aux environnements voulus. Pour Production, utiliser l’URL HTTPS réelle du site pour `NEXT_PUBLIC_SITE_URL`. Pour Development, conserver localhost. Préférer un projet Supabase distinct pour les prévisualisations et le développement afin de séparer les données de production.

Lancer un déploiement après avoir ajouté ou modifié les variables : les valeurs publiques sont intégrées à la compilation. Le fichier `.env` local ne sera pas envoyé par Git ; Vercel utilise ses propres variables.

Dans Supabase **Authentication → URL Configuration**, mettre l’URL de production comme **Site URL**, puis autoriser ces **Redirect URLs** :

- `http://localhost:3000/auth/callback`
- `https://VOTRE-DOMAINE/auth/callback`
- L’URL exacte `/auth/callback` de chaque prévisualisation utilisée.

La confirmation utilise le flux PKCE : ouvrir le courriel dans le navigateur de l’inscription. Si le lien est ouvert ailleurs, confirmer l’adresse puis se connecter avec son courriel et son mot de passe.

Sources : [variables Vercel](https://vercel.com/docs/environment-variables), [Supabase avec Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [redirections Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 4. Voir la base de données

Dans Supabase, ouvrir **Table Editor → public → portfolio_state** :

- `user_id` correspond à l’utilisateur dans **Authentication → Users** ;
- `state` contient les comptes, positions, importations et points de la courbe au format JSON ;
- `updated_at` indique la dernière sauvegarde.

Le propriétaire du projet peut consulter toutes les lignes dans le tableau de bord. Les utilisateurs de Folio ne voient que leurs données grâce aux [politiques RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 5. Reprendre les données précédentes

Avant d’abandonner l’ancien site ou la version locale, exporter une sauvegarde JSON depuis **Préférences → Sauvegarder**. Sur la nouvelle version, créer/confirmer son compte puis utiliser **Importations → sauvegarde JSON**. La restauration remplace le portefeuille du compte connecté après confirmation.

L’ancienne base Cloudflare D1 et les anciens comptes locaux ne sont pas transférés automatiquement. Les anciennes données du navigateur ne sont pas chargées dans un nouveau profil. Les anciens comptes locaux nécessitent une nouvelle inscription Supabase.

## 6. Vérifier après configuration

1. Créer deux comptes de test avec confirmation de courriel.
2. Ajouter un compte et un placement sur le premier, recharger la page puis se reconnecter depuis un autre navigateur : les données doivent persister.
3. Se connecter avec le second : son portefeuille doit être vide. Vérifier aussi que les politiques RLS refusent un accès direct à la ligne du premier utilisateur.
4. Actualiser les cours et vérifier la nouvelle valeur et le point de courbe.
5. Exporter puis restaurer une sauvegarde JSON, et tester la déconnexion.
6. Vérifier que les appels aux API sans session retournent 401. Sans configuration Supabase, ils retournent 503.

La sauvegarde est asynchrone. En cas d’échec, un message reste affiché et la fermeture de la page déclenche un avertissement. Exporter une sauvegarde JSON avant de quitter. Éviter de modifier simultanément le même portefeuille dans plusieurs onglets : la dernière sauvegarde gagne.

La taille maximale d’une sauvegarde en ligne est de 4 Mo, sous la [limite des fonctions Vercel](https://vercel.com/docs/functions/limitations).
