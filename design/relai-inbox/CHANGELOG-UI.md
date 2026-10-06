# Journal UI — Relai inbox

## 2026-10-06 — Première version du nouveau concept

Relai devient une inbox pour relire et gérer les résultats de sessions CLI. La navigation Gmail utilise une typographie IBM Plex, des surfaces légères, des couleurs par agent et des thèmes clair/sombre.

La liste distingue l’état d’exécution et la décision de l’utilisateur : recevoir une réponse ne signifie pas avoir traité la session. Le fil affiche les messages utilisateur venus du terminal et les réponses de l’agent. Les commandes sont repliables ; les changements, vérifications et événements ont leurs propres onglets. Le panneau de contexte regroupe machine, dépôt, worktree, branche, commits, PR et métadonnées de l’agent. Les tests périmés et sources déconnectées restent explicitement identifiés.

Les interactions de gestion comprennent recherche, filtres, sélection multiple, favoris, lu/non lu, traitement, report, annulation, notes et export du fil. Une réponse simulée remonte sa session et la rend non lue. Le retour restaure le défilement et le focus de la liste. Le panneau de contexte reste accessible sur mobile. Les actions terminal/Git/PR présentent des illustrations ; aucune intégration réelle ni action Reply/Compose n’est incluse.

### Vérification

Contrôle automatisé au navigateur Chromium : les 19 sessions s’ouvrent, les quatre onglets de détail et les aperçus de terminal fonctionnent sans erreur JavaScript. Vérification des filtres de projet, recherche et résultat vide, lecture, classement et annulation, report, sélection multiple, note après rechargement, nouvelle réponse après rechargement, thèmes, densité et restauration du défilement.

Contrôle des largeurs 1440, 1280, 1024, 768, 390 et 320 px, avec inspection visuelle des listes, conversations et thèmes. Les contrôles d’ouverture du contexte et du terminal passent sur mobile. Aucun défilement horizontal de la page n’est observé. Le HTML reste autonome, sans chargement de police ou d’icône distant.

## 2026-10-06 — Nouvelle branche et documentation publique

Nouvelle base de travail `feat/relai-agent-inbox`. La maquette est maintenant `index.html` à la racine. Le README public, les objectifs, le glossaire et le guide de reprise reflètent la réception et la gestion des résultats. Les commandes Makefile et le hook de démarrage utilisent le fichier autonome actuel.

Les ajouts distants de gouvernance et CI ont aussi été intégrés : templates GitHub, CODEOWNERS, dépendances, contribution et vérification des liens Markdown. `make check` vérifie maintenant le prototype et les liens ; la CI couvre `main` et la nouvelle branche de travail.

## 2026-10-06 — Nettoyage de la nouvelle version

Suppression des anciennes maquettes, captures, exports, archives, recherches et spécifications du produit précédent. Le dépôt contient la maquette actuelle, sa documentation, ses licences et les outils de contribution et de vérification. Les guides de reprise et liens ont été actualisés. Vérification : structure HTML, syntaxe JavaScript et liens Markdown.
