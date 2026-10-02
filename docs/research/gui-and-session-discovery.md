# Interface graphique et découverte passive

Recherche et application du 30 septembre 2026. Cette révision remplace la priorité donnée au terminal dans les prototypes précédents.

> Le présent document conserve la recherche de l’étape passive. L’envoi Codex, les files et la programmation ont depuis été implémentés ; voir le [contrat actuel](codex-delivery.md). Découverte/lecture restent passives. Le terminal natif à la demande et la révision visuelle du 2 octobre sont décrits dans [SDD-006](../sdd/0006-native-terminal.md) et [la recherche UI](inbox-and-terminal-ux.md). Les sections suivantes décrivent la livraison passive historique.

## Applications comparées

Le scanner de T3 lit les historiques Claude et Codex avant toute importation. Son assistant sépare sélection d’un historique et importation d’une session ; il expose chargement, erreurs, reprise et résultats tronqués. Relai reprend cette séparation : découverte → Sessions → lecture, sans lancement d’agent. Sources : [scanner T3](https://github.com/pingdotgg/t3code/blob/c2fa9fc911daeac97df4760f95fc57dca42b84c8/apps/server/src/project/AgentSessionScanner.ts), [importateur](https://github.com/pingdotgg/t3code/blob/c2fa9fc911daeac97df4760f95fc57dca42b84c8/apps/server/src/project/AgentSessionImporter.ts), [assistant](https://github.com/pingdotgg/t3code/blob/c2fa9fc911daeac97df4760f95fc57dca42b84c8/apps/web/src/components/onboarding/WelcomeWizard.tsx).

Herdr distingue activité de terminal et état de session, avec processus au premier plan, écran et hooks. Ces observations concernent les terminaux supervisés ; elles ne constituent pas une découverte universelle des sessions externes. Relai n’utilise donc pas la date d’un fichier pour afficher « en cours ». [États de session Herdr](https://herdr.dev/docs/session-state/).

## Lecture sans lancement ni migration

| Outil | Lecture utilisée | Limite explicite |
| --- | --- | --- |
| Codex | state_*.sqlite, JSONL sessions/archives, session_index.jsonl | Colonnes introspectées ; aucun app-server lancé |
| Claude Code | En-tête/fin JSONL projects, nom choisi prioritaire, arbre uuid/parentUuid | Aucune reprise SDK |
| OpenCode | SQLite sessions, messages/parts et variante session_message | Schéma inconnu → couverture partielle |
| Pi | En-tête JSONL, session_info, arbre id/parentId | Aucun chargement du moteur natif pouvant migrer les fichiers |

Codex conserve métadonnées et références des rollouts dans son état SQLite. Le nom choisi et la récence d’une conversation ne sont pas le même événement. [Métadonnées Codex](https://github.com/openai/codex/blob/67727e7cf114cf3e1b71db368d74b24e32f6cb12/codex-rs/state/src/model/thread_metadata.rs), [index des noms](https://github.com/openai/codex/blob/67727e7cf114cf3e1b71db368d74b24e32f6cb12/codex-rs/rollout/src/session_index.rs).

Le lecteur Claude emploie des fenêtres en début/fin de fichier pour les métadonnées, puis lit les messages séparément. Relai suit cette organisation et met en cache les fichiers inchangés. [Session browser Claude](https://platform.claude.com/cookbook/claude-agent-sdk-05-building-a-session-browser), [SDK](https://github.com/anthropics/claude-agent-sdk-python/blob/bbf09e3c11d3c5f2cfa2d9cf20af9b3abdfc1b4a/src/claude_agent_sdk/_internal/sessions.py).

OpenCode expose un stockage SQLite évolutif ; Pi conserve des historiques avec branches et migrations. Le listing via une commande ou le chargement via leur moteur n’est pas retenu pour cette phase passive. [Schéma OpenCode](https://github.com/anomalyco/opencode/blob/2fa3363c924c5c3e367b84a87ae478296a0ed59b/packages/core/src/session/sql.ts), [sessions Pi](https://github.com/earendil-works/pi/blob/db6cc71dc7b69202dc560e71106bb9dfd454e758/packages/coding-agent/src/core/session-manager.ts).

Les bases vivantes sont ouvertes en lecture seule avec query_only et délai borné. Elles ne sont pas copiées sans WAL et ne sont pas déclarées immutable. [SQLite WAL](https://sqlite.org/wal.html), [paramètres URI](https://sqlite.org/uri.html).

La surveillance de fichiers ne suffit pas pour tous les montages, notamment sous WSL. Relai la combine avec une réconciliation toutes les 30 secondes. [Limites de notify](https://docs.rs/notify/latest/notify/#known-problems).

## UI appliquée

Référence prioritaire : design/relai-glass.html, SDD-005 et décisions de l’utilisateur. Manrope embarquée, graphite/blanc, accents teal/lilas/pêche, gradient périphérique statique, navigation 220 px, lignes 64 px ou 48 px. Corps 14 px, métadonnées 12 px. Parcours liste pleine largeur → conversation → retour conservant la position → réponse dans un brouillon graphique.

L’Inbox commence vide et reste distincte des historiques détectés. Libellés et brouillons ne sont pas préremplis. Une réponse garde l’identité native et ne demande pas un nouvel objet. Une nouvelle destination conserve agent, dossier et titre sans ouvrir de processus.

## Éditeur

Tiptap 3 avec Markdown, tables et tâches fournit Visuel, Markdown et Aperçu. L’extension Markdown est en bêta et documente des limites pour commentaires et cellules complexes. Le Markdown brut reste la référence sauvegardée ; Relai compare les tokens avant/après conversion avant de permettre une modification visuelle. Une différence revient en Markdown sans remplacer le contenu. [Documentation Tiptap Markdown](https://tiptap.dev/docs/editor/markdown).

La sauvegarde est différée de 500 ms et sérialisée. Les révisions SQLite empêchent l’écrasement par un autre onglet ; une copie peut être enregistrée après conflit. Les tests navigateur vérifient contenu, reprise, conflits, tâches, liens, tableaux, code et commentaires non pris en charge.

## Limites vérifiables

Périmètre : utilisateur de l’environnement Linux/WSL courant, sans Windows, autres distributions ou autres utilisateurs. États live, envoi, file, programmation et terminal sont différés.

Catalogue paginé par 100 côté SQLite ; messages paginés par 50 côté HTTP. Un JSONL demandé est néanmoins lu entièrement dans une limite de 64 Mio, avec entrée de 1 Mio maximum. L’indexation intégrale commence après la découverte. La fenêtre de métadonnées peut manquer un nom situé au milieu d’un gros fichier. Schémas inconnus et lectures impossibles sont signalés sans réparation native. Le cache garde les références des fichiers disparus, notamment pour les brouillons ; la lecture signale leur absence.

Le test à 10 000 lignes mesure pagination et comptage locaux, sans garantie universelle de performance.
