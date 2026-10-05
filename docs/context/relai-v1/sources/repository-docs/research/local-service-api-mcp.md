# Relai — installation locale, API et MCP

Recherche du 30 septembre 2026. Proposition à discuter ; aucun choix de stack ou mode de distribution définitif.
Objectif : une installation claire, un moteur indépendant du navigateur et des interfaces utilisables par l’UI comme par les agents.

## Faits vérifiés

- MCP distingue application hôte, clients et serveurs exposant des outils/ressources. Ses transports ne remplacent pas les interfaces de contrôle propres aux harnesses. [Architecture actuelle](https://modelcontextprotocol.io/specification/2026-07-28/architecture).
- En stdio, le client lance un sous-processus MCP ; stdin/stdout transportent uniquement les messages JSON-RPC, les logs passent par stderr. Fermer stdin est le signal portable de fin du bridge. [stdio](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio).
- MCP 2026-07-28 Streamable HTTP utilise un endpoint POST et réponses JSON ou SSE ; cette révision retire le GET stream et les sessions protocolaires. Les abonnements passent par `subscriptions/listen`, sans reprise `Last-Event-ID`. Fermer un flux SSE annule sa requête. Ces règles diffèrent de 2025-11-25 ; vérifier les versions réellement supportées par clients/SDK. [Transport actuel](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [ancien transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
- Pour MCP HTTP, la validation de l’Origin est obligatoire contre DNS rebinding ; la spec recommande localhost et authentification. Un service qui lance des processus mérite ces contrôles dès son API locale, avec politique explicite pour les clients sans Origin. [Endpoint local](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#security--endpoint).
- OpenAPI décrit des API HTTP, schémas et réponses. La spec actuelle 3.2.1 décrit aussi des médias séquentiels/streaming et SSE ; cela ne fournit ni serveur, ni persistance, ni protocole d’émulation terminal. Le support des outils de génération doit être vérifié avant de retenir une version. [OpenAPI](https://spec.openapis.org/oas/v3.2.1.html).
- Un conteneur possède fichiers, réseau et arbre de processus isolés. Un bind mount partage des fichiers avec l’hôte du daemon, pas un droit de lancement dans la session utilisateur hôte. Sous Docker Desktop, le daemon utilise une VM Linux. [Processus Docker](https://docs.docker.com/engine/containers/run/), [Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/).

## Comparaison pour Relai — déductions d’architecture

| Mode | Installation et intérêt | Coût réel pour ce besoin |
| --- | --- | --- |
| Service natif Linux/WSL | Un programme sert React, API, stockage et contrôle local ; accès aux harnesses du même utilisateur | Packaging par cible, démarrage durable et environnement PATH à gérer |
| Tout Docker | Image reproductible avec moteur et harnesses exécutés dedans | Il faut installer/configurer ces harnesses, monter repos/stores et gérer chemins/dépendances ; les agents hôtes existants ne sont pas automatiquement contrôlés |
| Docker + runner hôte | UI/API containerisées, runner proche des harnesses existants | Deux installations/processus, compatibilité de protocole et connexion/authentification supplémentaires |

La modularité du code n’impose pas plusieurs services. Ces modes peuvent partager les mêmes modules et contrats ; aucun ne garantit l’exécution de tous les outils Windows natifs depuis Linux/WSL.

## Périmètre précisé après la recherche

Le MCP est une extension future, à anticiper via les opérations applicatives communes ; aucune implémentation MCP dans le périmètre actuel. Le mode d’installation reste ouvert : l’utilisateur demande les raisons des coûts Docker avant de choisir.

## Candidat recommandé pour le mode par défaut

Un service local natif dans l’environnement des repos et harnesses, d’abord Linux/WSL. Si Rust/React/SQLite sont retenus, distribuer un binaire Rust avec assets React embarqués et un store SQLite dans le répertoire de données utilisateur.
Une commande démarre/rejoint le service et ouvre le navigateur ; le moteur reste propriétaire des processus après fermeture de la page. La supervision et l’installation comme service utilisateur demandent validation, pas seulement un lancement en arrière-plan improvisé.
Préserver une option Docker future pour agents containerisés ou mode hybride ; ne pas imposer cette frontière au chemin principal d’utilisation des agents hôtes existants.

### API applicative commune

- Exposer des commandes métier versionnées, par exemple `/api/v1`, et lectures paginées : sessions, messages, envois, approbations, recherche, état des runs. Décrire schémas/erreurs avec OpenAPI et produire des types clients lorsque l’outillage retenu le permet.
- Séparer accusé durable d’envoi et exécution longue : persister un Relai, retourner son ID/état, suivre le run ensuite. Donner des erreurs structurées et états inconnus plutôt que convertir un timeout en échec certain.
- Prévoir déduplication des commandes côté Relai avec identifiant de requête et transaction. Une acceptation native ambiguë après crash nécessite réconciliation : cela ne garantit pas « exactement une exécution » chez tous les harnesses.
- Utiliser un flux applicatif d’événements ordonnés avec curseur, plus snapshots pour reconnexion/rattrapage. SSE est un candidat pour changements UI ; terminal interactif bidirectionnel peut justifier WebSocket sur une route séparée.
- La fermeture d’un abonnement UI stoppe cet abonnement ; l’arrêt d’un run est une commande explicite. Bornes de buffers, saturation et rétention des événements restent à définir.

### MCP comme adaptateur de cette API

Le serveur MCP appelle les mêmes opérations applicatives et les mêmes règles de persistance que l’UI. Il ne possède ni une deuxième queue, ni une deuxième implémentation d’approbation, ni son propre moteur de harnesses.
Outillage initial possible : lister/rechercher les sessions, envoyer un Relai, lire son état/résultat, consulter une question ou approbation et y répondre dans les limites accordées au client. Capacités et descriptions restent liées à ce que Relai sait réellement faire.
Un bridge `relai mcp` en stdio rejoint le daemon existant pour les clients qui préfèrent ce transport. Plusieurs bridges peuvent servir plusieurs agents ; leur arrêt ne doit pas tuer le daemon ni relancer un runtime dupliqué.
Un endpoint MCP HTTP est possible pour clients compatibles, en conservant contrôle d’Origin et authentification. Choisir/prober les versions supportées plutôt que supposer le protocole actuel accepté partout.
Les outils d’envoi retournent rapidement un identifiant durable ; ils ne gardent pas l’appel MCP ouvert pendant tout le coding. Annuler un appel MCP en cours et annuler un envoi déjà accepté sont deux opérations distinctes à documenter.
L’API applicative peut permettre rattrapage des événements même lorsqu’une révision MCP ne permet pas de reprendre son flux : cette responsabilité appartient à Relai.

## Conditions de validation

Vérifier installation/upgrade/désinstallation, une seule instance propriétaire du store, démarrage avec PATH utilisateur et repos WSL, fermeture navigateur, bridge MCP interrompu, reconnexion et redémarrage avec envois en attente.
Tester clients MCP réellement visés et compatibilité de version, absence de démarrage moteur dupliqué, déduplication côté Relai, livraison native incertaine et demande d’arrêt explicite.
Mesurer réactivité avec volumes/sessions définis dans la recherche de modularité ; API propre, Rust, Docker ou MCP ne suffisent pas à prouver la scalabilité.
Décisions à confirmer : installation native par défaut, version/clients MCP de première cible, portée des outils MCP autorisés et mode Docker ultérieur.
