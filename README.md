# NutriMed — Générateur Intelligent de Programmes Nutritionnels et Sportifs

Plateforme SaaS médicale pour nutritionnistes, diabétologues et endocrinologues.
Génère automatiquement un **programme nutritionnel**, un **programme sportif**, une **liste de courses**, une **analyse médicale** et un **rapport professionnel** exportable en **PDF** et **Word**, en **Français** ou **Arabe (RTL)**.

> **Version 1 — Aucune base de données.** Aucune donnée patient n'est enregistrée. Tout reste dans la session.

## Stack

- **Next.js 15** (App Router) · React 19 · TypeScript
- **Tailwind CSS** + composants Shadcn-style
- **React Hook Form** + **Zod**
- **OpenAI API** (génération IA)
- **Recharts** (graphiques)
- **docx** + **@react-pdf/renderer** (export Word / PDF)
- i18n FR/AR maison avec **RTL automatique**

## Démarrage

```bash
npm install

# Configurer la clé OpenAI
cp .env.local.example .env.local
# puis renseigner OPENAI_API_KEY=sk-...

npm run dev
```

Ouvrir http://localhost:3000

## Scripts

| Commande            | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Serveur de développement             |
| `npm run build`     | Build de production                  |
| `npm run start`     | Lancer le build de production        |
| `npm run typecheck` | Vérification TypeScript              |

## Variables d'environnement

| Variable         | Requis | Défaut   | Description              |
| ---------------- | ------ | -------- | ------------------------ |
| `OPENAI_API_KEY` | ✅     | —        | Clé API OpenAI           |
| `OPENAI_MODEL`   | ❌     | `gpt-4o` | Modèle de génération     |

> La clé OpenAI est lue **uniquement côté serveur** (API Routes). Elle n'est jamais exposée au client.

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Fonts Inter/Cairo + I18nProvider
│   ├── page.tsx                # Accueil (présentation + CTA)
│   ├── generateur/page.tsx     # Wizard 8 étapes
│   └── api/generate/
│       ├── nutrition/route.ts  # IA → plan + recettes + courses
│       └── sport/route.ts      # IA → sport + analyse (en parallèle)
├── components/
│   ├── ui/                     # Button, Card, Input, MultiSelect, …
│   ├── wizard/                 # Contexte, stepper, 8 étapes
│   ├── dashboard/              # StatCard, AnalysisCard
│   ├── charts/                 # Projection poids, jauge IMC, macros
│   └── report/                 # Résultat + boutons d'export
├── lib/
│   ├── calculations.ts         # IMC, BMR (Mifflin-St Jeor), TDEE, projection
│   ├── schema.ts               # Schémas Zod du formulaire
│   ├── ai/                     # Prompts système + client OpenAI
│   └── export/                 # docx.ts + pdf.tsx
├── data/                       # foods.ts, recipes.ts (bases JSON locales)
├── locales/                    # fr.ts, ar.ts + provider i18n
└── types/                      # Types du domaine
```

## Flux fonctionnel

1. **Wizard 8 étapes** : Infos → Mesures → Objectifs → Pathologies/Diabète → Limitations → Préférences (+ Ramadan, branding) → Revue → Génération.
2. **Calculs locaux** (sans IA) : âge, IMC + catégorie, BMR, TDEE, calories objectif, hydratation, projection de poids avec **garde-fou de sécurité** (alerte si perte > 1 kg/semaine).
3. **Génération IA** : nutrition + sport + analyse, via un **system prompt médical strict** (recommandations prudentes, cuisine marocaine, contre-indications respectées).
4. **Rapport** : aperçu à l'écran puis export **PDF** / **Word** avec logo, signature et cachet du cabinet.

## Sécurité médicale

Le system prompt impose des recommandations conformes aux référentiels internationaux (diabète, obésité, nutrition clinique, activité physique adaptée, régime méditerranéen) et interdit les régimes dangereux, pertes excessives et exercices contre-indiqués.
