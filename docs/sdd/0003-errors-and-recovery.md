# SDD-003 — Erreurs et récupération

## Actualisation du 2 octobre 2026

La fermeture du composeur attend aussi les modifications survenues pendant la sauvegarde. Les intentions natives ne peuvent pas être restaurées en brouillons graphiques ou reprogrammées en perdant leurs skills et pièces jointes. Le contrat terminal et ses limites sont dans [SDD-006](0006-native-terminal.md). Les révisions du 30 septembre ci-dessous restent le contexte historique.

Statut : récupération des brouillons et livraisons Codex implémentée au 30 septembre 2026. La révision suivante prévaut sur les propositions historiques.

## Révision livrée — conflits, interruptions et incertitude

Les brouillons et modifications d’envoi utilisent des révisions optimistes. Un conflit conserve le texte local, permet une copie et n’écrase pas l’autre onglet. Dossier manquant, outil absent/version incompatible et erreurs natives restent visibles avec actions de récupération. Les décisions natives sont corrélées au processus d’origine, transmises une seule fois et expirent après perte du moteur.

Avant envoi natif, une opération persistée peut retourner en file ; après la frontière d’envoi sans résultat final enregistré, elle devient Uncertain. Aucun renvoi automatique. Verify native outcome consulte uniquement un thread/tour identifié ; sans accusé enregistré, inspection manuelle requise. Resend explicitly exige la reconnaissance du risque de travail répété. Retry, Skip et Cancel ne libèrent que la file concernée ; Cancel restaure un nouveau brouillon. Stop demande l’interruption du tour actif, sans supprimer son historique.

Au redémarrage, une échéance dépassée devient Missed ; Send now, Reschedule ou Cancel nécessitent un choix. Fermer le navigateur n’arrête pas le moteur. L’arrêt du service interrompt ses tours et ferme ses propres processus. Reconnexion SSE/snapshots reconstruit l’affichage, jamais une exécution. Tests de crash, accusé perdu, file, migration et reprise : [contrat et preuves](../research/codex-delivery.md).

## Besoins confirmés

- Reprendre automatiquement la session native lorsqu’un utilisateur répond à un chat arrêté et que le harness le permet.
- Si son dossier manque ou que la reprise échoue, afficher le problème et demander comment continuer.
- Conserver les historiques après arrêt de la machine ; la reprise dépend du harness.
- Concevoir les erreurs pour l’interface et l’API, avec réutilisation possible par un futur MCP Relai. Le MCP n’est pas à construire actuellement.
- Un échec suspend uniquement la file de la session concernée ; conserver les messages et proposer « Réessayer », « Ignorer cet envoi » ou « Annuler ». Les autres sessions continuent.

## Règles proposées

- Conserver le prompt et les libellés lorsqu’un envoi échoue ; ne pas effacer la conversation.
- Distinguer envoi enregistré, en file, accepté par le harness, réponse reçue, échec et livraison incertaine. L’acceptation ne signifie pas travail terminé.
- Afficher un résumé compréhensible avec une action concrète ; garder les détails techniques dans un panneau consultable.
- Associer un code stable, un identifiant de diagnostic, la session et l’envoi concernés. API et MCP traduisent la même erreur applicative selon leurs contrats respectifs.
- Reconnexion automatique avec délai croissant et limite pour les lectures sans effet de bord. Ne pas rejouer un prompt dont la livraison est incertaine sans réconciliation ou décision utilisateur.
- Dédupliquer les soumissions répétées avec une clé applicative ; cela ne garantit pas une exécution unique dans un harness sans déduplication native.
- Isoler l’échec d’un adaptateur ou d’une session pour maintenir la consultation des autres chats.
- Une approbation en attente ou une question de l’agent est un état de conversation, pas un échec.

## Cas à spécifier et vérifier

| Situation | Présentation et récupération proposées |
| --- | --- |
| Dossier déplacé ou supprimé | Garder le chat ; choisir un dossier de reprise explicitement, sans inventer son contexte passé. |
| Harness absent ou version incompatible | Historique consultable ; expliquer la capacité indisponible et permettre une nouvelle détection. |
| Authentification du harness requise | Expliquer comment rétablir la connexion native puis réessayer ; ne pas collecter ses credentials dans l’inbox. |
| Session externe non contrôlable | « À connecter » ; proposer uniquement les modes réellement supportés par l’adaptateur. |
| Reprise native impossible | Garder l’identité et l’historique ; proposer les options sans créer silencieusement une autre session. |
| Processus arrêté pendant le travail | Distinguer arrêt observé et résultat absent ; réconcilier avant toute relance. |
| Connexion perdue après envoi | Montrer livraison incertaine ; chercher l’accusé natif avant de proposer un renvoi. |
| Disque plein ou écriture refusée | Ne pas annoncer un envoi enregistré ; préserver le texte affiché et expliquer la correction requise. |
| Index d’un harness illisible | Montrer une découverte partielle ; les autres harnesses restent disponibles. |
| Git/GitHub indisponible | Dégrader le résumé et les pièces jointes Git ; garder les messages accessibles. |
| Échéance manquée pendant un arrêt | Demander confirmation avant envoi, conformément au cadrage. |
| Navigateur reconnecté ou flux en retard | Recharger état et historique ; éviter de reproduire un message ou un envoi. |

## Décisions ouvertes

- Portée des actions acceptées : « Réessayer » après réconciliation si livraison incertaine ; « Ignorer cet envoi » et « Annuler » à préciser pour message en file, travail actif et commandes enfants.
- Délais de reconnexion, nombre d’essais et règles de réconciliation propres à chaque harness.
- Permissions de l’utilisateur et des futurs clients API/MCP pour envoi, arrêt et approbation.
- Rétention des diagnostics, texte masqué et export volontaire pour un rapport de bug.

## Critères de validation proposés

Vérifier dossier manquant, version incompatible, arrêt entre livraison et accusé, stockage indisponible, double clic et reconnexion. Chaque scénario doit préserver le texte, l’identité de session et un état explicable. Une livraison incertaine ne doit pas provoquer deux exécutions silencieuses.


## Erreurs de la livraison graphique passive

Découverte indépendante par source avec couverture partielle ; un schéma inconnu ou un store inaccessible ne bloque pas les autres. Un fichier disparu garde ses références locales et affiche une erreur de lecture. Une ligne JSONL finale incomplète est ignorée jusqu’à son achèvement ; une entrée complète corrompue produit une erreur sans réparation native.

Les brouillons sont sauvegardés avec révision optimiste. Un conflit ou un échec garde le contenu local ; « Enregistrer une copie », copier et exporter permettent sa récupération. La navigation attend la sauvegarde et reste dans l’éditeur en cas d’échec. Le rechargement avertit si du texte n’a pas été enregistré. Les erreurs de livraison/runtime décrites plus haut restent des règles futures ; aucun prompt n’est envoyé actuellement.
