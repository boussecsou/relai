# SDD-002 — Organiser et retrouver les chats

Statut : brouillon. Besoins recueillis ; aucune fonctionnalité implémentée.

## Besoins confirmés

- Une inbox inspirée de Gmail, avec une UI/UX soignée comme priorité du produit.
- Un historique des chats accessible même après fermeture de leur terminal.
- Des réponses dans la conversation et une file d’attente lorsque la session travaille déjà.
- Des libellés multiples sur les conversations, conservés lors des réponses, avec états d’exécution séparés.
- Des regroupements automatiques par agent, dossier et branche, en complément des libellés personnalisés.
- Programmation ponctuelle des Relais ; confirmation avant envoi lorsque l’échéance a été manquée pendant un arrêt.
- Recherche dans les titres, sujets, prompts et réponses, avec filtres par harness, dossier, libellé, état, branche et informations Git/GitHub.
- Une application locale légère, conçue pour de nombreux chats et plus de 20 sessions de travail. Le code doit permettre des ajouts et modifications localisés. Le transfert entre agents est hors du périmètre actuel.

## Propositions à discuter

- Navigation : Inbox, Envoyés, En attente, Programmés, puis libellés personnalisés.
- Affichage, annulation et modification des messages programmés.
- Séparer la persistance de l’historique du cycle de vie des processus ; fermer la vue terminal ne devrait pas arrêter le travail.

Ces propositions ne fixent ni l’architecture ni le périmètre de la première version.

## Décisions ouvertes

- Regroupements automatiques : métadonnées actuelles de session ou contexte conservé lors de chaque message ?
- Champs Git/GitHub à indexer ; recherche dans logs, diffs et commandes hors du premier périmètre accepté.
- Fuseau et seuil de retard ; reprise et interaction entre programmation et file d’attente.
- Cible de validation proposée : 10 000 chats et 25 sessions simultanées, sans plafond produit à 25. Machine de référence, taille des historiques, débit des événements et budgets de réactivité à définir.
- Signification de fermeture du terminal, règles d’arrêt et reprise des processus ?

## Repères vérifiés

[Gmail](https://support.google.com/mail/answer/118708?hl=en) applique ses libellés aux messages ; Relai pourrait choisir de les appliquer aux conversations. La [recherche Gmail](https://support.google.com/mail/answer/7190?hl=en) combine texte et opérateurs. Son [envoi programmé](https://support.google.com/mail/answer/9214606?co=GENIE.Platform%3DDesktop&hl=en) permet annulation et replanification. Ce sont des inspirations d’interface ; le comportement local de Relai reste à définir.

[SQLite FTS5](https://www.sqlite.org/fts5.html) fournit recherche textuelle, classement et extraits. C’est une piste pour l’index local ; les filtres métier et les objectifs de performance demandent leur propre conception et validation.

[Codex app-server](https://learn.chatgpt.com/docs/app-server) distingue historique enregistré, thread chargé et activité d’exécution. Le dossier du thread et le dossier d’une commande peuvent différer. La persistance d’un chat ne garantit pas la survie de son processus.
