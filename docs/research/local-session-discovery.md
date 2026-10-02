# Relai — découverte des sessions locales

Recherche du 30 septembre 2026. Statut : faits vérifiés et propositions d’adaptateurs ; les interfaces décrites sont le contexte de recherche initial. La première découverte passive est désormais implémentée suivant [la révision graphique](gui-and-session-discovery.md) et [ADR-003](../adr/0003-passive-catalogue-and-blank-inbox.md).

La livraison suivante ajoute la reprise Codex dans un moteur Relai via le même ID natif, sans prise de contrôle du CLI externe. Lire et découvrir restent sans lancement de moteur ; l’envoi graphique des autres outils reste indisponible. Leurs terminaux natifs à la demande sont décrits dans [SDD-006](../sdd/0006-native-terminal.md). Voir [l’implémentation d’envoi](codex-delivery.md) pour les versions, la persistance, les limites d’historique et la récupération.
Besoin : découvrir automatiquement harnesses et chats conservés, afficher titre + harness + dossier, distinguer activité réelle et historique, puis répondre dans la même session native.

## Interfaces natives vérifiées

| Harness | Historique et métadonnées | Activité réellement observable | Réponse/reprise |
| --- | --- | --- | --- |
| Codex | App-server `thread/list` paginé, `thread/read`, titre `name` si défini, filtre `cwd` ; sources CLI/exec/appServer et archives | État du serveur interrogé : `notLoaded`, `idle`, `active`, `systemError` ; événements et liste des threads chargés | `thread/resume` puis `turn/start` ; pilotage live lorsque connecté au moteur détenteur |
| Claude Code | SDK `list_sessions`/`listSessions`, `get_session_info`, `get_session_messages` ; ID, titre/summary, `cwd` optionnel, dates, pagination | Liste disque sans état live ; événements du processus SDK contrôlé, ou canal explicitement activé | `resume` avec ID natif ; injection dans une session active via channel configuré |
| OpenCode | CLI `session list`, export ; serveur `/session`, `/session/:id/message` ; types `Session` avec `title`, `directory`, ID | `/session/status` et événements SSE du serveur accessible ; statuts `idle`, `busy`, `retry` | API message/prompt ou CLI `run --attach … --session …` ; TUI `attach` au backend |
| Pi | Sessions JSONL versionnées, `SessionManager`, nom optionnel et `cwd` dans l’en-tête ; RPC `get_messages` pour la session du processus | RPC `get_state` : streaming, compaction, messages pending ; événements du processus connecté | `--session`/`--resume`, ou RPC de session déjà contrôlée |

