# Registre des décisions et exclusions

Date de consolidation : 4 octobre 2026. Statut : **Consolidé**.

Les exigences explicites et les choix de réalisation ne sont pas équivalents à une validation utilisateur de chaque détail. La base CSV précise cette distinction ; les journaux originaux gardent les motifs et vérifications.

## Décisions explicites de l’utilisateur

- Interface inspirée de Gmail, plus compacte et calme, proche de Notion ; textes de l’interface en anglais.
- Libellé exact **Compose relai** ; **Title**, **Send prompt**, **Cancel** ; conserver **One prompt. One title. Your chosen session.**
- Sidebar avec **Sessions**, **Projects**, Inbox, Starred, Pending, Sent, Drafts ; exemples concrets dans chaque boîte et dans Settings.
- Codex bleu, Claude orange, OpenCode gris ; tags agent, dossier/repo, session visibles avant ouverture.
- Dégradés discrets sur boutons et saisie ; sélections clairement visibles en thème sombre ; point non-lu discret en plus du titre renforcé.
- Deux accès directs dans Compose : Existing session et New session. Nouveau : agent et dossier local, dossiers récents/favoris et saisie d’un autre chemin.
- Titre du Relai indépendant du nom de session native ; plusieurs Relais par session.
- Compose fonctionne comme une fenêtre : minimiser, agrandir, fermer, sauvegarder dans Drafts ; commandes accessibles sans remonter le contenu.
- Conversation structurée en blocs ; Reply disponible en bas à tout moment, éditeur ouvert après clic ; navigation et sortie accessibles sans remonter.
- Open in new window n’affiche que la conversation ; Markdown pour les messages et l’éditeur.
- Documenter toutes les modifications et leurs motifs ; implémenter les remarques de l’audit ; ordinateur prioritaire, mobile conservé.
- Dernière demande : conserver décisions, recherches, configurations, conclusions et SDD dans la page Notion indiquée.

## Exclusions à conserver

Pas de gros trait bleu sur les réponses, Forward, emoji ajouté, phrase « Your workspace in focus », nouveau mode focus, wizard à étapes, connexion GitHub imposée, ni changement de Cancel en un autre libellé. Le logo futur n’est pas demandé maintenant.

## Choix réalisés pendant l’audit

IBM Plex et Lucide embarqués ; Marked avec filtrage HTML/liens ; sélection accessible et focus distinct ; persistance des non-lus/étoiles/brouillons ; navigation contextuelle avec scroll restauré ; filtres réinitialisables et actions collectives ; export Markdown ; détails Git à la demande ; outils latéraux facultatifs ; tests ciblés de contraste et parcours. Ces détails répondent au mandat d’implémentation de l’audit, sans constituer une certification complète.

## Architecture retenue dans les sources du dépôt

Service natif Rust, UI TypeScript/React servie localement, SQLite, Git CLI, Linux/WSL en premier ; un adaptateur par agent. API partagée, MCP ultérieur. Docker/Tauri restent des extensions possibles. Packaging, authentification exacte, Windows natif et synchronisation multi-machine restent à définir.

## Propositions encore ouvertes

Panneau Session workspace ; profils d’agent héritant du natif ; commandes modèle/effort/mode/skills selon capacités ; table de connexions ; intégration ACP partielle ; contrat précis de livraison et de reprise. L’utilisateur a demandé leur intégration dans index.html : panneau et interactions sont maintenant réalisés en simulation. Les contrats/capacités natives restent à valider et ne sont pas implémentés dans le moteur.

Références complètes : [UX-NOTES](../assets/relai-design/UX-NOTES.md), [CHANGELOG-UI](../assets/relai-design/CHANGELOG-UI.md), [audit initial](../assets/relai-design/audit/AUDIT-UI-UX.md), [choix des concepts](../assets/relai-design/terminal-concepts/UX-DECISIONS.md).
