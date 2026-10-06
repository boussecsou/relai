> Historical reference: this document describes the previous Relai scope. Read [current product direction](../product-direction.md) before applying its decisions.

# SDD-004 — Installation locale et cœur applicatif

Statut : brouillon. Le choix d’architecture est retenu ; les détails de distribution et critères techniques ci-dessous doivent être validés lors du prototype. Aucune application implémentée.

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
