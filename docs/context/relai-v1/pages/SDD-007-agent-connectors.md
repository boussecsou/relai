# SDD-007 — Connecteurs, terminaux et compatibilité

Date de consolidation : 4 octobre 2026. Statut : **UI intégrée en simulation ; connecteurs natifs à construire**.

## Contrat proposé

Un connecteur par agent. Découverte de l’exécutable/version, ouverture et reprise, capacités de modèles/modes/configuration, envoi et événements, approbations, historique et terminal uniquement quand possibles. UI commune alimentée par capabilities ; extension isolée du reste de Relai.

Codex : app-server JSON-RPC et méthodes thread/turn/config/skills. Claude Code : SDK/programmatique, options dépendantes de version. OpenCode : serveur HTTP et événements, sessions et statuts ; ne pas lancer automatiquement un second serveur pour une session TUI existante. Pi : RPC JSONL. Gemini et Aider : modes headless/programmatique utiles, mais les sources consultées ne démontrent pas toutes les capacités interactives voulues.

ACP peut mutualiser une partie des échanges chez les agents compatibles ; ce n’est pas la garantie d’un même contrôle de modèle, effort, skills et terminal pour tous. MCP porte des outils/ressources, pas un protocole universel de sessions.

## Propriété et sécurité d’exécution

Un seul propriétaire de processus. Distinguer session Relai-controlled, serveur attachable, historique reprenable et terminal externe inconnu. Détection dans les fichiers ≠ preuve d’activité ni contrôle. Une nouvelle exécution n’est pas créée automatiquement lorsqu’une session pourrait être active ailleurs.

Le terminal est une vue optionnelle : sorties d’activité, console d’un processus possédé, ou TUI attachable si interface native le permet. Les sorties de commande ne sont pas présentées comme le miroir d’un terminal externe. Masquer le terminal n’arrête pas le processus. Ne pas faire du parsing de TUI le contrat principal.

## Mise à jour des agents

Pas nécessairement de mise à jour Relai à chaque release d’agent. Utiliser négociation/version/capacités, tests de contrat et états Supported / Agent updated / Unsupported interface / Executable missing. Une rupture du protocole ou un changement de sémantique peut toutefois nécessiter un correctif de connecteur. Ne pas promettre une compatibilité future automatique.

## Configurations particulières

L’héritage des réglages doit être vérifié par version. Les types Claude SDK consultés exposent setting_sources et skills ; leurs valeurs par défaut peuvent différer de versions antérieures. Codex/OpenCode gardent un modèle de catalogue/héritage dans les concepts ; absence de toggle dans la maquette ne signifie pas impossibilité native éternelle.

## Maquettes séparées

[Galerie](../assets/relai-design/terminal-concepts/index.html), [Session workspace](../assets/relai-design/terminal-concepts/01-session-workspace.html), [Agent profiles](../assets/relai-design/terminal-concepts/02-agent-profiles.html), [Session connections](../assets/relai-design/terminal-concepts/03-session-connections.html). Les actions et états sont simulés ; les choix restent proposés.
