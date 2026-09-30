# Prototype inbox Glass

Inbox → lecture du Relai → terminal du même chat à la demande. Lire ou recevoir un mail ne démarre aucun agent. Le prototype conserve les surfaces, la police Manrope et les accents du design Glass ; thèmes sombre/clair, densité compacte et réduction du mouvement sont disponibles.

Depuis la racine :

```bash
npm --prefix design/inbox-prototype ci
npm --prefix design/inbox-prototype start
```

Ouvrir http://127.0.0.1:4176. Prérequis : Node.js récent, Python 3, Linux/WSL et Codex CLI installé avec sa connexion habituelle. Le premier prototype sur 4174 est indépendant ; ce serveur ne reprend ni n’arrête ses terminaux.

## Parcours

- Les cinq mails initiaux sont des exemples signalés, sans processus agent.
- Une ligne affiche titre, harness, dossier, branche, libellés, ticket, aperçu et état. Recherche dans titres et contenu ; filtres `agent:`, `harness:`, `folder:`, `directory:`, `branch:`, `label:` et `ticket:`.
- Le clic ouvre les messages avec rendu Markdown nettoyé. Favoris, archives, sélection multiple, libellés, navigation précédente/suivante et densité sont utilisables.
- « Tâches à revoir » filtre le libellé « À revoir ». Les tickets sont des références locales, sans intégration GitHub ou autre gestionnaire.
- « New session » demande agent, dossier et titre ; premier prompt, libellé et ticket sont optionnels. Cette action seule lance le CLI et crée la conversation.
- Les réponses finales Codex arrivent automatiquement grâce à une commande `notify` définie pour cette invocation. Aucun fichier de configuration global n’est modifié. Les messages gardent leur chat natif ; les identifiants de tour évitent les doublons.
- Un lecteur `codex app-server` vérifie uniquement les métadonnées du chat reçu (`thread/read`, sans lancement ni reprise) pour écarter les notifications de travail interne et de sous-agents. Il n’est pas un second pilote du terminal.
- « Terminal du chat » rejoint exclusivement le processus déjà associé. Les commandes `/`, skills, menus, couleurs et validations restent natifs. Mode focus et contrôle explicite entre panneaux sont disponibles.
- Une réponse peut être préparée dans la conversation, prévisualisée et copiée. « Copier et répondre dans le terminal » ouvre ce même terminal ; coller et envoyer restent des actions manuelles.

## Limites du prototype

Les chats externes et les historiques Codex préexistants ne sont pas importés ici. La réception automatique couvre uniquement les sessions Codex lancées par ce serveur. Les questions, validations et sorties intermédiaires restent dans le CLI ; `notify` transmet la réponse finale. Claude Code et Pi apparaissent dans les exemples, sans adaptateurs exécutables.

Node/Python servent à valider le parcours, sans remplacer le futur moteur Rust/React/SQLite. Messages, labels et brouillons sont en mémoire ; recharger perd les brouillons, arrêter le serveur perd les conversations locales et arrête ses propres processus. Masquer le terminal ou fermer le navigateur laisse ces processus tourner. L’historique natif reste géré par Codex. Aucun import ni reprise d’un historique externe n’est proposé implicitement.

Plafonds : 200 conversations affichées, 12 terminaux actifs, 3 000 lignes de terminal. Pas encore de virtualisation, file d’envoi, programmation, pièces jointes Git ou stockage persistant. La branche est relevée au lancement et à réception, sans suivi d’un changement de dossier interne au CLI. La palette améliore le rendu ANSI émis par l’agent, sans recolorer arbitrairement ses propres écrans.

Le serveur écoute uniquement sur loopback, protège les mutations par origine et cookie, et réserve une clé indépendante aux notifications natives. Les assets sont locaux. Manrope est extraite de la maquette, avec licence [SIL OFL](../fonts/Manrope-OFL.txt).

Mode de vérification sans modèle : `RELAI_INBOX_COMMAND=bash RELAI_INBOX_PORT=4177 npm --prefix design/inbox-prototype start`. Un callback de test peut être émis depuis ce Bash avec `python3 /chemin/vers/notify.py '<événement JSON>'` ; ses clés restent dans l’environnement du processus.

Sources : [notification native Codex](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications), [API d’historiques distincte de la reprise](https://learn.chatgpt.com/docs/app-server), [nettoyage DOMPurify](https://github.com/cure53/DOMPurify).

Cas reproduit avec Codex CLI 0.159.0 : le travail interne de génération de titre émet aussi une notification de fin. Le prototype vérifie l’existence et l’origine du thread via l’API native, plutôt que filtrer le texte du prompt ou la forme JSON d’une réponse légitime. Voir le [signalement amont](https://github.com/openai/codex/issues/43384). Si la lecture native échoue, la notification n’est pas importée ; le contenu reste consultable dans le CLI. La compatibilité de ce lecteur doit être vérifiée pour les autres versions.

Vérifié avec Chromium : lecture sans terminal, filtres et recherche du contenu, libellés/tâches, thèmes et mobile sans débordement, mouvement réduit, PTY Unicode, reconnexion au même processus, contrôle entre deux panneaux, réponse reçue et dédupliquée avec Markdown nettoyé. Une vraie réponse Codex a été reçue avec le terminal masqué puis son CLI a été ouvert dans la même conversation.
