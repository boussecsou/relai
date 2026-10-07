# Relai — inbox de sessions d’agents

Première version interactive, autonome : ouvrir [`index.html`](../../index.html), à la racine du dépôt dans un navigateur. Les polices IBM Plex et les icônes sont intégrées au fichier ; aucun service externe ni installation n’est nécessaire.

Pour servir la maquette depuis la racine du dépôt :

```bash
python3 -m http.server 4180 --bind 127.0.0.1
```

Ouvrir ensuite http://localhost:4180.

## Parcours

- Navigation Gmail : Inbox, Needs attention, Starred, Snoozed, Handled, All sessions ; projets et agents.
- Recherche dans les titres, messages, projets, branches et machines ; filtres par agent, statut, machine et lecture.
- Une session ouvre son fil de messages utilisateur et agent, avec commandes et sorties repliables. Aucun Reply ou Compose.
- Détail Conversation / Changes / Checks / Activity (audit : [AUDIT-DETAIL.md](AUDIT-DETAIL.md)) et panneau Details : machine, dossier, dépôt, worktree, branche, commits, PR, modèle, ressources, permissions, skills et identité.
- Étoiles, lu/non lu, traitement, report, sélection multiple, annulation, notes privées et export Markdown du fil.
- Aperçus Git, PR, diff et relations entre conversations. Ces aperçus sont simulés.
- Thèmes clair et sombre, densité compacte, adaptation mobile et raccourcis `/`, J/K, S, E, T, I et Échap.
- Le panneau Agent sources permet de simuler une nouvelle réponse : le fil devient non lu et remonte dans la liste.

## Données de démonstration

19 sessions réparties entre Codex, Claude Code, Pi et OpenCode, quatre projets et des machines locales/distantes. Les titres, identifiants, modèles, métriques et preuves sont fictifs.

| Situation | Session |
| --- | --- |
| Réponse prête, tests passés et PR ouverte | Simplify inbox navigation |
| Permission en attente | Upgrade the database schema |
| Agent en cours | Review session discovery |
| Question nécessitant une décision | Choose the retention policy |
| Erreur et résultat partiel | Fix the mobile header |
| Rapport sans dépôt Git | Research session naming |
| Conflit de merge | Integrate the sidebar changes |
| Source distante hors ligne, statut inconnu | Audit background deliveries |
| Limitation fournisseur et nouvelle tentative | Check dependency compatibility |
| Compaction du contexte | Document the connector contracts |
| Messages natifs en file d’attente | Refine the conversation reader |
| Exécution interrompue | Explore the new search layout |
| Branche de conversation Pi | Compare two storage approaches |
| Résultat de sous-agent | Review the authentication patch |
| Vérification portant sur un ancien commit | Clean up the settings panel |
| Worktree en detached HEAD | Investigate the release regression |
| Revue récurrente | Daily dependency review |
| Historique terminé et PR fusionnée | Improve empty states |
| Historique disponible, exécutable absent | Inspect the old API integration |

## Persistance et limites

Les décisions de lecture/classement, étoiles, notes, thèmes, densité et réponse simulée sont conservés dans `localStorage`, sous la clé `relai-inbox-v1`. Preferences → Reset restaure les données fictives. Si le navigateur bloque le stockage, les changements restent dans l’onglet.

Le report enregistre un choix ; il ne déclenche aucun rappel en arrière-plan. Le bouton terminal n’ouvre aucun terminal intégré : il indique le terminal local qui s’ouvrirait et copie la commande de reprise. Aucun processus d’agent, commande Git, migration, connexion serveur ou appel GitHub n’est lancé. Ce fichier explore le produit ; il ne remplace pas l’application React.

## Origine et licences

L’interface utilise IBM Plex, les icônes Lucide et des couleurs par agent. Les licences des éléments intégrés figurent dans `licenses/`.

Voir `CHANGELOG-UI.md` pour les décisions de cette version et les vérifications effectuées.
