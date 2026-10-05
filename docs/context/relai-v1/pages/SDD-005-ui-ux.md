# SDD-005 — Interface complète et thèmes

Date de consolidation : 4 octobre 2026. Statut : **Implémenté dans la maquette**.

## Direction visuelle

Gmail pour l’organisation, Notion pour la sobriété ; densité compacte sans textes minuscules. Interface anglaise, IBM Plex, icônes Lucide, gradients discrets. Codex bleu, Claude orange, OpenCode gris ; noms textuels et statuts toujours présents.

Clair et sombre conçus comme deux palettes, avec contrastes des textes secondaires, séparation fenêtre/fond et sélection claire Existing/New. Non-lu par point stable et titre renforcé. Focus clavier distinct de survol et sélection ; reduced-motion respecté. Thème System et densité Compact/Comfortable conservés dans Settings.

## Blocs de navigation

En-tête de conversation fixe, corps défilant, pied Reply fixe. Messages anciens repliés avec aperçu ; dernier message ouvert. Expand all/Collapse all cohérent avec les ouvertures individuelles. Recherche surlignée, compte et navigation seulement dans les messages correspondants. Open in new window montre seulement la conversation.

Reply ouvre le petit éditeur au clic. Pas de Forward, emoji ni mode focus ajouté. Navigation contextuelle et navigateur avec restauration du scroll/focus.

## Markdown

Écriture et aperçu dans Compose et Reply. Titres, gras, listes, tâches, citations, tableaux, liens, code avec langage et Copy. Marked 17.0.5 sous MIT, filtrage des éléments/attributs/protocoles ; HTML brut affiché en texte, images distantes comme références sans chargement automatique. Le filtrage est vérifié par cas ciblés, pas par audit de sécurité exhaustif.

## Paramètres et outils

Appearance, exemples de commandes d’agents, favoris dossiers, raccourcis. Barre d’outils facultative masquée par défaut ; Notes accessible depuis Tools. Préférences focus préservé et retour de sauvegarde exact. Les commandes affichées sont des exemples jamais exécutés.

## Git

Résumé de dossier/worktree, branche et snapshot daté ; détails à la demande. Deux sessions dans le même dossier partagent le même contexte Git ; pas d’attribution automatique de changements à l’agent. Cas sans dépôt, detached HEAD, conflit, branche modifiée, snapshot périmé. Aucune opération Git réelle.

## Vérification

14 groupes de scénarios d’implémentation, six contrôles finaux et mesures ciblées de contraste, sans erreur JS sur les parcours testés. Pas de certification WCAG, tests utilisateurs, lecteur d’écran complet ou clavier mobile natif. Ordinateur prioritaire ; responsive existant conservé.

[Audit et journal complets](../assets/relai-design/CHANGELOG-UI.md), [preuves](07-validation-limites.md), [SDD historique remplacé](../sources/repository-docs/sdd/0005-inbox-ui-ux.md). Les anciennes palettes teal/lilac, système-fonts et absence de gradients ne sont plus les règles actuelles.
