# SDD-003 — Erreurs et récupération

Statut : brouillon. L’utilisateur demande une gestion des erreurs explicite et documentée. Les règles suivantes sont des propositions à valider avant implémentation.

## Besoins confirmés

- Reprendre automatiquement la session native lorsqu’un utilisateur répond à un chat arrêté et que le harness le permet.
- Si son dossier manque ou que la reprise échoue, afficher le problème et demander comment continuer.
- Conserver les historiques après arrêt de la machine ; la reprise dépend du harness.
- Concevoir les erreurs pour l’interface, l’API et le MCP Relai.

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

- Portée d’annulation : message en file, travail actif, commandes enfants et arrêt du moteur.
- Délais de reconnexion, nombre d’essais et règles de réconciliation propres à chaque harness.
- Permissions de l’utilisateur et des futurs clients API/MCP pour envoi, arrêt et approbation.
- Rétention des diagnostics, texte masqué et export volontaire pour un rapport de bug.

## Critères de validation proposés

Vérifier dossier manquant, version incompatible, arrêt entre livraison et accusé, stockage indisponible, double clic et reconnexion. Chaque scénario doit préserver le texte, l’identité de session et un état explicable. Une livraison incertaine ne doit pas provoquer deux exécutions silencieuses.
