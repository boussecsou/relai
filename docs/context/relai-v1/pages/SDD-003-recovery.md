# SDD-003 — États, erreurs et reprise

Date de consolidation : 4 octobre 2026. Statut : **Direction et contrat proposés**.

## Objectif

Un problème sur un agent ne bloque pas les autres. Conserver les prompts, l’historique et une action de récupération contextualisée.

| Situation | Présentation / action |
| --- | --- |
| Session connectée | Open session ; envoi selon disponibilité |
| Historique enregistré | Resume in Relai si propriété/compatibilité vérifiées |
| Serveur manquant | Connect server |
| Activité externe inconnue | Check connection ; ne pas lancer un doublon |
| Agent absent | Indiquer l’exécutable manquant et conserver le brouillon |
| Agent mis à jour | Recheck compatibility ; conserver lecture de l’historique |
| Interface incompatible | Limiter les commandes, expliquer le mode natif disponible |
| Envoi en échec | Suspendre la file concernée, Retry / Skip / Cancel |
| Échéance manquée | Confirmation explicite avant envoi différé |
| Stockage navigateur indisponible | Tab-only retention dans la maquette |

## Contrat de livraison proposé

File durable par session, identifiant local d’envoi, événements accepted et completed séparés, état incertain si l’agent a peut-être accepté sans accusé conservé. Ne pas promettre exactly-once sans mécanisme natif d’idempotence. Pas de retry automatique aveugle après une déconnexion ambiguë.

Un moteur relancé ne prouve pas que les anciens agents travaillent encore. Fermer un panneau ou un onglet n’arrête pas l’agent ; arrêt explicite à traiter séparément. Après arrêt de machine, l’historique reste conservé ; reprise selon capacités.

Les scénarios HTML sont simulés. [SDD original et détails conservés](../sources/repository-docs/sdd/0003-errors-and-recovery.md).