Sources du tableau : [Codex app-server](https://learn.chatgpt.com/docs/app-server), [Claude SDK Python](https://code.claude.com/docs/en/agent-sdk/python), [Claude sessions](https://code.claude.com/docs/en/agent-sdk/sessions), [Claude channels](https://code.claude.com/docs/en/channels), [OpenCode CLI](https://opencode.ai/docs/cli/), [OpenCode serveur](https://opencode.ai/docs/server/), [types OpenCode](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts), [Pi format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md), [Pi RPC](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc-commands.md).

## Stockage et limites de contrat

- Codex stocke son état sous `CODEX_HOME`, par défaut `~/.codex`, avec historique/configuration et éventuellement `auth.json`. App-server lit les logs enregistrés et peut réparer les métadonnées ; `useStateDbOnly` évite ce scan. Une liste sans `sourceKinds` explicite ne couvre par défaut que CLI et VS Code ; il faut aussi interroger les archives pour les inclure. `notLoaded` ne prouve pas qu’aucun autre processus ne travaille. [Configuration](https://learn.chatgpt.com/docs/config-file/config-advanced), [App-server](https://learn.chatgpt.com/docs/app-server).
- Claude documente `~/.claude/projects/<encoded-cwd>/*.jsonl`, avec overrides `CLAUDE_CONFIG_DIR` et nom de projet. Les SDK offrent une liste tous projets et lecture ciblée ; préférer ces fonctions au décodage des noms de dossiers. Un titre et `cwd` peuvent manquer. [Sessions](https://code.claude.com/docs/en/agent-sdk/sessions), [SDK Python](https://code.claude.com/docs/en/agent-sdk/python).
- OpenCode documente sa racine `~/.local/share/opencode` et la commande `db path`. Les interfaces CLI et serveur doivent être préférées à un lecteur figé sur une description de stockage. Les types générés sont liés au code/version du harness, pas une promesse de stabilité du schéma SQLite. [Stockage](https://opencode.ai/docs/troubleshooting/), [CLI](https://opencode.ai/docs/cli/), [types](https://github.com/anomalyco/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts).
- Pi sauvegarde dans `~/.pi/agent/sessions`, groupé par dossier, sauf `--no-session`. `--session-dir`, `PI_CODING_AGENT_SESSION_DIR` ou configuration changent la racine. JSONL possède versions et branches `id/parentId` ; le nom de dossier encodé ne remplace pas le `cwd` de l’en-tête. Les anciens formats migrent au chargement : un lecteur Relai doit lire sans charger une session native pour ne pas la modifier. [Sessions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md), [Format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md).
- Aucun contrat consulté ne garantit une compatibilité indéfinie des fichiers internes de tous ces outils. Préférer API/SDK natifs ; borner les parseurs de secours aux versions testées et préserver les champs inconnus. Le code actuel de Pi construit certaines métadonnées en parcourant les messages : une fonction de listing native n’est pas à supposer gratuite. [SessionManager Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts).

## Distinctions nécessaires

Détection installation ≠ découverte historique ≠ connexion au runtime ≠ droit/capacité de contrôle.
Un PID, un fichier récent ou une session enregistrée n’établit pas seul une association fiable entre processus et chat. L’absence de nouvelles écritures ne signifie pas « terminé » : une session peut attendre une question, permission, modèle ou réseau.
Un app-server lancé à côté d’un Codex externe ne prouve pas la prise de contrôle de ce terminal. Les interfaces documentent un moteur exposé et une reprise d’historique ; la découverte globale de tous les TUI indépendants doit être prototypée par harness. [Codex app-server](https://learn.chatgpt.com/docs/app-server).
Le dossier enregistré de la session, le dossier d’une commande et le dossier courant observé d’un processus peuvent différer ; afficher la provenance plutôt qu’inventer une mise à jour automatique.

Les racines d’outils peuvent contenir authentification et transcriptions riches. Relai ne doit importer que les données de session nécessaires, en laissant les credentials au harness/runner. Les transcriptions peuvent elles-mêmes contenir contenu de fichiers et sorties de commandes sensibles. [Codex configuration](https://learn.chatgpt.com/docs/config-file/config-advanced), [OpenCode stockage](https://opencode.ai/docs/troubleshooting/), [Pi sessions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md).

## Stratégie proposée pour Relai

1. Découvrir exécutables/version et racines pour l’utilisateur et l’environnement du runner ; garder historiques même si le binaire a été désinstallé. Sous WSL, Windows, chaque distribution et chaque utilisateur forment des périmètres distincts ; ne pas annoncer « toute la machine » depuis un seul PATH Linux.
2. Construire un index local initial en arrière-plan : métadonnées et références natives d’abord, messages à la demande. Paginer l’UI immédiatement, sans attendre la fin de toutes les lectures.
3. Maintenir curseurs, taille/mtime et positions JSONL ; traiter uniquement les fichiers modifiés, rotations et suppressions. Combiner événements API, surveillance des racines et réconciliation bornée après interruption ; éviter un scan complet récurrent.
4. Traiter une ligne JSONL finale incomplète comme écriture en cours ; dédupliquer par ID natif et identité du store. Détecter remplacement/troncature avant de reprendre un offset.
5. Définir capabilities par adaptateur : `discover_history`, `read_history`, `rename`, `resume`, `observe_live`, `send_live`, `approvals`, `terminal`. Une interface non disponible reste explicitement indisponible.
6. Conserver séparément disponibilité du binaire, présence de l’historique, état observé et contrôlabilité. Afficher « état inconnu », avec source/date d’observation, dès qu’un statut live n’est pas prouvé.
7. Répondre avec l’ID natif de la session choisie ; « Nouvelle session » crée un ID et lui assigne un nom via l’API adaptée. L’envoi à une session externe occupée attend une règle de contrôle vérifiée ; ne pas la dupliquer automatiquement.
8. Superviser les processus du runner indépendamment du navigateur ; fermer le navigateur ne termine pas le moteur. Reconnexion et redémarrage réconcilient les états persistés et natifs.

## Validation avant promesse de couverture

Tester par version : chats nommés/sans titre, anciens/archivés, stores personnalisés, harness désinstallé, dossier déplacé, session active externe, attente d’approbation, deux moteurs, rotation et suppression.
Vérifier que découvrir/lire ne reprend ni ne modifie une session, que le destinataire garde son ID, et qu’aucune réponse ne lance deux exécutions concurrentes sur le même chat.
Mesurer index initial/incrémental avec 10 000 chats et 25 sessions ; ces chiffres sont une cible, pas une performance acquise.
Les sessions éphémères non persistées ou les processus sans protocole exposé empêchent une garantie universelle « tous les chats et leur activité exacte » ; les détecter lorsqu’un canal réel existe, sinon afficher la couverture et l’incertitude.
