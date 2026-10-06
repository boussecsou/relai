# Reprendre Relai v1

Sauvegarde du 5 octobre 2026. Branche : `feat/relai-v1-workspace-and-context`.

## Lire en premier

1. [Décisions actuelles et exclusions](relai-v1/pages/01-decisions.md).
2. [Journal UX/UI complet](../../design/relai-v1/UX-NOTES.md).
3. [Changelog des modifications](../../design/relai-v1/CHANGELOG-UI.md).
4. [Vision et glossaire actuel](relai-v1/pages/00-vision-glossaire.md).
5. [SDD et recherches consolidées](relai-v1/Relai-v1.md).

## Fichiers de travail

- Interface actuelle : [design/relai-v1/index.html](../../design/relai-v1/index.html), autonome, sans installation.
- Sources : app-shell.html, app.js, app.css, runtime.js, runtime.css, app-icons.json et build-preview.py dans le même dossier.
- Reconstruction : `python3 design/relai-v1/build-preview.py` depuis la racine du dépôt.
- Concepts de terminaux : design/relai-v1/terminal-concepts/ ; explorations antérieures conservées.
- Audit, captures et preuves : design/relai-v1/audit/, dont terminal-integrated/ (22 contrôles d’intégration et six de régression archivés).
- Export documentaire intégral : docs/context/relai-v1/ (Markdown, cinq bases CSV, sources et assets).
- Archives téléchargeables : archives/relai-v1/.
- Couverture de sauvegarde et hashes : docs/context/backup-coverage.json.

## Contraintes et état réel

Interface anglaise, Gmail compact / Notion sobre, libellé exact Compose relai. Codex bleu, Claude orange, OpenCode gris ; dégradés discrets, thèmes clair/sombre, ordinateur prioritaire. Pas de Forward/emoji, gros trait bleu, phrase Your workspace in focus, wizard à étapes, GitHub obligatoire ni nouveau mode focus.

Une session native reçoit plusieurs Relais, chacun avec son titre indépendant. Sessions liste les sessions natives. Reply conserve la session. Composer garde plusieurs brouillons ; navigation et réponse accessibles sans parcourir toute la conversation.

Session workspace intégré : Overview, Activity, Terminal, Settings, Skills, Profiles. Modèle/effort/comportement séparés des permissions, overrides par ID de session pour le prochain prompt. Connexions, catalogues, skills, approbations, sorties et envois sont simulés. Aucun agent réel, terminal natif ni opération Git n’a été intégré.

Architecture du dépôt : service Rust, UI TypeScript/React, SQLite, Git CLI, Linux/WSL en premier ; connecteur par agent. Les contrats natifs et compatibilités réelles restent à valider. L’HTML n’est pas l’application de production.

Les anciens documents docs/sdd et CONTEXT.md sont conservés. Certaines décisions historiques y sont remplacées par les notes plus récentes : Projects, titre indépendant, palettes/couleurs et interface actuelle. Les snapshots dans l’export restent verbatim.

Aucune publication Notion réalisée : outil indisponible lors de la préparation. La page cible et le guide d’import se trouvent dans l’export. Les paths /workspace d’anciens manifestes sont des références de provenance, pas une obligation de travailler hors Git.

Les données du navigateur (brouillons, étoiles, préférences) ne sont pas des fichiers de projet et ne sont pas archivées dans Git. Aucun secret ni répertoire interne .codex/.aws/.git de l’environnement n’est inclus.

## Pour les sessions suivantes

Sélectionner cette branche et lire ce guide avant toute modification. Continuer dans les chemins du dépôt. Préserver sources, licences, décisions rejetées et historique. Ajouter date, motif, impact et vérifications au journal UX à chaque changement. Ne pas affirmer des intégrations natives ou des tests non exécutés.
