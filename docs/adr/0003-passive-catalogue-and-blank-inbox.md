---
status: accepted
---

# Catalogue passif et Inbox vierge

Décision historique de la première livraison passive. La séparation Sessions/Inbox et la consultation sans lancement restent en vigueur. Les étapes ultérieures ajoutent l’envoi Codex et le terminal à la demande ; voir le [contrat d’envoi](../research/codex-delivery.md) et [SDD-006](../sdd/0006-native-terminal.md).

La priorité de l’utilisateur est une interface graphique minimaliste et condensée suivant Glass. La livraison courante comprend découverte, lecture et rédaction avec persistance locale. Le terminal est différé.

Les historiques natifs alimentent Sessions et le destinataire. Ils ne sont pas convertis en mails reçus et ne remplissent pas l’Inbox. Lecture, démarrage du service et rédaction ne lancent aucun agent. Aucun exemple, libellé ou brouillon n’est créé au premier démarrage.

Les lecteurs ne reprennent pas les sessions et n’appellent pas leurs CLI. Noms, dossiers, branches enregistrées et identités natives sont conservés ; l’activité reste inconnue. Relai stocke séparément catalogue, index, annotations, préférences et brouillons dans son SQLite. Les sources sont connues ou configurées, dans l’environnement Linux/WSL courant.

La rédaction conserve un Markdown canonique avec Visuel/Markdown/Aperçu et contrôle de conversion. Envoi, file, programmation et runtime seront des opérations distinctes ultérieures ; cette livraison propose enregistrer, copier et exporter.

Inbox, Envoyés, En attente et Programmés ont des états vides honnêtes. Les anciens prototypes restent conservés. Une évolution native peut réduire la couverture d’un lecteur ; cette situation doit être visible. Voir la [recherche appliquée](../research/gui-and-session-discovery.md).
