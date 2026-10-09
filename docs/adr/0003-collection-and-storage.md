# Définir la collecte et le stockage

Statut : proposé.

Le cœur Rust et l’interface navigateur locale sont retenus dans ADR-007. Reste à comparer collecte locale, relais central ou hybride pour les sources distantes, puis choisir la persistance et la réconciliation. Disponibilité hors ligne, fraîcheur, permissions et déploiement doivent être évalués sur une première source réelle. Aucun moteur de stockage ni transport n’est accepté.

Sortie attendue : modèle d’identité par source, événements dédupliqués, schéma/version de snapshots, persistance des décisions de revue et politique de rétention.
