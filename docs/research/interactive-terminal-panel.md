# Terminal interactif dans Relai

Recherche du 30 septembre 2026, sources primaires consultées. Proposition à valider par prototype, pas une décision d'architecture déjà adoptée.

## Recommandation

Révision après essai utilisateur : le terminal natif reste la surface d’interaction avec l’agent, mais le clic sur un mail ouvre d’abord sa lecture dans l’inbox Glass. Le terminal est une vue du même chat ; lire ou recevoir un Relai ne crée aucun processus. Voir le [prototype inbox](../../design/inbox-prototype/README.md).

Faire du véritable CLI la surface d'interaction principale d'une session : un terminal intégré dans un panneau Relai, avec autour une liste de sessions, des informations de projet, les différences Git et des documents. Les commandes `/`, les skills, les menus et les validations restent traités par le CLI installé. Relai ajoute la navigation et l'observation ; il ne réimplémente pas les menus de chaque agent.

Sur Linux/WSL, le candidat recommandé pour le MVP est **xterm.js dans React → WebSocket → service Rust → PTY → CLI**. Le moteur possède le processus indépendamment du navigateur. tmux reste une option ultérieure pour séparer davantage la persistance du processus de celle du moteur, et pour réattacher depuis un terminal externe. Dans ce cas, utiliser une instance tmux dédiée à Relai pour éviter les conflits de configuration. Cette option ajoute une dépendance et doit être testée avec les agents retenus.

## Faits vérifiés et implications

