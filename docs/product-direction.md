# Direction du produit Relai

État : en développement, phase de conception. Les réponses de cadrage fixent les intentions du produit ; les propositions techniques restent à discuter.

## Vision

Relai est une interface locale et open source pour gérer une équipe d’agents IA comme une boîte mail. L’utilisateur envoie une tâche à un agent, Relai lance ou reprend sa vraie session, suit son travail sur le repo et présente son retour avec les diffs Git, les tests, les commits et les PR.

Les usages envisagés comprennent les réponses dans un thread, le transfert de tâches, la reprise de conversations et plusieurs agents au travail en parallèle. Leur comportement détaillé reste à définir.

## Intentions confirmées par l’utilisateur

- Commencer par un usage personnel, en concevant un produit installable et distribuable à d’autres utilisateurs.
- Fournir une interface graphique dans le navigateur, utilisable avec plusieurs onglets.
- Installer Relai chez l’utilisateur et y conserver ses messages et conversations.
- Utiliser les harnesses de coding choisis par l’utilisateur. Codex est le premier outil visé ; Pi, Claude Code et OpenCode font partie des outils souhaités ensuite.
- Utiliser les harnesses installés sur la machine où Relai est déployé, avec une configuration simple pour plusieurs agents.
- Présenter les réponses, les questions et les demandes de validation comme des messages dans l’inbox ; présenter les changements de fichiers comme des pièces jointes et intégrer les informations Git.
- Tenir compte de la distribution et de l’installation dès les choix de conception.
- Prendre le workflow quotidien sous WSL comme point de départ du cadrage.
- Privilégier Bash et les environnements Linux. Le périmètre exact de support de Windows natif reste à décider.

Le stockage local de Relai n’établit pas une exigence de modèles hors ligne : les échanges d’un harness avec son fournisseur de modèles dépendent de sa propre configuration.

## Pistes techniques, encore ouvertes

- Rust pour le moteur et la gestion des processus et terminaux.
- TypeScript et React pour l’interface graphique.
- SQLite pour les données locales.
- Git CLI pour le suivi du repo.
- Tauri reste une piste de distribution future ; l’interface retenue pour le cadrage actuel est celle du navigateur.
- Docker comme piste de distribution et/ou d’environnement d’exécution.
- MCP et JSON-RPC comme pistes d’intégration, selon les fonctions et les outils concernés.

L’interface navigateur est retenue. Les harnesses visés sont ceux du poste utilisateur. Le rôle exact de Docker, la connexion au poste et le packaging de cette connexion restent ouverts.

## Faits vérifiés pour éclairer les choix

Les interfaces des harnesses diffèrent : [Codex app-server](https://learn.chatgpt.com/docs/app-server) expose JSON-RPC et la gestion des sessions et approbations ; [Claude Code](https://code.claude.com/docs/en/headless) propose la CLI en mode programmatique et un SDK ; [OpenCode](https://opencode.ai/docs/server/) expose un serveur HTTP et des événements ; [Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md) propose un mode RPC.

**Proposition, à valider :** définir un adaptateur par harness et déclarer ses capacités. Ces interfaces permettent d’envisager une abstraction commune, mais ne démontrent pas une portabilité universelle des sessions entre outils. Une session de harness et une conversation Relai restent des concepts à préciser.

[Docker Desktop](https://docs.docker.com/desktop/features/networking/) exécute les conteneurs Linux dans une machine virtuelle. Les [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) partagent des fichiers du poste avec un conteneur ; ils ne donnent pas automatiquement accès aux processus ou aux sessions terminal déjà ouverts sur le poste. Sous WSL, Docker recommande de conserver le code monté dans le [système de fichiers Linux](https://docs.docker.com/desktop/features/wsl/best-practices/).

Docker documente les connexions entre un conteneur et un [service sur l’hôte](https://docs.docker.com/desktop/features/networking/networking-how-tos/). Cet accès réseau ne lance pas les programmes de l’hôte. WSL permet de [faire communiquer les environnements Windows et Linux](https://learn.microsoft.com/en-us/windows/wsl/filesystems), mais les chemins, les exécutables et le contexte utilisateur restent à prendre en compte.

**Proposition, à valider :** l’inbox et le service Relai dans Docker, avec un composant d’exécution sur le poste Linux ou dans la distribution WSL qui contient les harnesses et les repos. Ce composant lancerait les outils avec l’utilisateur concerné et communiquerait leurs événements au service Relai. Le protocole, l’appairage, l’authentification et l’installation de ce composant restent à concevoir. Cette proposition découle des contraintes d’isolation ; elle n’est pas une capacité automatique de Docker.

## Modèle de conversation proposé, à valider

L’utilisateur demande de définir ce que signifie « envoyer » et le rapport entre un thread Relai et un chat Codex avant de choisir un scénario de première utilisation.

Piste à discuter : un thread Relai serait une conversation autour d’un travail sur un repo. Il pourrait référencer des sessions natives de plusieurs harnesses. Un run représenterait une période de travail déclenchée par un message ; une réponse à une demande d’approbation ou à une question en attente pourrait continuer le même run.

La session native, le processus terminal et le thread Relai doivent être distingués. Reprendre un historique enregistré et prendre le contrôle d’un terminal déjà actif sont deux besoins distincts. Les définitions seront ajoutées au glossaire après validation.

## Questions encore ouvertes

- Quel scénario concret doit rendre la première version utile au quotidien ?
- Accepter un composant d’exécution Linux/WSL en complément du conteneur Relai ?
- Quel périmètre de plateformes supporter dans la première version ?
- Sessions créées par Relai uniquement ou reprise de sessions créées ailleurs ?
- Que signifie « vrai terminal » : environnement d’exécution, console visible, reprise manuelle de la TUI ?
- Comment distinguer agent, tâche, thread, session et run ?
- Que configure-t-on pour un agent : un harness, un profil nommé, des instructions, un environnement ?
- Quels événements produisent des messages, et lesquels restent dans l’activité du terminal ?
- Les pièces jointes représentent-elles les fichiers à un moment précis ou leur état courant ?
- Comment transmettre une tâche d’un harness à un autre ?
- Quels pouvoirs accorder aux agents et quelles actions doivent demander une approbation ?
- Comment coordonner des modifications parallèles sur un repo ?

Les décisions seront documentées au fil du cadrage. La mise en œuvre suivra la confirmation d’une compréhension partagée.
