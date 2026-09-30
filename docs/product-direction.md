# Direction du produit Relai

État : en développement, phase de conception. Les réponses de cadrage fixent les intentions du produit ; les propositions techniques restent à discuter.

## Vision

Relai est une interface locale et open source pour gérer une équipe d’agents IA comme une boîte mail. L’utilisateur répond avec un prompt Markdown à une session existante, ou choisit un titre, un dossier et un harness pour lancer une nouvelle session. Relai suit le travail et présente les retours avec les fichiers modifiés et, lorsque Git est disponible, les diffs, les commits et les PR.

Les usages envisagés comprennent les réponses dans un thread, la reprise de conversations et plusieurs agents au travail en parallèle. Le transfert vers un autre agent est retiré du périmètre actuel pour garder le produit léger.

## Intentions confirmées par l’utilisateur

- Commencer par un usage personnel, en concevant un produit installable et distribuable à d’autres utilisateurs.
- Fournir une interface graphique dans le navigateur, utilisable avec plusieurs onglets.
- Installer Relai chez l’utilisateur et y conserver ses messages et conversations.
- Utiliser les harnesses de coding choisis par l’utilisateur. Codex est le premier outil visé ; Pi, Claude Code et OpenCode font partie des outils souhaités ensuite.
- Utiliser les harnesses installés sur la machine où Relai est déployé, avec une configuration simple pour plusieurs agents.
- Présenter les réponses, les questions et les demandes de validation comme des messages dans l’inbox ; présenter les changements de fichiers comme des pièces jointes et intégrer les informations Git.
- Un clic sur un mail reçu ouvre le panneau du véritable terminal de sa session. Conserver la saisie, les commandes `/`, skills, menus et validations natifs du harness, avec l'organisation graphique de Relai autour. Voir le [prototype interactif](../design/terminal-prototype/README.md).
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
- « New session » demande un titre, une destination et un prompt Markdown, avec libellés ; « Reply » ne demande que le prompt.
- Découvrir automatiquement les historiques locaux, métadonnées en premier ; reprendre une session arrêtée lors d’une réponse si le harness le permet.
- Documenter les erreurs, leurs états et les actions de récupération dans des SDDs.
- Prévoir une API et des opérations applicatives réutilisables par un futur MCP Relai. Aucun MCP à construire dans le périmètre actuel ; architecture native retenue, détails de packaging à spécifier.
- Un échec suspend uniquement la file de la session concernée, conserve les messages et propose « Réessayer », « Ignorer cet envoi » ou « Annuler ». Les autres sessions continuent.
- Sans session ouverte, choisir un dossier de travail et un harness disponible, puis lancer automatiquement la session avec le prompt.
- Détecter automatiquement les harnesses disponibles ; la couverture de découverte et de pilotage reste à vérifier par outil.
- Tenir compte de la distribution et de l’installation dès les choix de conception.
- Prendre le workflow quotidien sous WSL comme point de départ du cadrage.
- Privilégier Bash et les environnements Linux. Le périmètre exact de support de Windows natif reste à décider.

Le stockage local de Relai n’établit pas une exigence de modèles hors ligne : les échanges d’un harness avec son fournisseur de modèles dépendent de sa propre configuration.

## Configuration retenue après délégation du choix

- Rust pour le moteur local et la supervision des processus.
- TypeScript/React pour l’UI navigateur, servie par le service local.
- SQLite pour le stockage local et Git CLI pour les fonctions Git.
- Service natif Linux/WSL par défaut, avec cœur applicatif commun à l’UI et l’API ; MCP futur, sans implémentation actuelle.
- Modules cohérents pour conversations, envois, runtime/adaptateurs et Git ; détails privés derrière des interfaces courtes.
- Distribution installable sur plusieurs machines sous forme d’instances indépendantes ; pas de décision de synchronisation entre machines.
- Docker comme option de distribution ultérieure ; Tauri comme éventuelle extension desktop.

Voir [ADR-002](adr/0002-native-local-service.md) et [SDD-004](sdd/0004-local-installation-and-api.md). Les performances, formats de packages et plateformes supplémentaires restent à valider.

## Faits vérifiés pour éclairer les choix

