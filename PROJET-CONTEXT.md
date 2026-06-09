# HQ — Générateur de Programmes Nutritionnels & Sportifs (contexte projet)

> Fichier de contexte à fournir au début d'une nouvelle conversation pour que l'assistant
> reprenne le projet sans repartir de zéro. Résume l'état actuel, l'architecture, les règles
> métier et l'historique des décisions.

---

## 1. Vue d'ensemble

Application web **SaaS médicale** pour nutritionnistes / diabétologues marocains.
Le médecin remplit un formulaire patient → l'IA (OpenAI) génère un **programme alimentaire**
(+ analyse médicale) et un **programme sportif**, exportables en **Word** et **HTML modifiable**.

- **Stack** : Next.js 15.1.12 (App Router) · React 19 · TypeScript · Tailwind · OpenAI · docx · @react-pdf (retiré de l'UI) · recharts
- **Pas de base de données** (V1) : tout reste en session.
- **Bilingue** FR / AR avec RTL.
- **Repo GitHub** : `https://github.com/nabil-93/Hamza2.git` (branche `main`)
- **Déploiement** : Vercel (projet `hamza2`, domaine `hamzaq.vercel.app`).
- **Langue de travail avec l'utilisateur** : **darija** (arabe marocain en lettres latines).

---

## 2. Démarrage

```bash
npm install
cp .env.local.example .env.local   # renseigner OPENAI_API_KEY
npm run dev                        # http://localhost:3000
```

Variables d'env :
- `OPENAI_API_KEY` (requis)
- `OPENAI_MODEL` (optionnel). **Important** : le code force `gpt-4o-mini` si la variable
  contient une valeur invalide commençant par `sk-` (incident passé sur Vercel).
  Modèle par défaut effectif = **gpt-4o-mini** (rapide, évite les timeouts Vercel Free 10 s / Pro 60 s).

⚠️ Ne jamais lancer `npm run build` pendant que `npm run dev` tourne (corrompt `.next`).
Après un build, supprimer `.next` et relancer `dev`.

---

## 3. Architecture des dossiers

```
src/
├── app/
│   ├── page.tsx                 # accueil (logo « HQ »)
│   ├── generateur/page.tsx      # wizard 8 étapes
│   └── api/
│       ├── generate/
│       │   ├── nutrition/route.ts   # menu jour type (1 jour) + variété
│       │   ├── analyse/route.ts     # analyse médicale seule
│       │   ├── day/route.ts         # UN jour de menu (temp 0.85) — utilisé pour la semaine
│       │   ├── extras/route.ts      # recettes + liste de courses à partir des jours
│       │   └── sport/route.ts       # programme sportif seul
│       ├── translate/route.ts       # traduction FR⇄AR d'un programme
│       └── chat/modify/route.ts     # modification ciblée d'un jour (chat IA)
├── components/
│   ├── wizard/                  # wizard-context, 8 étapes (step1..step8)
│   ├── report/
│   │   ├── program-result.tsx   # affichage onglets (nutrition/recettes/courses/sport/reco)
│   │   ├── export-buttons.tsx   # boutons Word + HTML (PDF retiré)
│   │   ├── report-preview.tsx   # aperçu HTML inline (iframe)
│   │   └── ai-chat.tsx          # chat IA modifs ciblées (1 jour ou « tous les jours »)
│   ├── charts/                  # macros-chart (g + %), projection, jauge IMC
│   └── ui/                      # composants shadcn-like
├── lib/
│   ├── ai/
│   │   ├── prompts.ts           # ★ tous les prompts + dayRole() + buildSingleDayPrompt
│   │   ├── openai.ts            # generateJson(userPrompt, systemPrompt?, temperature?)
│   │   └── client.ts            # generateNutrition / generateSport / modifyDay / translate
│   ├── export/
│   │   ├── docx.ts · html.ts    # générateurs Word / HTML (utilisent sections + RTL)
│   │   ├── sections.ts          # sections du rapport (numérotation dynamique)
│   │   └── labels.ts            # libellés bilingues PDF/DOCX
│   ├── calculations.ts          # IMC, BMR (Mifflin-St Jeor), TDEE, projection poids
│   └── utils.ts                 # cn, macroPercents, macrosInRange (validation EMC)
├── data/
│   ├── foods.ts · recipes.ts    # bases JSON (aliments, recettes marocaines)
│   └── meal-bank.ts             # ★ banque inspirée des 2 modèles médecin
├── locales/ fr.ts · ar.ts       # i18n
└── types/                       # patient, calculations, program (NutritionResult, SportResult…)

condition/                       # 2 .docx = modèles de référence du médecin (NE PAS déployer en prod)
public/fonts/                    # Inter + Cairo (TTF statiques pour PDF/Word arabe)
```

---

## 4. Flux fonctionnel (wizard 8 étapes)

1. Infos patient · 2. Mesures · 3. Objectifs (+ projection, garde-fou 1 kg/sem) ·
4. Pathologies/Diabète · 5. Limitations · 6. Préférences alimentaires (+ ajout libre, Ramadan, branding) ·
7. Revue · **8. Génération**.

### Étape 8 = 3 onglets indépendants (pour éviter les timeouts)
- **🍽️ Nutrition** : choix durée (Jour type / 1 semaine). Bouton « Générer le programme alimentaire ».
  - Jour type → 1 requête nutrition + 1 analyse (parallèle).
  - Semaine (7 j) → **7 requêtes `day` en parallèle** (~6 s chacune) + analyse + `extras` (recettes/courses).
    Chaque requête est courte → pas de timeout 504.
- **🏃 Sport** : bouton « Générer » OU « Passer sans programme sportif » (sport optionnel).
  La section « Programme sportif » se décoche auto si non généré.
- **📄 Export** :
  - cases à cocher des **sections** (renumérotation auto + sommaire),
  - choix **langue du document** (traduit si différente de la langue de génération),
  - boutons **Word** + **HTML modifiable** (PDF retiré). HTML s'ouvre dans un onglet (`about:blank`, pas d'URL en pied de page),
  - **aperçu inline** (iframe) + **chat IA** côte à côte.

