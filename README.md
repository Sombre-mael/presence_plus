<p align="center">
  <img src="./public/logo.svg" alt="Logo Presence Plus" width="72" height="72" />
</p>

<h1 align="center">Presence Plus</h1>

<p align="center">
  Une plateforme de suivi des présences académiques conçue pour rendre le pointage plus rapide, les informations plus fiables et le suivi plus simple pour toute l'institution.
</p>

<p align="center">
  <strong>Planifier. Pointer. Comprendre.</strong>
</p>

## Le constat

Dans de nombreux établissements, le suivi des présences repose encore sur des feuilles papier, des fichiers dispersés ou des saisies manuelles effectuées après les cours.

Cette organisation entraîne plusieurs difficultés :

- le pointage prend du temps au début de chaque séance ;
- les erreurs et les oublis sont difficiles à corriger ;
- les enseignants ne disposent pas toujours d'une vue claire de leur session en cours ;
- les étudiants découvrent tardivement les absences enregistrées à leur nom ;
- l'administration doit réunir plusieurs sources avant de produire un rapport ;
- l'historique des modifications manque souvent de traçabilité.

Presence Plus répond à ce problème en réunissant les acteurs, les séances et les présences dans un seul parcours numérique.

## La solution

Presence Plus centralise le cycle complet d'une présence académique :

1. l'administration organise les utilisateurs, promotions et cours ;
2. l'enseignant planifie puis démarre sa séance ;
3. les étudiants pointent à l'aide d'un QR code ou d'un code manuel ;
4. la liste des présences évolue pendant la session ;
5. l'enseignant clôture la séance et les absences restantes sont enregistrées ;
6. l'étudiant peut demander une correction motivée ;
7. l'administration consulte les résultats, statistiques, exports et traces d'activité.

Toutes les informations métier sont confirmées par la base de données avant d'être présentées comme enregistrées dans l'interface.

## Ce que Presence Plus apporte

### Moins de saisie manuelle

Le pointage rejoint directement la séance concernée. L'enseignant n'a plus à retranscrire une feuille de présence après le cours.

### Une visibilité immédiate

Les participants attendus, présents, en retard ou absents sont regroupés dans une même vue. Les tableaux de bord s'appuient sur les données réellement enregistrées.

### Un historique centralisé

Les séances, présences, corrections et décisions restent consultables. Les opérations importantes alimentent également un journal d'activité destiné à l'administration.

### Des responsabilités clairement séparées

Chaque espace correspond au rôle de son utilisateur. L'administration supervise, l'enseignant pilote ses séances et l'étudiant consulte ou signale une erreur.

### Des corrections traçables

Une présence clôturée ne change pas silencieusement. Toute correction exige un motif et conserve les informations de décision utiles au suivi.

## Trois espaces complémentaires

### Administration

L'espace administrateur permet de structurer et superviser le fonctionnement académique :

- gestion des utilisateurs et de leur statut ;
- gestion des promotions et années académiques ;
- création des cours et affectation des enseignants ;
- supervision des sessions ;
- détection des situations nécessitant une action ;
- statistiques par période, promotion et cours ;
- exports CSV filtrés ;
- consultation du journal d'activité.

### Enseignant

L'espace enseignant accompagne le cycle de vie d'une séance :

- planning et calendrier des sessions ;
- création et modification d'une séance planifiée ;
- détection des conflits d'horaire, de salle ou de promotion ;
- démarrage et clôture contrôlés ;
- QR code et code manuel renouvelés pendant la session ;
- suivi de la participation en cours de séance ;
- saisie manuelle et correction motivée des présences ;
- traitement des demandes envoyées par les étudiants ;
- export de la feuille de présence.

### Étudiant

L'espace étudiant donne à chacun une vue directe sur sa propre situation :

- tableau de bord personnel ;
- planning hebdomadaire et mensuel ;
- pointage par caméra ou code manuel ;
- aperçu de la séance avant confirmation ;
- historique des présences, retards et absences ;
- indicateurs de présence et de ponctualité ;
- demande de correction sur une séance clôturée ;
- suivi de la décision de l'enseignant.

## Une logique métier conçue pour rester fiable

Presence Plus applique plusieurs règles afin de protéger la cohérence des données :

- une session suit un cycle contrôlé : planifiée, active, puis clôturée ou annulée ;
- une session clôturée ou annulée ne peut pas être rouverte ;
- l'effectif d'une séance est figé au démarrage ;
- un double pointage retourne la présence existante au lieu de créer un doublon ;
- les retards sont calculés selon la tolérance définie pour la séance ;
- la clôture crée automatiquement les absences manquantes ;
- les suppressions sont bloquées lorsqu'un historique dépend de l'élément ;
- les changements importants sont inscrits dans le journal d'activité ;
- les dates métier sont interprétées dans le fuseau `Africa/Lubumbashi`.

## Exploitation et accès

Les parcours administrateur, enseignant et étudiant utilisent Prisma et PostgreSQL comme source de vérité. L'accès est assuré par Auth.js avec des sessions de huit heures, un contrôle du rôle côté serveur et un registre de sessions permettant de révoquer les appareils connectés.

Il n'existe pas d'inscription publique. Le premier administrateur est créé par une commande contrôlée, puis l'administration invite les enseignants et étudiants. L'activation peut utiliser un lien envoyé par e-mail ou un code à usage unique remis directement à l'utilisateur. L'e-mail reste facultatif pour un étudiant disposant d'un matricule.

Une installation destinée aux utilisateurs doit disposer d'une URL HTTPS, d'un secret Auth dédié, d'une base PostgreSQL migrée et d'un domaine d'envoi Resend vérifié. Le mode d'e-mail simulé est automatiquement refusé sur Vercel en production.

