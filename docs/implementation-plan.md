# Relai — passage au développement

État : première tranche proposée, 8 octobre 2026. [Règles UI](ui-guidelines.md), [cas d’usage](use-cases.md) et [ADR](adr/README.md) constituent le contrat de référence.

## Évaluation

La maquette permet de commencer une première tranche de développement. Elle couvre le lecteur, les détails, le classement et les principaux états ; elle ne valide pas encore les connecteurs natifs, la synchronisation, les rappels ou la configuration MCP. Les essais utilisateur restent à consigner.

Contrainte confirmée : cœur Rust, outil local léger, lancement par une commande et interface dans le navigateur. Le choix du framework frontend, des bibliothèques Rust, du stockage et du transport d’événements reste ouvert. Rust est distinct d’un choix REST ; aucun transport n’a été accepté.

## Première tranche proposée

1. Définir les structures Rust et un format de fixture normalisé : source, identité native, session, messages, snapshot de réponse, preuve et disposition de revue. Garder les données manquantes explicites.
2. Créer une commande locale qui sert l’interface et expose une lecture des données normalisées. Commencer avec des fixtures isolées ; conserver `index.html` comme référence tant que le rendu réel n’est pas équivalent.
3. Ajouter un premier adaptateur local en lecture seule après choix de l’outil et vérification de son format actuel. Ne pas implémenter quatre connecteurs d’un coup.
4. Raccorder la liste, le lecteur et l’inspecteur à une session réelle ; conserver les règles de snapshots et l’identité malgré un renommage/réimport.
5. Ajouter la persistance des choix de revue selon ADR-003, puis tester les événements de nouvelles réponses selon ADR-005.

## Critères de fin

- Une seule commande démarre et arrête proprement le processus local ; le navigateur affiche la boîte.
- L’interface conserve les filtres et la navigation ; le lecteur reste chronologique, avec détails à la demande.
- Une session importée garde son identité et ses messages originaux. Deux réponses ont leurs propres fichiers/commits/checks ; des preuves manquantes restent absentes.
- Lire un historique ne marque pas l’agent actif. Perte de source, absence de Git et métadonnées inconnues restent compréhensibles.
- Aucune approbation, migration ou reprise n’est exécutée automatiquement. Toute action native annonce machine, workspace et capacités.
- Les mesures de démarrage, mémoire, taille distribuée et dépendances sont consignées avant d’ajouter des fonctionnalités. Les budgets chiffrés sont à fixer, pas à présenter comme déjà atteints.
- Définir les tests de production au début de cette tranche : identité/déduplication, snapshots, parser, états de source et contrat de lecture. Les checks de la maquette ne les remplacent pas.

## Décisions requises par étape

| Sujet | Décision nécessaire | Moment |
|---|---|---|
| Frontend | TypeScript envisagé ; framework et compilation à choisir | Avant la nouvelle application web |
| Premier outil | Format, permissions et lecture locale vérifiés | Avant le premier adaptateur |
| Collecte / stockage | ADR-003 : architecture et persistance | Avant import durable / reconnexion |
| Capacités natives | ADR-004 : lecture, observation, reprise, attachement | Avant toute commande native réelle |
| Nouvelle réponse | ADR-005 : déduplication et disposition après report/traitement | Avant événements automatiques |
| MCP | ADR-006 : consommateur, propriétaire et portée | Tranche ultérieure |

## Organisation future proposée

```text
crates/relai-core/     Modèle, provenance, adaptateurs et persistance
crates/relai-cli/      Commande locale et service navigateur
web/                  Interface réelle, après choix du frontend
fixtures/             Histoires synthétiques et cas de parser
docs/                 Contrats produit, SDD et ADR
design/relai-inbox/   Référence UI et historique
```

Cette arborescence n’est pas créée vide dans cette branche. Créer les packages lors de la première implémentation ; conserver des limites simples et des adaptateurs propres à chaque outil.

## Extensions ultérieures

Sources distantes et reconnexion, lancement/attachement au terminal, rappels durables, regroupement de revues récurrentes, ajout/configuration MCP et politique de rétention. Leur présence dans les cas d’usage ne les inclut pas automatiquement dans le premier lot.

## Publication préalable

Le `main` distant a été vidé. Publier la nouvelle base via une PR préparée suivant [le dossier d’intégration](integration.md). Ne pas fusionner aveuglément son commit de suppression dans la branche de conception.