| Fait documenté | Implication pour Relai | Source |
| --- | --- | --- |
| xterm.js est un composant de terminal pour navigateur, utilisé notamment par VS Code. Il prend en charge les applications curses, la souris, CJK, emoji et IME. | Le panneau peut afficher la vraie interface interactive de l'agent. | [README xterm.js](https://github.com/xtermjs/xterm.js/) |
| Les addons officiels incluent fit, search, web-links et attach WebSocket. | Ajouter redimensionnement, recherche et liens autour du terminal. | [README xterm.js](https://github.com/xtermjs/xterm.js/) |
| L'API distingue les buffers normal et alternatif, les entrées texte et certaines entrées souris binaires ; elle expose resize et un gestionnaire clavier personnalisé. | Transporter les entrées sans les convertir en prompts ; tester plein écran, souris, raccourcis et focus. | [API Terminal](https://xtermjs.org/docs/api/terminal/classes/terminal/) |
| portable-pty fournit une API Rust de PTY multiplateforme et permet de lancer un processus, lire sa sortie et écrire son entrée. Son resize informe aussi le noyau et le processus enfant. | Candidat naturel pour le service Rust. | [portable-pty](https://docs.rs/portable-pty/latest/portable_pty/), [MasterPty](https://docs.rs/portable-pty/latest/portable_pty/trait.MasterPty.html) |
| tmux maintient les programmes après détachement et permet une réattache. | Fermer le navigateur ne doit pas tuer l'agent ; un redémarrage du pont Relai peut réattacher une session tmux encore vivante. | [Getting Started tmux](https://github.com/tmux/tmux/wiki/Getting-Started) |
| Le mode contrôle tmux fournit commandes et notifications textuelles ; les sorties des panes restent des données terminal avec séquences d'échappement. Il propose taille client et régulation du flux. | Utile pour observer et gérer sessions/panes, mais ne fournit pas une conversation agent structurée. Commencer par une attache tmux normale ; étudier le mode contrôle séparément. | [Control Mode tmux](https://github.com/tmux/tmux/wiki/Control-Mode) |
| xterm.js documente une régulation du flux nécessaire face aux producteurs rapides. | Prévoir accusés de traitement et limites de tampon ; éviter un WebSocket naïf qui accumule les sorties. | [Flow control xterm.js](https://xtermjs.org/docs/guides/flowcontrol/) |
| xterm.js propose un terminal headless Node avec sérialisation pour restaurer l'état après reconnexion. L'addon serialize indique encore un statut expérimental. | Alternative pour un backend qui possède lui-même le terminal ; cela ajoute Node ou exige un équivalent Rust à évaluer. Un snapshot n'est pas la persistance du processus. | [README xterm.js](https://github.com/xtermjs/xterm.js/), [addon-serialize](https://github.com/xtermjs/xterm.js/tree/master/addons/addon-serialize) |
| ttyd partage une commande dans un terminal web et documente Unicode/IME et plusieurs plateformes. | Excellent banc d'essai de fidélité avant le pont Rust ; ce produit seul ne fournit pas le modèle de sessions de Relai. | [ttyd](https://github.com/tsl0922/ttyd) |

## Limites et règles de conception proposées

Les hooks natifs offrent une seconde voie d'observation pendant que le CLI reste le seul pilote. Codex documente notamment SessionStart, UserPromptSubmit, PermissionRequest et Stop ; Claude Code documente également des événements de prompt, permission et arrêt. Un adaptateur Relai peut recevoir ces événements pour alimenter une timeline et une inbox. Cela demande une matrice de capacités par agent et version, sans supposer un format de transcription stable ni une couverture uniforme. En l'absence d'événement fiable, l'état métier reste inconnu. Sources : [hooks Codex](https://learn.chatgpt.com/docs/hooks), [hooks Claude Code](https://code.claude.com/docs/en/hooks).

Le champ `last_assistant_message` des hooks Stop est une piste pour signaler une « réponse disponible », sans déclarer toute la tâche achevée. Il reste à vérifier cette capacité contre les binaires installés dans le prototype. Sources : [Stop Codex](https://learn.chatgpt.com/docs/hooks#stop), [Stop Claude Code](https://code.claude.com/docs/en/hooks#stop).

Proposition UX : inbox à gauche, terminal principal au centre, contexte Git et activité dans un volet repliable à droite ; un mode focus agrandit le terminal. Le MVP garde la saisie native du CLI. Un éditeur externe peut préparer ou copier du texte, puis proposer une insertion explicite lorsque l'adaptateur sait qu'elle est possible. Extraire ou masquer arbitrairement le prompt de la TUI et le remplacer par un champ HTML ne préserve pas automatiquement l'expérience.

- Un flux ANSI décrit un écran et ses modifications, pas des messages stables. Ne pas déduire un état « attend une approbation » ou « tâche terminée » de mots, couleurs ou positions de curseur. Utiliser des hooks/API documentés par agent lorsqu'ils existent ; sinon afficher des faits mesurables : processus vivant, sortie récente, connexion, code de sortie.
- L'inbox structurée peut référencer la session, stocker des notes Relai et recevoir des événements via une intégration native. Elle ne devient pas automatiquement une transcription fidèle de tout CLI. Distinguer explicitement événement confirmé et simple activité terminal.
- Une session doit avoir une seule autorité d'écriture à la fois. Les autres panneaux sont observateurs ; une reprise de contrôle est explicite. Ne pas piloter simultanément le même historique via CLI et SDK/app-server, et ne pas injecter des touches quand le CLI affiche un menu ou une validation.
- Une fermeture de navigateur, un redémarrage du service, une sortie du CLI et un redémarrage de la machine sont quatre cas différents. Le moteur persistant couvre la fermeture du navigateur ; tmux peut couvrir aussi le redémarrage du pont tant que son serveur survit. La reprise après sortie ou reboot dépend de la fonction resume du CLI.
- Une file de prompts et une automatisation ne sont pas garanties par le PTY. Elles exigent un état d'entrée fiable et une intégration documentée ; l'injection aveugle de frappes ne convient pas.
- Un terminal externe existant ne devient pas attachable universellement. Garantir d'abord les sessions démarrées sous Relai/tmux ; traiter séparément l'import d'historiques et la reprise native par identifiant d'agent.

## Question du prototype

Le prototype inbox utilise désormais `notify` de Codex, configuré pour chaque invocation, pour recevoir `agent-turn-complete` avec identifiants de thread/tour, entrées utilisateur et dernière réponse assistant. La réception est indépendante du panneau terminal. Cette voie ne couvre pas les approbations ou tous les événements intermédiaires ; elle n’importe pas les chats externes. Source primaire : [notifications Codex](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications).

Le test avec Codex 0.159.0 a reproduit une notification supplémentaire de génération interne de titre, décrite dans le [signalement amont](https://github.com/openai/codex/issues/43384). Elle peut arriver avant ou après la vraie réponse. Le prototype vérifie le thread avec `thread/read` sans reprise et accepte seulement une conversation persistée d’origine CLI ; le thread éphémère interne est absent. Il ne filtre ni un prompt par mots clés ni une réponse JSON, qui pourraient être légitimes. Cela reste une intégration à vérifier par version. L’API distingue explicitement [lecture et reprise du thread](https://learn.chatgpt.com/docs/app-server).

Vérifications du prototype inbox : lecture sans aucun processus, recherche du contenu et des métadonnées, libellés, mobile et thème clair, réduction du mouvement, terminal Unicode, reconnexion au même processus, contrôle entre deux panneaux, callback automatique et déduplication. Une vraie réponse Codex a aussi été reçue dans la conversation avec le terminal masqué, puis son CLI a été ouvert dans ce même chat. Les approbations, IME, grands historiques et autres harnesses restent à vérifier.

Vérifier sur un vrai agent : `/` et sélection de skills, navigation clavier, approbations, interruption Ctrl-C, collage multiligne, accents/IME, souris, largeur Unicode, redimensionnement et écran alternatif. Fermer puis rouvrir le panneau et redémarrer le pont sans relancer l'agent. Tester un second panneau observateur et le transfert de contrôle. Comparer ttyd + tmux avec le pont Rust, puis choisir la solution la plus simple qui préserve cette expérience.