### Chat IA (modifs ciblées)
- Sélecteur : **« Tous les jours »** ou un jour précis.
- Instruction libre (ex : « remplace le déjeuner du vendredi par un couscous ~2000 kcal »).
- Modifie **seulement** la partie demandée, requête courte (~5 s), pas de timeout.
- Mise à jour du state via `setState(prev => …)` (corrige un bug où « tous les jours » n'écrivait que le dernier jour — stale closure).

---

## 5. Règles métier de la génération alimentaire (toutes dans `prompts.ts`)

Basé sur le **référentiel EMC** (article Schlienger, voir mémoire) + les **2 modèles du médecin** (`condition/`, encodés dans `meal-bank.ts`).

### Macros (priorité absolue)
- Protéines **11-15 %**, Glucides **50-55 %**, Lipides **35-40 %**. Validé en code (`macrosInRange`).

### Structure des repas
- **Petit-déjeuner** : glucides complexes (pain complet / pain d'orge / msemen / harcha / baghrir / rghaif / belboula) + protéine (œuf/fromage/yaourt) + bonnes graisses. **SANS fruit**. Pas d'avoine ni de quinoa.
- **Déjeuner** = repas **principal** : crudités + 150 g protéine + petit féculent (50-100 g) + pain complet + **1 fruit en dessert** (seul repas avec fruit).
- **Dîner** : toujours une protéine (jamais soupe/salade seule).
- **Pain complet + protéine OBLIGATOIRES et explicites** à chaque déjeuner et dîner.

### Répartition hebdomadaire (semaine 7 j)
- Jours nommés **Lundi…Dimanche**.
- **Poisson** ≤ 2×/sem, **uniquement au déjeuner** (Mardi + Samedi).
- **Viande rouge** ≤ 2×/sem (Jeudi), de préférence au déjeuner.
- **Couscous** uniquement vendredi midi.
- **Soupes** ~2×/sem au dîner.
- **Lentilles** 1-2×/sem, en **accompagnement** seulement.
- **Omelette** au petit-déj OU dîner, jamais les deux, jamais au déjeuner.
- Déjeuners **lun-ven rapides** (<30 min) ; **week-end** plats marocains élaborés.
- **Alternance des protéines** (poulet/dinde/escalope/œufs/poisson/viande).

### Variété (point critique — corrigé récemment)
- `dayRole()` fixe **seulement la protéine du déjeuner** (pour les quotas) ; **petit-déj, dîner, féculent sont tirés ALÉATOIREMENT** (`pick`) à chaque appel + **seed** dans le prompt.
- Température **0.85** sur la route `day`.
- → Deux patients (ou deux générations) n'ont **plus** le même programme.

### Préférences & aliments
- Si le patient saisit des préférences → l'IA les respecte en priorité.
- Si **aucune préférence** → l'IA choisit les aliments **les plus courants / accessibles / économiques au Maroc**.
- Mode de **préparation par ingrédient** (cru / cuit vapeur / grillé / bouilli…) affiché en badge (aperçu, HTML, Word).

### Interdits (dans les recommandations de l'analyse)
Transformés, sodas (même 0 %), beurre, viennoiseries (1×/10 j), jus (1×/sem), pizza/burger (1×/10 j), fritures, pain blanc, grignotage. 3 repas/jour, eau à volonté.

---

## 6. Calculs locaux (sans IA) — `calculations.ts`
Âge, IMC + catégorie, BMR (Mifflin-St Jeor), TDEE, calories objectif, hydratation,
**projection de poids** plafonnée à 1 kg/sem (durée estimée datée, alerte si objectif agressif),
validation cohérence objectif ↔ poids cible.

---

## 7. Export & rapport
- **Word (.docx)** et **HTML modifiable** uniquement (PDF retiré de l'UI).
- Sections cochables, **numérotation continue** + **sommaire** auto, branding (logo/signature/cachet),
  RTL arabe (police Cairo). HTML : `contenteditable`, bouton imprimer → PDF navigateur.
- Macros affichées en **grammes + pourcentage** partout.

---

## 8. Historique des incidents résolus (pour ne pas les refaire)
- **Tailwind « page nue »** : `.next` corrompu → nettoyer `.next`, relancer dev.
- **PDF `unitsPerEm / lastFont undefined`** : @react-pdf + SVG → polices Inter/Cairo préchargées,
  graphes en `<View>` (pas de `<Svg>`), sanitizer `pdfText`. (PDF ensuite retiré de l'UI.)
- **Timeouts Vercel 504** sur 7 jours : découpage en requêtes courtes parallèles (`day`/`extras`/`analyse`).
- **`OPENAI_MODEL` = clé API** sur Vercel : code ignore les valeurs `sk-…`.
- **Chat « tous les jours »** n'appliquait qu'un jour : corrigé avec `setState(prev => …)`.
- **Programmes identiques** : `dayRole` trop rigide → randomisation (voir §5 Variété).

---

## 9. Conventions de travail
- Répondre à l'utilisateur en **darija**.
- Après chaque changement : `npx tsc --noEmit`, build propre, **commit + push** sur `main`
  (messages de commit en français, `Co-Authored-By: Claude`).
- Tester les routes IA en local avec `curl` avant de pousser.
- Ne pas réintroduire avoine/quinoa, ni fruit au petit-déjeuner, ni PDF dans l'UI.

---

## 10. Mémoire persistante associée
Voir `~/.claude/.../memory/` :
- `rapport-hamza-referentiel.md` — règles EMC.
- `modeles-programme-medecin.md` — les 2 modèles `.docx` que l'IA imite en variant.
