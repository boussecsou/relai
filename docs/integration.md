# Relai — préparation de l’intégration dans main

Préparation actualisée le 9 octobre 2026. La publication de la baseline et l’ouverture de sa PR sont autorisées ; la fusion reste réservée à la revue du mainteneur. La branche de conception `feat/relai-agent-inbox` et ses modifications locales sont conservées intactes. La branche d’intégration `feat/relai-agent-inbox-baseline` part du main distant courant dans un checkout séparé.

## État Git vérifié

- Feature distante et HEAD de départ : `a4ddee5`.
- Main distant : `53c1887` (`chore: empty repository contents (#11)`), arbre vide.
- Base commune : `9dd563d` ; 19 commits sur feature et un commit de suppression sur main.
- Références distantes revérifiées le 9 octobre 2026 avec `git ls-remote`, puis main cloné dans un checkout séparé. Le main local de conception reste ancien ; comparer au main distant.

Une fusion ordinaire risque des conflits modification/suppression pour README, CONTEXT, CONTRIBUTING et la direction produit. Des fichiers inchangés sur feature, notamment LICENSE, SECURITY et la base du gitignore, peuvent être supprimés silencieusement. Le contenu final voulu est l’arbre actuel de la nouvelle base, pas le résultat automatique d’une telle fusion.

## Contenu à publier

```text
index.html                  Maquette autonome et données synthétiques
assets/brand/               Logos et favicon
design/relai-inbox/         Parcours, audit, journal et licences tierces
docs/README.md              Index documentaire
docs/ui-guidelines.md       Règles graphiques, interactions et alertes
docs/use-cases.md           37 cas et couverture de simulation
docs/adr/                   8 décisions ou propositions
docs/implementation-plan.md Première tranche Rust et critères
docs/context/RESUME.md      Guide de reprise
CONTEXT.md                  Glossaire du domaine
AGENTS.md                   Guide contributeur existant, conservé
scripts/                    Contrôles du prototype et des liens
.github/                    CI, gouvernance et templates
LICENSE / SECURITY.md       Licence et signalement privé
```

Les anciens Compose/Reply, exports v1 et spécifications supprimées ne reviennent pas. `screens/` reste local et ignoré. Ne pas modifier le guide AGENTS existant.

## Stratégie de publication recommandée

Préparer une PR de nouvelle base depuis le main vide, avec une branche d’intégration dédiée et une copie exacte de l’arbre relu. Cela évite de rejouer les anciens commits de conception et de réécrire la branche de travail.

Après autorisation de publication :

1. Revérifier les deux références distantes et sauvegarder le contenu local relu, y compris les nouveaux documents non suivis.
2. Créer un checkout séparé sur `origin/main` et une branche telle que `feat/relai-agent-inbox-baseline`. Garder le workspace de conception intact.
3. Y appliquer le snapshot relu, avec licences, gouvernance et scripts. Vérifier les ajouts et l’absence des éléments v1.
4. Créer un commit ciblé, exécuter `make check` et revoir le diff contre `origin/main`.
5. Pousser cette branche, ouvrir une PR vers main, joindre les captures sélectionnées et attendre contrôles/revue. Ne pas pousser directement sur main ni forcer feature.

Si feature elle-même doit être la source de la PR, intégrer le commit de suppression avec conservation explicite de l’arbre approuvé et examiner aussi les suppressions silencieuses. Cette opération n’est pas réalisée ici.

## Description de PR préparée

### What changed

Publish the new Relai native-session inbox prototype, brand assets, contributor tooling and development handoff. The latest prompt/response stays central; Result / Activity / Context open on demand. Files and checks belong to response snapshots. The documentation covers 37 use cases and eight ADRs.

### Why

Establish the new baseline after main was emptied, preserve the native-session review scope and prepare a first local Rust implementation.

### How checked

`make check`: HTML structure, embedded assets, optional inline JavaScript syntax and Markdown links, including untracked documentation. Earlier local Chromium review covered 19 fixtures, eight widths, themes, focus, snapshots, notes, reload and undo. The latest drawer animation was visually inspected. All session evidence is synthetic; no native connector or production backend is included.

### Review requirements

- Confirm the exact current tree against the empty main, including LICENSE and SECURITY.
- Attach representative desktop/mobile captures from local `screens/`.
- Link the [Notion handoff](https://app.notion.com/p/3f3eba09656f81698720d623e045982e), use cases and ADRs.
- Record maintainer review and CI results before merge. Check branch protection and mergeability when opening the PR.

## Readiness

Ready for baseline review and the first scoped development slice. Publication is authorized through a pull request; maintainer review and merge remain pending. Storage, frontend framework, first native source and event rules are decisions for their respective implementation steps.

## Vérifications de la publication

Suivi : [issue #12](https://github.com/boussecsou/relai/issues/12). Les 47 fichiers de la baseline ont été copiés avec vérification de leurs empreintes SHA-256. `AGENTS.md` est conservé sans modification et `screens` reste ignoré. Des captures de revue sont ajoutées dans `design/relai-inbox/screenshots/`.

Le 9 octobre, `make check` et `git diff --check` passent. Une revue Chromium du checkout d’intégration couvre les 16 sessions visibles dans l’inbox à 1440 et 390 pixels, l’ouverture/fermeture de l’inspecteur et une recherche vide ; aucune erreur JavaScript n’est observée. Les captures couvrent les deux thèmes et l’inspecteur. La revue plus large des 19 fixtures décrite ci-dessus appartient à la session précédente. Les contrôles CI et la revue du mainteneur seront vérifiés sur la PR.

Les snapshots temporaires restent des sauvegardes locales ; la branche publiée et le commit de la PR constituent la référence durable.
