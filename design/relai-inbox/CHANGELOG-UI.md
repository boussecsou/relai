# Journal UI — Relai inbox

## 2026-10-07 — Audit UX appliqué

Le bouton « Open terminal » ne montre plus de terminal intégré. Dans le produit réel, il ouvre le terminal de l’utilisateur dans le dossier de la session, ou s’y connecte en `ssh` pour une session distante. Dans la démo, il indique ce qui s’ouvrirait et copie la commande. Son libellé suit l’état : Review in terminal (approbation), Answer in terminal (question), Fix in terminal (échec), Resolve in terminal (conflit), Resume in terminal (reprise). Pour une réponse prête, l’action principale devient « Mark as handled ».

La boîte regroupe en tête les sessions qui attendent l’utilisateur (« Needs attention »). Tous les compteurs de la barre latérale comptent des sessions dans la vue. Une source hors ligne affiche un bandeau avec un lien vers les sessions concernées, et l’heure de synchronisation est visible. Les filtres sont réduits : les listes déroulantes d’agent, de statut et de machine disparaissent au profit de la barre latérale, des onglets (All, Ready, Working) et de puces retirables. Le badge de statut suit le titre, et le détail passe en fin de ligne.

Le lecteur affiche la dernière réponse en premier ; les échanges précédents sont repliés. Le bandeau d’état ne répète plus le texte et donne l’action à faire. La barre d’outils nomme « Mark handled » et « Snooze », et range « Mark unread » et l’export dans un menu. « Mark read » en lot est retiré ; la lecture se fait à l’ouverture. Raccourcis ajoutés : Enter, X, U, Z et ?. Le report accepte une date libre. La recherche garde les dernières requêtes et montre un extrait quand le texte n’est trouvé que dans la conversation.

Lisibilité : le gris secondaire passe de 3,1:1 à plus de 4,8:1 sur les fonds clairs, le texte utile ne descend plus sous 12 px et le vocabulaire « native » est remplacé par « terminal ».

### Vérification

Contrôle Chromium à 1440 et 390 px : bandeau, groupe prioritaire, puces, lecteur, menu, report libre, annulation avec Z, extrait de recherche et recherches récentes, sans erreur JavaScript ni défilement horizontal.

## 2026-10-07 — Interface plus claire et mouvement mesuré

La liste est allégée. Les cases et étoiles n’apparaissent qu’au survol, au focus clavier ou pendant une sélection. Les doublons disparaissent : « Local session » n’est plus répété, le nombre de messages passe en infobulle, le compte « 1–16 of 16 » et la note « Sample snapshot » sont retirés. Les filtres et les actions groupées partagent une seule barre, sans décalage de la liste. Les lignes ont toutes le même fond ; le point bleu et le gras signalent le non lu. Le projet s’affiche avec sa pastille de couleur, comme dans la barre latérale.

Les onglets s’appellent All, Ready, Needs attention et Working, sans icônes, et reprennent les noms des badges de statut. Les états vides expliquent comment remplir la vue. Dans le lecteur, Agent & resources, Permissions & tools et Origin & identity sont repliables ; leur état est mémorisé.

Mouvement, choisi selon la fréquence d’usage : l’indicateur d’onglet glisse, les lignes apparaissent en cascade de 25 ms seulement après un changement de boîte, le lecteur entre par la droite et la liste revient par la gauche, uniquement à la souris ou au toucher. La navigation clavier (J/K, Échap) reste sans animation. L’étoile rebondit à l’activation, les dialogues et toasts sortent plus vite qu’ils n’entrent, le menu mobile glisse comme un tiroir et les blocs de contexte se déploient. Avec « réduire les animations », ces mouvements deviennent de simples fondus.

Le bloc « Personal workspace » de la barre latérale est retiré : il n’offrait aucune action et poussait la navigation vers le bas.

### Vérification

Contrôle Chromium à 1440 et 390 px : liste, sélection, onglets, ouverture du lecteur, blocs repliables et menu mobile, sans erreur JavaScript. Structure HTML, syntaxe JavaScript et liens Markdown vérifiés.

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
