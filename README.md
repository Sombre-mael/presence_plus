# Presence Plus

Presence Plus est une application Next.js pour preparer la gestion des presences dans un etablissement.

## Structure

- `src/app` : pages et routes API
- `src/components` : composants reutilisables
- `src/lib` : configuration, permissions et utilitaires
- `src/actions` : logique metier appelee par les pages
- `prisma` : schema de base de donnees et seed

## Scripts

```bash
pnpm dev
pnpm lint
pnpm build
```

## Environnement

Copier `.env.example` vers `.env`, puis renseigner les variables locales necessaires.
