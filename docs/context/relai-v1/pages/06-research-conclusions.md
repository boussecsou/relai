# Recherche, sources et conclusions

Date de consolidation : 4 octobre 2026. Statut : **Sources consultées ; runtime non vérifié**.

## Sources conservées

Les documents complets du dépôt conservent la recherche initiale sur découverte locale, API/MCP et modularité. L’exploration terminal du 4 octobre 2026 conserve les snapshots officiels et leur manifeste : URL, date, SHA-256, taille et résultat de lecture. Les branches main/dev peuvent évoluer ; ces captures ne certifient pas la version installée chez l’utilisateur.

[Étude terminal détaillée et liens officiels](../assets/relai-design/terminal-concepts/TERMINAL-INTEGRATION.md), [manifeste des sources](../assets/relai-design/terminal-concepts/research/sources.json), [recherche API/MCP](../sources/repository-docs/research/local-service-api-mcp.md), [découverte locale](../sources/repository-docs/research/local-session-discovery.md), [modularité](../sources/repository-docs/research/scalability-and-modularity.md).

## Conclusions

1. Des interfaces natives permettent le pilotage sans automatiser visuellement un terminal.
2. Les agents partagent certains concepts, leurs interfaces et configurations restent différentes ; isoler les connecteurs.
3. Historique, connexion contrôlée et terminal actif doivent avoir des états distincts.
4. Hériter de la configuration native évite une deuxième source de vérité ; vérifier précisément les overrides.
5. Relai peut rester une inbox simple tout en proposant les réglages supportés dans un panneau secondaire.
6. Aucun standard étudié ne couvre universellement tous les réglages, skills et terminaux.
7. Les versions compatibles doivent être testées ; un contrat cassé exigera parfois une mise à jour Relai.
8. La file durable et les événements d’envoi doivent éviter les doublons et les promesses exactly-once non démontrées.

## Limites des sources

Deux chemins Codex ont retourné 404 et figurent comme indisponibles ; aucune conclusion ne dépend de leur contenu. Le fichier Gemini nommé gemini-acp dans le manifeste est une spécification IDE companion : il ne constitue pas une preuve de support ACP. Codex config/skills sont des fichiers de renvoi à la documentation, pas un inventaire complet de configuration. Aucun harness réel n’a été exécuté dans ces validations de maquettes.