Les interfaces des harnesses diffèrent : [Codex app-server](https://learn.chatgpt.com/docs/app-server) expose JSON-RPC et la gestion des sessions et approbations ; [Claude Code](https://code.claude.com/docs/en/headless) propose la CLI en mode programmatique et un SDK ; [OpenCode](https://opencode.ai/docs/server/) expose un serveur HTTP et des événements ; [Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md) propose un mode RPC.

**Choix retenu :** définir un adaptateur par harness et déclarer ses capacités. Ces interfaces permettent d’envisager une abstraction commune, mais ne démontrent pas une portabilité universelle des sessions entre outils. Une session de harness et une conversation Relai restent des concepts à préciser.

[Docker Desktop](https://docs.docker.com/desktop/features/networking/) exécute les conteneurs Linux dans une machine virtuelle. Les [bind mounts](https://docs.docker.com/engine/storage/bind-mounts/) partagent des fichiers du poste avec un conteneur ; ils ne donnent pas automatiquement accès aux processus ou aux sessions terminal déjà ouverts sur le poste. Sous WSL, Docker recommande de conserver le code monté dans le [système de fichiers Linux](https://docs.docker.com/desktop/features/wsl/best-practices/).

Docker documente les connexions entre un conteneur et un [service sur l’hôte](https://docs.docker.com/desktop/features/networking/networking-how-tos/). Cet accès réseau ne lance pas les programmes de l’hôte. WSL permet de [faire communiquer les environnements Windows et Linux](https://learn.microsoft.com/en-us/windows/wsl/filesystems), mais les chemins, les exécutables et le contexte utilisateur restent à prendre en compte.

**Option future :** l’inbox et le service Relai dans Docker, avec un composant d’exécution sur le poste Linux ou dans la distribution WSL qui contient les harnesses et les repos. Ce composant lancerait les outils avec l’utilisateur concerné et communiquerait leurs événements au service Relai. Le protocole, l’appairage, l’authentification et l’installation de ce composant restent à concevoir. Cette proposition découle des contraintes d’isolation ; elle n’est pas une capacité automatique de Docker.

## Composition et modèle de conversation

Le destinataire de composition vise une session native existante, par exemple « Régler issue 3 — Codex CLI ». Pour créer une session, il vise un dossier et un harness, par exemple « /home/user/projects/p1 — Codex CLI ». Le dossier de travail est le point d’entrée ; il n’est pas nécessaire de le présenter comme un dépôt Git dans le formulaire.

Le choix précédent d’un destinataire correspondant à un profil d’agent et d’un dépôt obligatoire est corrigé. Les profils nommés restent une éventuelle extension, pas une exigence de la première composition. Le [brouillon SDD-001](sdd/0001-compose-message.md) décrit le formulaire demandé et ses questions ouvertes.

Une conversation Relai correspond à une session native. Un titre est choisi à la création ; les réponses n’ont pas de sujet distinct. Un run reste un terme proposé pour une période de travail ; il n’a pas encore été validé.

La session native, le processus terminal et le thread Relai doivent être distingués. Reprendre un historique enregistré et prendre le contrôle d’un terminal déjà actif sont deux besoins distincts. Les définitions seront ajoutées au glossaire après validation.

La documentation [Codex app-server](https://learn.chatgpt.com/docs/app-server) distingue l’historique des threads des threads chargés dans le serveur interrogé. Cela ne garantit pas le pilotage de toutes les sessions CLI indépendantes déjà ouvertes sur le poste. La détection automatique souhaitée doit distinguer une session pilotable d’une session seulement détectée ou d’un historique reprenable.

## Questions encore ouvertes

- Quel scénario concret doit rendre la première version utile au quotidien ?
- Définir les formats de packages et la supervision du service natif Linux/WSL.
- Quel périmètre de plateformes supporter dans la première version ?
- Sessions créées par Relai uniquement ou reprise de sessions créées ailleurs ?
- Quels processus continuent lorsque le navigateur, le terminal ou le service est fermé ?
- Comment distinguer agent, tâche, thread, session et run ?
- Comment connecter une session marquée « À connecter » selon les capacités du harness ?
- Comment ordonner, annuler et reprendre les envois en file ?
- Comment transmettre ou conserver le titre lorsque le harness ne permet pas le renommage ?
- Quels événements produisent des messages, et lesquels restent dans l’activité du terminal ?
- Les pièces jointes représentent-elles les fichiers à un moment précis ou leur état courant ?
- Comment afficher les contextes historiques manquants des chats importés ?
- Fuseau, seuil de retard et interaction entre programmation et file d’attente ?
- Quels champs Git/GitHub rechercher et quels budgets mesurer sur quelle machine ?
- Quels pouvoirs accorder aux agents et quelles actions doivent demander une approbation ?
- Comment coordonner des modifications parallèles sur un repo ?

Les décisions seront documentées au fil du cadrage. La mise en œuvre suivra la confirmation d’une compréhension partagée.

## Direction UI/UX

Références tldraw lues : inbox compactes et vues divisées, dashboard sobre, gradients diffus et textures. Direction demandée : Gmail pour l’organisation, Notion pour la sobriété, gris foncé/blanc et accents colorés discrets. Voir [SDD-005](sdd/0005-inbox-ui-ux.md) et la [maquette autonome](../design/README.md). Maquette avec données fictives ; disposition et densité à valider avant UI de production.
