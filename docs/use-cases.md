# Relai — cas d’usage et couverture

Inventaire du 8 octobre 2026 : 37 cas. « Simulé » concerne uniquement la maquette ; « Partiel » signale un parcours incomplet ; « À simuler » signale une extension absente. Les essais utilisateur restent « À tester » : les contrôles locaux ne valent pas validation UX.

[Registre Notion](https://app.notion.com/p/5be785a0b463461eb98638bf80773c40) · [Règles UI](ui-guidelines.md) · [Première tranche](implementation-plan.md).

## Inventaire

| Référence | Cas d’usage | Fixture | Couverture | Critère principal |
|---|---|---|---|---|
| [UC-001](https://app.notion.com/3f2eba09656f81079fd4c0fab45374f5) | Relire un résultat prêt | navigation | Simulé | Lire demande, réponse et liens de résultat sans confondre réponse prête et revue terminée. |
| [UC-002](https://app.notion.com/3f2eba09656f8133a3f1e9d3a4f15f1d) | Identifier une approbation en attente | approval | Simulé | Identifier la commande demandée, sa machine et le fait qu’aucune approbation n’est exécutée par Relai. |
| [UC-003](https://app.notion.com/3f2eba09656f81fbbf43cc89c3f7e5ee) | Suivre une session active | running | Simulé | Reconnaître une mise à jour de progression ; ne pas la présenter comme un résultat final. |
| [UC-004](https://app.notion.com/3f2eba09656f811b87bbf65aa60be997) | Répondre à une question bloquante | question | Simulé | Retrouver la question et poursuivre dans l’outil natif. |
| [UC-005](https://app.notion.com/3f2eba09656f81a9bbceea643c48981a) | Comprendre un échec avec résultat partiel | failure | Simulé | Identifier travail conservé, validation échouée et réponse incomplète. |
| [UC-006](https://app.notion.com/3f2eba09656f8116899accbf7cd55957) | Relire un rapport sans Git | research | Simulé | Consulter le rapport sans imposer dépôt, branche ou commit Git. |
| [UC-007](https://app.notion.com/3f2eba09656f81d0ad4ecd11d2271ffa) | Identifier un merge en conflit | conflict | Simulé | Voir le merge en cours et les fichiers en conflit avant toute reprise. |
| [UC-008](https://app.notion.com/3f2eba09656f81eca658d86bfe989908) | Consulter une source distante hors ligne | offline | Simulé | Lire l’historique avec état courant inconnu et observation de la source déconnectée. |
| [UC-009](https://app.notion.com/3f2eba09656f812aa678f794ac48100a) | Suivre une nouvelle tentative fournisseur | retry | Simulé | Distinguer nouvelle tentative automatique, erreur et résultat final. |
| [UC-010](https://app.notion.com/3f2eba09656f8170a613c33ca41d603c) | Comprendre une compaction du contexte | compact | Simulé | Conserver les anciens échanges accessibles pendant la compaction. |
| [UC-011](https://app.notion.com/3f2eba09656f813786d0ecf77930ae85) | Distinguer messages en file et messages traités | queue | Simulé | Ne pas assimiler un message en attente à une demande déjà traitée. |
| [UC-012](https://app.notion.com/3f2eba09656f816ea621d8e90f0ba5b5) | Reprendre une session interrompue | interrupted | Simulé | Examiner le travail sauvegardé avant reprise dans l’outil natif. |
| [UC-013](https://app.notion.com/3f2eba09656f813ca7c2c9b97eed0842) | Comprendre une branche de conversation | fork | Simulé | Distinguer fork de conversation, chemin courant et branche Git. |
| [UC-014](https://app.notion.com/3f2eba09656f81b5adbac97d9c43bd67) | Relire un résultat de sous-agent | subagent | Simulé | Conserver la relation au parent ; une revue de sous-agent n’est pas une implémentation terminée. |
| [UC-015](https://app.notion.com/3f2eba09656f8107ac62cd68bce8729d) | Détecter des vérifications sur un ancien commit | stale | Simulé | Afficher commit validé et commit actuel ; les anciens checks restent attachés au premier. |
| [UC-016](https://app.notion.com/3f2eba09656f8142b53ed4f64f2812fa) | Examiner un snapshot en detached HEAD | detached | Simulé | Expliquer l’absence de branche nommée sans masquer le snapshot. |
| [UC-017](https://app.notion.com/3f2eba09656f811d8268c9f91e1fb0ed) | Suivre une revue récurrente | daily | Partiel | Regrouper les rapports sans multiplier les alertes pour un résultat inchangé ; politique encore ouverte. |
| [UC-018](https://app.notion.com/3f2eba09656f8100968ec56767862749) | Retrouver un résultat déjà fusionné | merged | Simulé | Lire PR fusionnée et historique sans présenter l’agent comme actif. |
| [UC-019](https://app.notion.com/3f2eba09656f812c8cd1d9e1249bdae6) | Lire un historique sans exécutable installé | missing | Simulé | Garder le transcript lisible ; expliquer l’absence d’exécutable et l’action indisponible. |
| [UC-020](https://app.notion.com/3f2eba09656f81c29671c379ab4d1ae0) | Classer les sessions et agir en groupe | interface | Simulé | Classer sans altérer l’exécution ; traitement/report avance la liste et annulation restaure. |
| [UC-021](https://app.notion.com/3f2eba09656f81cdad45f7c0fd2542ac) | Rechercher et retrouver une session | interface | Simulé | Rechercher titre, messages, branches et machines ; retour au filtre, focus et défilement. |
| [UC-022](https://app.notion.com/3f2eba09656f81b2ba31d5418ebdf4c5) | Filtrer par statut ou environnement | interface | Partiel | Rendre les filtres statut/machine accessibles ; leur logique seule ne suffit pas. |
| [UC-023](https://app.notion.com/3f2eba09656f8152b2afc427a18b6470) | Recevoir une nouvelle réponse | running → ready | Simulé | Ajouter une réponse au fil existant, le rendre non lu et le remonter ; conserver au rechargement. |
| [UC-024](https://app.notion.com/3f2eba09656f81e3a280cd00fb83603b) | Recevoir une réponse après traitement ou report | à créer | Partiel | Simulation revient dans l’inbox après classement ; politique de doublons/report/historique des décisions ouverte. |
| [UC-025](https://app.notion.com/3f2eba09656f816bb8a7df04d5b640fe) | Reprendre dans le terminal local ou distant | navigation / approval | Partiel | Annoncer cible, dossier et capacité ; copie simulée distincte d’une reprise réellement exécutée. |
| [UC-026](https://app.notion.com/3f2eba09656f81f3b410cc32977ce447) | Annoter et exporter une conversation | interface | Simulé | Note privée persistée localement et export du transcript ; pas de réponse envoyée à l’agent. |
| [UC-027](https://app.notion.com/3f2eba09656f81d7b4c4fd81fdf2edc6) | Utiliser les préférences et l’accessibilité | interface | Simulé | Clair/sombre, mobile, raccourcis, focus et détails fermés accessibles ; essai utilisateur à consigner. |
| [UC-028](https://app.notion.com/3f2eba09656f81498020e4075f2557d4) | Conserver ou réinitialiser les choix locaux | interface | Simulé | Expliquer stockage indisponible et portée du reset ; sessions natives inchangées. |
| [UC-029](https://app.notion.com/3f2eba09656f8121bbf2c4065c102ab5) | Ajouter et reconnecter une source | à créer | À simuler | Concevoir ajout, permissions, erreurs, reconnexion et réconciliation sans doublons. |
| [UC-030](https://app.notion.com/3f2eba09656f81d0935cde60859c7e55) | Ajouter et gérer un serveur MCP | à créer | À simuler | Préciser consommateur et portée avant activation MCP ; simuler succès, erreur et désactivation. |
| [UC-031](https://app.notion.com/3f2eba09656f81549d0ef2f35e2b2a7f) | Lire des métadonnées absentes ou estimées | offline / missing / navigation | Simulé | Afficher indisponible pour une absence ; coûts estimés distincts de facturation. |
| [UC-032](https://app.notion.com/3f2eba09656f81c4bc9fe256c09472e0) | Éviter une attribution erronée dans un checkout partagé | Main checkout | Partiel | Ne pas attribuer l’ensemble du checkout à un agent ; provenance requise. |
| [UC-033](https://app.notion.com/3f2eba09656f8142b5ecf5dd60b53af0) | Renommer ou réimporter une session sans doublon | research / identité | Partiel | Préserver identité lors d’un renommage/réimport ; comportement réel à implémenter. |
| [UC-034](https://app.notion.com/3f2eba09656f8195b232e9e6fdad4497) | Faire revenir une session reportée à échéance | à créer | À simuler | Concevoir retour à échéance et traitement des événements pendant le report ; aucun rappel en arrière-plan actuel. |
| [UC-035](https://app.notion.com/p/3f3eba09656f817d98c8d050b13898be) | Lire un relais avec un inspecteur à la demande | approval / navigation | Simulé | Le dernier prompt et sa réponse restent au centre ; les échanges anciens sont au-dessus. Les détails sont fermés à l’entrée. I et Échap ouvrent/ferment les détails ; le focus revient au déclencheur. Sur mobile, la fenêtre conserve le focus. |
| [UC-036](https://app.notion.com/p/3f3eba09656f811d99ddd265d77ac803) | Comparer les preuves de plusieurs réponses | navigation · 10:32 / 10:42 | Simulé | La réponse de 10:32 montre un fichier et huit checks à 72b6e10. Celle de 10:42 montre trois fichiers, 24 checks et le contrôle de types à c4a92d1. Les informations absentes sur un ancien message restent indisponibles. |
| [UC-037](https://app.notion.com/p/3f3eba09656f81f6a283c5f37cf31ccc) | Comprendre une alerte selon sa portée | offline / approval / stale / failure | Partiel | Une alerte de source apparaît au-dessus de la liste ; une alerte de session sous son titre ; une alerte de vérification reste liée à la réponse concernée. Ne pas répéter un avertissement sous chaque message. Le lien mène au périmètre touché. |

## Parcours de référence

- `index.html#session=approval` : prompt, demande d’approbation, machine/branche, détails à la demande.
- `index.html#session=navigation` : historique au-dessus ; snapshots 10:32 / 10:42 avec fichiers et checks distincts.
- `index.html#session=offline` : source worker-02 hors ligne, historique lisible et état courant inconnu.
- `index.html#session=stale` : vérification sur un ancien commit.
- Agent sources → Simulate a new response : ajoute une réponse à `running`, sans créer de fil séparé.

## Ordre de développement proposé

Commencer par UC-001/002/004/005/008/015/021/023/031/033/035/036 sur une source locale. Construire le modèle et la lecture réelle avant reprise native, sources distantes, rappels et MCP. Les UC de ces extensions restent au registre et ne bloquent pas le premier socle Rust.
