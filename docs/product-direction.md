# Direction du produit Relai

État : en développement, phase de conception. Les réponses de cadrage fixent les intentions du produit ; les propositions techniques restent à discuter.

## Vision

Relai est une interface locale et open source pour gérer une équipe d’agents IA comme une boîte mail. L’utilisateur envoie un sujet et un prompt Markdown à une session existante, ou choisit un dossier et un harness pour lancer une nouvelle session. Relai suit le travail et présente les retours avec les fichiers modifiés et, lorsque Git est disponible, les diffs, les commits et les PR.

Les usages envisagés comprennent les réponses dans un thread, la reprise de conversations et plusieurs agents au travail en parallèle. Le transfert vers un autre agent est retiré du périmètre actuel pour garder le produit léger.

## Intentions confirmées par l’utilisateur

- Commencer par un usage personnel, en concevant un produit installable et distribuable à d’autres utilisateurs.
- Fournir une interface graphique dans le navigateur, utilisable avec plusieurs onglets.
- Installer Relai chez l’utilisateur et y conserver ses messages et conversations.
- Utiliser les harnesses de coding choisis par l’utilisateur. Codex est le premier outil visé ; Pi, Claude Code et OpenCode font partie des outils souhaités ensuite.
- Utiliser les harnesses installés sur la machine où Relai est déployé, avec une configuration simple pour plusieurs agents.
- Présenter les réponses, les questions et les demandes de validation comme des messages dans l’inbox ; présenter les changements de fichiers comme des pièces jointes et intégrer les informations Git.
- S’inspirer explicitement de Gmail pour une inbox et une composition simples.
- Proposer automatiquement les sessions détectées dans le destinataire, affichées avec nom d’agent, dossier courant, titre du chat et résumé Git/GitHub disponible. Chaque envoi vise un seul destinataire. Une session non pilotable reste visible comme « À connecter ».
- Appeler le message envoyé par l’utilisateur « un Relai ». Le nom d’agent affiché est celui du harness détecté.
- « Reply » poursuit la même session ; « New session » crée une nouvelle session native et sa conversation Relai.
- Découvrir les chats actifs et non actifs, leurs titres et dossiers, selon les informations effectivement accessibles par harness.
- Mettre les nouveaux messages en file lorsque leur session travaille déjà et permettre les réponses dans la conversation.
- Exécuter les sessions en arrière-plan avec un terminal consultable dans l’interface. Fermer le navigateur ou masquer le terminal laisse les agents travailler tant que le moteur tourne. Arrêt d’agent explicite ; historique conservé après arrêt de la machine, reprise selon le harness.
- Organiser les conversations avec des libellés personnalisés et des regroupements automatiques selon le contexte actuel du harness, dossier et branche ; conserver le contexte historique de chaque message.
- Programmer des Relais ponctuellement ; demander confirmation pour les échéances manquées pendant un arrêt.
- Rechercher titres, sujets, prompts et réponses ; filtrer par harness, dossier, libellé, état, branche et informations Git/GitHub.
- Concevoir une interface utilisable avec de nombreux chats et plus de 20 sessions, ainsi qu’un code modulaire permettant des changements localisés. Cible de validation proposée : 10 000 chats et 25 sessions, budgets à mesurer.
- Limiter la composition initiale au destinataire, au sujet et au prompt Markdown.
- Sans session ouverte, choisir un dossier de travail et un harness disponible, puis lancer automatiquement la session avec le prompt.
- Détecter automatiquement les harnesses disponibles ; la couverture de découverte et de pilotage reste à vérifier par outil.
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

## Composition et modèle de conversation

Le destinataire de composition vise une session native existante, par exemple « Régler issue 3 — Codex CLI ». Pour créer une session, il vise un dossier et un harness, par exemple « /home/user/projects/p1 — Codex CLI ». Le dossier de travail est le point d’entrée ; il n’est pas nécessaire de le présenter comme un dépôt Git dans le formulaire.

Le choix précédent d’un destinataire correspondant à un profil d’agent et d’un dépôt obligatoire est corrigé. Les profils nommés restent une éventuelle extension, pas une exigence de la première composition. Le [brouillon SDD-001](sdd/0001-compose-message.md) décrit le formulaire demandé et ses questions ouvertes.

Une conversation Relai correspond à une session native. Le champ sujet et son rapport au titre du chat restent à confirmer. Un run reste un terme proposé pour une période de travail ; il n’a pas encore été validé.

La session native, le processus terminal et le thread Relai doivent être distingués. Reprendre un historique enregistré et prendre le contrôle d’un terminal déjà actif sont deux besoins distincts. Les définitions seront ajoutées au glossaire après validation.

La documentation [Codex app-server](https://learn.chatgpt.com/docs/app-server) distingue l’historique des threads des threads chargés dans le serveur interrogé. Cela ne garantit pas le pilotage de toutes les sessions CLI indépendantes déjà ouvertes sur le poste. La détection automatique souhaitée doit distinguer une session pilotable d’une session seulement détectée ou d’un historique reprenable.

## Questions encore ouvertes

- Quel scénario concret doit rendre la première version utile au quotidien ?
- Accepter un composant d’exécution Linux/WSL en complément du conteneur Relai ?
- Quel périmètre de plateformes supporter dans la première version ?
- Sessions créées par Relai uniquement ou reprise de sessions créées ailleurs ?
- Quels processus continuent lorsque le navigateur, le terminal ou le service est fermé ?
- Comment distinguer agent, tâche, thread, session et run ?
- Comment connecter une session marquée « À connecter » selon les capacités du harness ?
- Comment ordonner, annuler et reprendre les envois en file ?
- Conserver un sujet distinct ou seulement le titre du chat ?
- Quels événements produisent des messages, et lesquels restent dans l’activité du terminal ?
- Les pièces jointes représentent-elles les fichiers à un moment précis ou leur état courant ?
- Comment afficher les contextes historiques manquants des chats importés ?
- Fuseau, seuil de retard et interaction entre programmation et file d’attente ?
- Quels champs Git/GitHub rechercher et quels budgets mesurer sur quelle machine ?
- Quels pouvoirs accorder aux agents et quelles actions doivent demander une approbation ?
- Comment coordonner des modifications parallèles sur un repo ?

Les décisions seront documentées au fil du cadrage. La mise en œuvre suivra la confirmation d’une compréhension partagée.
