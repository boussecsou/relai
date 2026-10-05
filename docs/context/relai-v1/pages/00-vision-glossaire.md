# Vision, périmètre et glossaire

Date de consolidation : 4 octobre 2026. Statut : **Décisions confirmées**.

Relai est une interface locale de messaging pour des agents de code. Le navigateur sert à composer, retrouver et lire les prompts et réponses. Le moteur natif devra gérer les agents installés et les processus ; la maquette HTML ne le fait pas.

## Vocabulaire actuel

| Terme | Sens | Exemple |
| --- | --- | --- |
| Relai | Un prompt titré envoyé à une session, présenté avec sa conversation | « Simplify navigation » |
| Session native | Historique et identité propres à l’agent, indépendant des titres Relai | Codex, ID natif, dossier relai |
| Processus / connexion | Exécution ou serveur permettant de piloter une session | Processus appartenant à Relai |
| Conversation Relai | Présentation des échanges associés à ce Relai dans l’inbox | Prompt initial, réponse, Reply |
| Projet | Organisation visible dans la sidebar | relai, website, api |
| Agent | Harness de coding ; distinct du modèle utilisé | Codex, Claude Code, OpenCode |
| Run / turn | Période de travail native ; terme technique à préciser par connecteur | Prompt accepté puis exécution |
| Skill | Instructions et ressources natives découvertes ou invoquées par l’agent | Disponibilité distincte de l’utilisation |

Une session peut recevoir plusieurs Relais avec des titres indépendants. Sessions liste les sessions natives ; l’inbox et ses catégories listent les Relais. Reply poursuit la session déjà associée et ne redemande pas de titre.

## Périmètre confirmé

Usage local, interface navigateur, agents installés, dossier comme point d’entrée, Markdown, inspiration Gmail et Notion, deux thèmes, ordinateur prioritaire. Pas de connexion GitHub obligatoire pour composer. Pas de transfert entre agents dans le périmètre actuel.

La maquette s’ouvre directement sans installation. Elle simule les envois, agents, dossiers, Git et terminaux. Les brouillons et préférences du prototype sont stockés dans le navigateur lorsque disponible. Le produit cible un stockage durable dans le service local.

## Hiérarchie documentaire

Les décisions explicites les plus récentes de l’utilisateur priment. Les notes UX actuelles décrivent la maquette livrée. Les SDD consolidés ci-dessous traduisent la direction actuelle ; les nouveaux réglages/terminaux sont des propositions. Les documents originaux restent conservés, même lorsque leur terminologie est remplacée.

Sources : [direction originale](../sources/repository-docs/product-direction.md), [journal UX actuel](../assets/relai-design/UX-NOTES.md), [registre des décisions](01-decisions.md).
