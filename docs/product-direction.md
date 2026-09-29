# Direction du produit Relai

État : en développement, phase de conception. Les réponses de cadrage fixent les intentions du produit ; les propositions techniques restent à discuter.

## Vision

Relai est une interface locale et open source pour gérer une équipe d’agents IA comme une boîte mail. L’utilisateur envoie une tâche à un agent, Relai lance ou reprend sa vraie session, suit son travail sur le repo et présente son retour avec les diffs Git, les tests, les commits et les PR.

Les usages envisagés comprennent les réponses dans un thread, le transfert de tâches, la reprise de conversations et plusieurs agents au travail en parallèle. Leur comportement détaillé reste à définir.

## Intentions confirmées par l’utilisateur

- Commencer par un usage personnel, en concevant un produit installable et distribuable à d’autres utilisateurs.
- Fournir une interface graphique.
- Installer Relai chez l’utilisateur et y conserver ses messages et conversations.
- Utiliser les harnesses de coding choisis par l’utilisateur. Codex est le premier outil visé ; Pi, Claude Code et OpenCode font partie des outils souhaités ensuite.
- Tenir compte de la distribution et de l’installation dès les choix de conception.
- Prendre le workflow quotidien sous WSL comme point de départ du cadrage.

Le stockage local de Relai n’établit pas une exigence de modèles hors ligne : les échanges d’un harness avec son fournisseur de modèles dépendent de sa propre configuration.

## Pistes techniques, encore ouvertes

- Rust pour le moteur et la gestion des processus et terminaux.
- TypeScript et React pour l’interface graphique.
- SQLite pour les données locales.
- Git CLI pour le suivi du repo.
- Tauri pour une éventuelle distribution desktop.
- Docker comme piste de distribution et/ou d’environnement d’exécution.
- MCP et JSON-RPC comme pistes d’intégration, selon les fonctions et les outils concernés.

Le choix entre une interface dans le navigateur et une fenêtre desktop est ouvert. Le rôle de Docker et l’emplacement d’exécution des harnesses sont également ouverts.

## Faits vérifiés pour éclairer les choix

Les interfaces des harnesses diffèrent : [Codex app-server](https://learn.chatgpt.com/docs/app-server) expose JSON-RPC et la gestion des sessions et approbations ; [Claude Code](https://code.claude.com/docs/en/headless) propose la CLI en mode programmatique et un SDK ; [OpenCode](https://opencode.ai/docs/server/) expose un serveur HTTP et des événements ; [Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md) propose un mode RPC.

**Proposition, à valider :** définir un adaptateur par harness et déclarer ses capacités. Ces interfaces permettent d’envisager une abstraction commune, mais ne démontrent pas une portabilité universelle des sessions entre outils. Une session de harness et une conversation Relai restent des concepts à préciser.

[Docker Desktop](https://docs.docker.com/desktop/features/networking/) exécute les conteneurs Linux dans une machine virtuelle. Les [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) partagent des fichiers du poste avec un conteneur ; ils ne donnent pas automatiquement accès aux processus ou aux sessions terminal déjà ouverts sur le poste. Sous WSL, Docker recommande de conserver le code monté dans le [système de fichiers Linux](https://docs.docker.com/desktop/features/wsl/best-practices/).

**Proposition, à valider :** un service local et une interface navigateur pour le premier usage WSL. Le choix de lancer les harnesses sur le poste ou dans des conteneurs doit précéder la définition du package Docker.

## Questions encore ouvertes

- Quel scénario concret doit rendre la première version utile au quotidien ?
- Interface navigateur ou fenêtre desktop ?
- Harnesses déjà installés sur le poste ou installés dans des conteneurs ?
- Sessions créées par Relai uniquement ou reprise de sessions créées ailleurs ?
- Que signifie « vrai terminal » : environnement d’exécution, console visible, reprise manuelle de la TUI ?
- Comment distinguer agent, tâche, thread, session et run ?
- Comment transmettre une tâche d’un harness à un autre ?
- Quels pouvoirs accorder aux agents et quelles actions doivent demander une approbation ?
- Comment coordonner des modifications parallèles sur un repo ?

Les décisions seront documentées au fil du cadrage. La mise en œuvre suivra la confirmation d’une compréhension partagée.
