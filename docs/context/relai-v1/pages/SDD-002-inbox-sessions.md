# SDD-002 — Inbox, organisation et sessions

Date de consolidation : 4 octobre 2026. Statut : **Direction confirmée ; données simulées**.

## Organisation

Inbox présente les retours reçus, Starred les éléments étoilés, Pending les envois en attente/programmé ou suspendus, Sent les prompts acceptés/envoyés, Drafts les compositions et réponses conservées. Les détails de livraison doivent garder leurs distinctions. Sessions présente les identités natives, avec leurs Relais associés.

All conversations, Needs review et Completed filtrent les Relais. Les groupes d’activité de terminal s’appliquent aux sessions. Projects organise le contexte ; les filtres par agent sont disponibles depuis la sidebar et la liste.

## Liste

Titres renforcés et point discret pour les non-lus ; états durables. Métadonnées secondaires agent, dossier/repo, session, tags, statut et date. Couleurs cohérentes, noms toujours présents. Deux dossiers ou sessions homonymes doivent rester identifiables par chemin/ID.

Recherche avec filtres agent/période/ordre, menus soignés, résumé des filtres et Clear. État vide avec Clear filters. Sélection multiple, Select all intermédiaire, mark read/unread, star/unstar et export des brouillons. Pas d’action Archive/Delete tant que son sens métier n’est pas défini.

## Navigation

Ouvrir une session montre ses Relais ; ouvrir un Relai conserve l’origine de navigation. Retour navigateur et bouton contextuel restaurent liste, filtres, focus et scroll. Le compteur Inbox décrit les non-lus.

## Exemples et cible

Prototype : sept sessions natives et neuf Relais reçus, plus fixtures Sent/Pending/Drafts. Ce sont des exemples, pas des sessions de l’ordinateur. Cible historique : 10 000 chats et 25 sessions ; performances et budgets non mesurés. Métadonnées paginées, recherche indexée et lecture paresseuse sont les orientations de production.

[Source historique](../sources/repository-docs/sdd/0002-inbox-organization.md). Les libellés sont remplacés par Projects dans la direction actuelle ; Scheduled est présenté sous Pending, pas une nouvelle catégorie prioritaire.
