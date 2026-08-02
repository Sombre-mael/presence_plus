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

Toutes les informations métier sont confirmées par la base Neon avant d'être présentées comme enregistrées dans l'interface.

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

## État du projet

Presence Plus est actuellement en phase de développement et de stabilisation.

Les parcours administrateur, enseignant et étudiant utilisent Prisma et Neon comme source de vérité. L'authentification définitive avec Auth.js n'est pas encore activée : trois profils de démonstration signés côté serveur permettent temporairement de parcourir l'application.

| Profil de démonstration | Rôle |
| --- | --- |
| Aline Kabeya | Administration |
| Patrick Ilunga | Enseignant |
| Sarah Mbuyi | Étudiante |

Ce mode facilite les tests fonctionnels, mais ne constitue pas un mécanisme d'authentification destiné à la production.

## Technologies principales

- **Next.js 16** et React 19 pour l'application web ;
- **TypeScript** pour les contrats et la logique applicative ;
- **Prisma 7** pour l'accès aux données ;
- **Neon PostgreSQL** comme base de données ;
- **Tailwind CSS 4** et composants UI réutilisables pour l'interface ;
- **Motion** pour les transitions et micro-interactions ;
- **Zod** pour la validation ;
- **Vitest** pour les tests métier ;
- **Playwright** pour les parcours de bout en bout.

## Lancer le projet

### Prérequis

- Node.js `20.19` ou plus récent ;
- pnpm ;
- une base PostgreSQL Neon accessible.

### Installation

```bash
pnpm install
```

Créer un fichier `.env` à partir de `.env.example`, puis renseigner au minimum :

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
```

`AUTH_SECRET` est utilisé pour signer le profil de démonstration et les codes QR. Il peut être généré avec :

```bash
pnpm exec auth secret
```

Préparer Prisma et démarrer l'application :

```bash
pnpm exec prisma generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

L'application est ensuite disponible sur [http://localhost:3000](http://localhost:3000).

> Ne lancez pas automatiquement le seed sur une base Neon partagée contenant déjà des données de travail.

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

## Prochaines étapes

- terminer le jalon de stabilisation transversal ;
- intégrer Auth.js et les sessions utilisateur réelles ;
- renforcer les tests de concurrence et de résilience ;
- préparer les environnements de préproduction et de production ;
- déployer l'application sur Vercel.

## Licence

Ce projet est distribué sous licence MIT. Consultez le fichier [LICENSE](./LICENSE) pour plus d'informations.
