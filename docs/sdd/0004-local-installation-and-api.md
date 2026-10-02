# SDD-004 — Installation locale et cœur applicatif

## Actualisation du 2 octobre 2026

Le service fournit aussi les terminaux natifs Codex, Claude Code et OpenCode à la demande ; l’envoi graphique reste limité à Codex. Le contrat terminal et ses limites sont dans [SDD-006](0006-native-terminal.md). Les révisions du 30 septembre ci-dessous restent le contexte historique.

Statut : service graphique et moteur Codex implémentés au 30 septembre 2026 ; distribution installable et plateformes supplémentaires restent à spécifier. La révision suivante prévaut sur les étapes passives antérieures.

## Révision livrée — moteur, migration et API

Rust supervise un app-server Codex par source seulement lorsqu’un envoi s’exécute. Adaptateur vérifié pour CLI 0.159.x, initialisation JSON-RPC, reprise par ID natif, événements et décisions corrélées. Les mêmes opérations sont disponibles via API versionnée et UI ; MCP différé. Authentification et politiques restent celles de la source native ; le navigateur ne reçoit pas de secrets.

SQLite ajoute livraisons, tentatives, retours, activité, demandes, baseline d’historique, dossiers récents et journal d’événements. Migration additive compatible avec brouillons/libellés antérieurs. Un verrou de propriétaire exclut deux moteurs sur le même répertoire de données. Reprise ne rejoue pas les envois incertains et marque les échéances manquées. Le service doit rester actif pour les programmations ; aucun daemon système n’est installé.

La protection loopback, origine, hôte et cookie local reste active. API de recherche, livraison, récupération, activité, arrêt, réponses natives et dossiers bornés : [routes et contrat](../research/codex-delivery.md). Instructions reproductibles de compilation/tests dans le [README](../../README.md). Couverture actuelle limitée à l’utilisateur Linux/WSL courant ; autres outils en lecture seule.

## Configuration retenue

- Service natif Rust dans le même environnement utilisateur que les harnesses et repos ; Linux/WSL en première cible.
- UI TypeScript/React servie dans le navigateur par le service, avec assets embarqués dans la distribution.
- SQLite local pour messages, index, files, programmation et configuration ; Git CLI pour l’état Git.
- Un propriétaire du stockage et de l’exécution par instance locale ; les onglets partagent le même moteur.
- API versionnée, lectures paginées, erreurs structurées et suivi des opérations longues par identifiant.
- Opérations applicatives partagées par l’UI, l’API et un futur adaptateur MCP. Aucun MCP à construire actuellement.
- Instances indépendantes installables sur plusieurs machines ; synchronisation et pilotage distant ne sont pas compris dans cette décision.

## Structure du code retenue

Organiser quelques modules cohérents : conversations et recherche, envois et programmation, runtime et adaptateurs, Git et artefacts. Chaque module expose une interface courte et garde ses détails internes privés. Les handlers HTTP traduisent les requêtes vers les opérations applicatives ; ils ne possèdent pas les règles de file, de reprise ou d’approbation.

Les particularités de Codex et des futurs harnesses restent dans leurs adaptateurs avec capacités déclarées et identifiants natifs. Les choix de stockage restent dans la persistance. Extraire des crates ou processus lorsqu’un besoin concret de distribution ou de dépendances le justifie.

## Parcours d’installation visé

1. Installer le package correspondant à la plateforme ; l’utilisation du package publié ne demande pas Rust ou Node.
2. Démarrer Relai avec une commande qui rejoint une instance existante ou démarre le service, puis ouvre le navigateur.
3. Détecter les outils et historiques de cet environnement ; afficher les métadonnées pendant l’indexation en arrière-plan.
4. Proposer l’installation comme service utilisateur pour maintenir le moteur indépendamment du terminal de lancement.

Les commandes exactes, formats de packages, signature et mécanisme de mise à jour restent à spécifier. Un serveur de développement React n’est pas requis dans la distribution utilisateur.

## Durabilité et accès local

- Fermer le navigateur laisse le moteur et les agents travailler ; l’arrêt du moteur est une action distincte.
- Persister les envois avant l’accusé de réception, réconcilier après redémarrage et traiter les livraisons incertaines selon SDD-003.
- API accessible sur loopback par défaut, avec contrôle d’accès et validation des origines ; portée des clients à définir.
- Configuration et données propres à l’utilisateur ; sauvegarde et migrations doivent préserver les historiques et permettre une récupération explicite.
- Bornes de ressources, rétention des logs, terminaux à la demande et chargement paginé pour garder l’inbox réactive.

## Validation et décisions restantes

Valider installation, upgrade, désinstallation sans effacement implicite des données, démarrage durable, PATH des harnesses et plusieurs onglets sans moteur dupliqué. Mesurer recherche et navigation sur 10 000 chats et 25 sessions, en distinguant sessions chargées et travail simultané ; les performances ne sont pas garanties avant mesure.

Support de macOS et Windows natif, versions minimales, matériel de référence, démarrage au login, bibliothèques HTTP/persistance, compatibilité des clients et versions d’API restent à préciser. Docker est une extension de distribution future ; le design des modules doit permettre son étude sans dupliquer les règles applicatives.


## Livraison actuelle

Service Axum/Tokio dans crates/relai et UI React dans apps/web, embarquée dans le binaire de release. SQLite Relai pour catalogue, index FTS, brouillons, annotations, libellés et préférences. Écoute loopback sur 4179, cookie HttpOnly/SameSite et contrôle Host/Origin ; API /api/v1, catalogue par 100, messages par 50, événements SSE, surveillance avec réconciliation.

Les sources natives Codex, Claude Code, OpenCode et Pi sont lues passivement dans l’environnement utilisateur Linux/WSL courant. Aucun lancement, reprise, envoi, Git CLI ou MCP n’est inclus dans cette livraison. La distribution est compilable depuis les sources ; installateur et supervision automatique du service restent à réaliser. Voir [README](../../README.md) et [ADR-003](../adr/0003-passive-catalogue-and-blank-inbox.md).
