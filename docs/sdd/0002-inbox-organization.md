# SDD-002 — Organiser et retrouver les chats

## Actualisation du 2 octobre 2026

Les filtres par agent restent visibles même sans résultat ; Inbox propose All, Needs attention et Replies. Le contrat terminal et ses limites sont dans [SDD-006](0006-native-terminal.md). Les révisions du 30 septembre ci-dessous restent le contexte historique.

Statut : catalogue, organisation locale et boîtes de livraison implémentés au 30 septembre 2026. La révision suivante prévaut sur les propositions historiques.

## Révision livrée — boîtes et recherche

Inbox démarre vide et reçoit uniquement les réponses, questions, validations et erreurs du travail géré. Sessions conserve les historiques détectés. Sent montre les acceptations natives ; Drafts les brouillons ; Queued les envois en attente/préparation/échec/incertitude ; Scheduled les échéances futures ou manquées. Libellés, favoris, archives et non-lu restent des annotations persistantes de conversation.

Un parseur partagé accepte `in:`, les raccourcis `inbox:terme` et `envoyer:terme`, les expressions entre guillemets et les filtres agent/dossier/branche/libellé/non-lu/favori. Les critères se combinent avec AND ; les portées contradictoires produisent une erreur visible. L’en-tête affiche la portée résolue. Métadonnées/prompts sont recherchés dans leurs boîtes ; historique natif/géré indexé dans Sessions. Les instantanés des envois conservent le contexte historique.

Une session active garde ses nouveaux prompts en FIFO. Une erreur bloque cette seule file ; les autres sessions continuent, même dans le même dossier. Les échéances dépassées pendant un arrêt deviennent Missed et nécessitent une action explicite. Contrat exact, opérateurs et limites : [envoi Codex](../research/codex-delivery.md).

## Besoins confirmés

- Une inbox inspirée de Gmail, avec une UI/UX soignée comme priorité du produit.
- Un historique des chats accessible même après fermeture de leur terminal. Fermer le navigateur ou masquer le terminal laisse le travail continuer tant que le moteur local tourne ; la reprise après arrêt de la machine dépend du harness.
- Des réponses dans la conversation et une file d’attente lorsque la session travaille déjà.
- Des libellés multiples sur les conversations, conservés lors des réponses, avec états d’exécution séparés.
- Des regroupements automatiques par harness, dossier et branche selon le contexte actuel, en complément des libellés personnalisés. Le contexte historique est conservé sur chaque message.
- Programmation ponctuelle des Relais ; confirmation avant envoi lorsque l’échéance a été manquée pendant un arrêt.
- Recherche dans les titres, sujets, prompts et réponses, avec filtres par harness, dossier, libellé, état, branche et informations Git/GitHub.
- Une application locale légère, conçue pour de nombreux chats et plus de 20 sessions de travail. Le code doit permettre des ajouts et modifications localisés. Le transfert entre agents est hors du périmètre actuel.

## Propositions à discuter

- Navigation : Inbox, Envoyés, En attente, Programmés, puis libellés personnalisés.
- Affichage, annulation et modification des messages programmés.

Ces propositions ne fixent ni l’architecture ni le périmètre de la première version.

## Décisions ouvertes

- Métadonnées historiques disponibles lors de la découverte de chats existants : afficher inconnu si le contexte passé n’est pas enregistré.
- Champs Git/GitHub à indexer ; recherche dans logs, diffs et commandes hors du premier périmètre accepté.
- Fuseau et seuil de retard ; reprise et interaction entre programmation et file d’attente.
- Cible de validation proposée : 10 000 chats et 25 sessions simultanées, sans plafond produit à 25. Machine de référence, taille des historiques, débit des événements et budgets de réactivité à définir.
- Arrêt explicite des agents, arrêt du moteur et reprise après redémarrage de la machine.

## Repères vérifiés

[Gmail](https://support.google.com/mail/answer/118708?hl=en) applique ses libellés aux messages ; Relai pourrait choisir de les appliquer aux conversations. La [recherche Gmail](https://support.google.com/mail/answer/7190?hl=en) combine texte et opérateurs. Son [envoi programmé](https://support.google.com/mail/answer/9214606?co=GENIE.Platform%3DDesktop&hl=en) permet annulation et replanification. Ce sont des inspirations d’interface ; le comportement local de Relai reste à définir.

[SQLite FTS5](https://www.sqlite.org/fts5.html) fournit recherche textuelle, classement et extraits. C’est une piste pour l’index local ; les filtres métier et les objectifs de performance demandent leur propre conception et validation.

[Codex app-server](https://learn.chatgpt.com/docs/app-server) distingue historique enregistré, thread chargé et activité d’exécution. Le dossier du thread et le dossier d’une commande peuvent différer. La persistance d’un chat ne garantit pas la survie de son processus.


## Livraison actuelle — catalogue distinct de l’Inbox

L’Inbox reste vide au démarrage, y compris après découverte des historiques. Sessions contient le catalogue natif ; Brouillons conserve uniquement les rédactions créées par l’utilisateur. Pas de données fictives ni de runtime créé par consultation.

Les libellés multiples, favoris, archives, tickets locaux, sélection groupée et filtre par agent sont persistants. Recherche de titre/dossier/branche/agent puis texte indexé progressivement ; pagination par 100. Les racines natives se configurent dans Sources. Les mails reçus, l’envoi réel, la file et la programmation sont différés, suivant [ADR-003](../adr/0003-passive-catalogue-and-blank-inbox.md).