## Technologies principales

- **Next.js 16** et React 19 pour l'application web ;
- **TypeScript** pour les contrats et la logique applicative ;
- **Prisma 7** pour l'accès aux données ;
- **PostgreSQL** comme base de données ;
- **Auth.js** et bcrypt pour les connexions et mots de passe ;
- **Tailwind CSS 4** et composants UI réutilisables pour l'interface ;
- **Motion** pour les transitions et micro-interactions ;
- **Zod** pour la validation ;
- **Vitest** pour les tests métier ;
- **Playwright** pour les parcours de bout en bout.

## Lancer le projet

### Prérequis

- Node.js `20.19` ou plus récent ;
- pnpm ;
- une base PostgreSQL accessible.

### Installation

```bash
pnpm install
```

Créer un fichier `.env` à partir de `.env.example`, puis renseigner au minimum :

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
AUTH_EMAIL_MODE="manual"
```

`AUTH_SECRET` chiffre les sessions Auth.js et protège les empreintes sensibles. Il peut être généré avec :

```bash
pnpm exec auth secret
```

En mode `manual`, l'administration remet un lien personnel à usage unique. Un code d'activation ou de récupération reste disponible en secours.

Pour activer gratuitement les e-mails transactionnels avec un expéditeur Brevo vérifié :

```env
AUTH_EMAIL_MODE="live"
AUTH_EMAIL_PROVIDER="brevo"
BREVO_API_KEY="..."
BREVO_SENDER_EMAIL="adresse-verifiee@gmail.com"
BREVO_SENDER_NAME="Presence Plus"
AUTH_EMAIL_REPLY_TO="adresse-verifiee@gmail.com"
```

Resend reste disponible avec `AUTH_EMAIL_PROVIDER="resend"`, `RESEND_API_KEY` et `AUTH_EMAIL_FROM` lorsqu'un domaine d'envoi vérifié est disponible. Les secrets des fournisseurs doivent rester dans les variables d'environnement du serveur et de Vercel.

Pour activer les notifications push Web sur les appareils autorisés, générer une seule paire de clés VAPID :

```bash
pnpm exec web-push generate-vapid-keys
```

Puis renseigner les trois variables dans l'environnement serveur :

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:adresse-de-contact@etablissement.cd"
```

La clé privée ne doit jamais être exposée au navigateur. Les utilisateurs activent ensuite explicitement les notifications depuis leur espace. Sur iPhone et iPad, l'application doit être installée sur l'écran d'accueil pour recevoir les notifications Web Push.

Préparer Prisma et démarrer l'application :

```bash
pnpm exec prisma generate
pnpm db:migrate:deploy
pnpm dev
```

Pour une nouvelle installation sans administrateur, créer le premier compte sans mot de passe temporaire :

```bash
pnpm auth:bootstrap-admin -- --name "Nom Administrateur" --email "admin@etablissement.cd"
```

La commande affiche une seule fois un code d'activation valable 48 heures et refuse toute exécution dès qu'un administrateur existe.

Si un administrateur existant ne peut plus accéder à son compte et que l'e-mail transactionnel n'est pas encore disponible, un opérateur ayant accès aux secrets d'exploitation peut émettre un code de récupération auditée valable 30 minutes :

```bash
pnpm auth:issue-recovery -- --identifier "admin@etablissement.cd"
```

Cette commande invalide les anciens codes de récupération du compte et ne définit jamais de mot de passe temporaire.

Le jeu de données initial est réservé à une base locale jetable. Il exige un accord explicite et ne remplace jamais le mot de passe d'un compte existant :

```env
ALLOW_DEMO_SEED=true
SEED_PASSWORD="un-mot-de-passe-de-test-robuste"
```

```bash
pnpm db:seed
```

L'application est ensuite disponible sur [http://localhost:3000](http://localhost:3000).

> Le seed refuse de s'exécuter en production. Ne l'utilisez jamais sur une base partagée contenant des données réelles.

## Vérifier le projet

```bash
pnpm exec prisma validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Les tests de bout en bout utilisent une base réelle. Ils doivent être exécutés avec une base dédiée ou des fixtures isolées et nettoyées après chaque scénario.

## Organisation du code

```text
src/app/          Pages, layouts et routes API
src/components/   Interfaces et composants réutilisables
src/actions/      Mutations métier exécutées côté serveur
src/lib/          Règles métier, repositories et services partagés
src/types/        Contrats TypeScript
prisma/           Schéma, migrations et données initiales
tests/            Tests unitaires et métier
e2e/              Parcours Playwright
```

## Déploiement

Le déploiement de production utilise Vercel pour l'application et PostgreSQL pour les données. Les variables `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` et `AUTH_EMAIL_MODE` doivent être définies uniquement dans l'environnement de production. Les trois variables VAPID sont également requises lorsque le push est activé. Les variables E2E et de seed restent réservées aux environnements isolés et ne doivent jamais être ajoutées au projet Vercel de production.

## Licence

Presence Plus est publié sous la **Licence de collaboration à code source consultable Presence Plus 1.0**. La version française du texte constitue la version officielle faisant foi.

Le code peut être consulté, évalué et modifié dans le seul but de proposer une contribution au dépôt officiel. Sa réutilisation dans un autre projet, sa redistribution, son déploiement ou son exploitation, commerciale comme non commerciale, nécessitent une autorisation écrite préalable.

Cette licence est **source-visible et collaborative**, mais elle ne constitue pas une licence open source au sens de l'Open Source Initiative. Consultez le fichier [LICENSE](./LICENSE) pour les conditions complètes.
