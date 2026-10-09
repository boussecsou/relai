# Audit — page de détail d'une réponse

Date : 2026-10-07. Périmètre : la page qui s'ouvre depuis l'Inbox (barre du haut, en-tête, onglets, conversation, zone de réponse, panneau Details) et la navigation autour (retour, précédent/suivant, liste, raccourcis).

## Mise à jour — 2026-10-08

Le gabarit de réception remplace les onglets centraux et le panneau ouvert par défaut décrits dans l’audit historique ci-dessous.

| Avant | Après | Pourquoi |
|---|---|---|
| Dernière réponse seule, prompt dans les messages repliés dessous | Dernier prompt puis réponse ; historique au-dessus | Relier la demande au résultat et conserver l’ordre des échanges. |
| Conversation / Changes / Checks / Activity dans le lecteur | Conversation permanente ; inspecteur Result / Activity / Context à la demande | Alléger la lecture tout en donnant accès aux preuves et à la provenance. |
| Panneau automatiquement visible sur grand écran | Fermé à l’entrée ; panneau desktop, fenêtre modale sur petit écran | Garder un espace de lecture prévisible. |
| Un jeu de fichiers/tests par session | Sélection d’une réponse avec son propre snapshot | Éviter d’appliquer les preuves récentes aux messages anciens. |
| Détails mobiles affichés mais parfois encore `inert` | Fenêtre interactive avec maintien du focus et fermeture par Échap | Rendre les détails utilisables au clavier et restaurer le point de départ. |
| Diff de navigation utilisé pour tous les fichiers | Aperçu connu ou contenu indisponible explicite | Distinguer les données présentes des informations manquantes. |

Les points historiques A et B sont traités : deux snapshots distincts sont simulés dans navigation, et le fil est chronologique. Le sélecteur porte sur les réponses individuelles ; aucune vue cumulative sans attribution n’est ajoutée. Les points C (navigation mobile), D (dates complètes) et E (ressenti du mouvement) restent ouverts. Aucun backend n’est connecté.

Vérification locale : `make check`, 19 sessions dans Chromium, huit largeurs (320–1600 px), thèmes, focus, fenêtres imbriquées, défilement, rechargement, notes et arrivée simulée. Voir [le journal UI](CHANGELOG-UI.md).

## Audit historique — 2026-10-07

## Méthode

- Lecture du code (`renderReader`, `contextHTML`, `readerContent`, `changeSession`, gestionnaires clavier).
- Mesures dans Chromium à 1536 × 740 px, la taille réelle d'un écran 1920 px à 125 %.
- Parcours clavier, onglets Conversation / Changes / Checks / Activity, thème sombre, 1100 px et 390 px.
- Grille de lecture : `apple-design` (orientation « où suis-je », regroupement, simplicité, feedback), `emil-design-eng` et `review-animations` (fréquence, durées, easing, mouvement), puis accessibilité (clavier, rôles, tailles de texte).

## Mesures

| Mesure (1536 × 740) | Avant | Après |
|---|---|---|
| Hauteur de lecture défilante | 391 px (53 %) | 597 px (81 %) |
| Zones fixes au-dessus du contenu | barre (49) + titre (84) + onglets (42) | barre (49), le titre défile, les onglets restent |
| Barres de défilement imbriquées | 3, épaisses sous Windows | 3, fines |
| Arrêts de tabulation avant le contenu | 14+ | inchangé, mais le focus va sur le titre à l'ouverture au clavier |

## Constats et décisions

Priorité : **P0** bug ou blocage de flux, **P1** hiérarchie ou lisibilité, **P2** accessibilité et cohérence.

| # | Prio | Constat | Décision | État |
|---|---|---|---|---|
| 1 | P0 | « Mark handled » laissait l'utilisateur sur la session : affichage « – of 15 », précédent/suivant bloqués. « Snooze » renvoyait à la liste. Deux comportements pour la même intention. | Les deux actions passent à la session suivante de la liste (ou reviennent à la liste si elle est vide). « Undo » rouvre la session d'origine. | Corrigé |
| 2 | P0 | Onglet Checks : « Checks were not run » suivi de « A successful command does not certify the entire project ». Message contradictoire. | Une phrase par état (non lancé, échec, en attente, partiel, bloqué, inconnu). | Corrigé |
| 3 | P0 | « 1 changed files » : pluriel faux, dans l'onglet et dans la bande de résultats. | Accord singulier / pluriel. | Corrigé |
| 4 | P1 | Seulement 53 % de la hauteur sert à lire. Titre, métadonnées et onglets restaient fixes. | Titre et métadonnées entrent dans la zone défilante. Les onglets sont collants. Le titre compact apparaît dans la barre du haut dès qu'il sort de l'écran. | Corrigé |
| 5 | P1 | « Approval needed » apparaissait deux fois (pastille et titre de l'encadré), puis une troisième fois dans Activity. | L'encadré devient une seule ligne qui dit quoi faire (« Approve or deny in your terminal. Nothing has run yet. »). La pastille de l'en-tête garde l'état. | Corrigé |
| 6 | P1 | « 3 of 15 » sans dire 3 sur quoi. Le bouton retour n'avait ni nom ni raccourci visible. | « 3 of 15 in Inbox » (ou le projet filtré). Le retour indique sa destination et la touche Esc. | Corrigé |
| 7 | P1 | La zone de réponse était décalée de la largeur de la barre de défilement par rapport au contenu. Sur contenu court, elle remontait sous le texte. | Elle est collante en bas de la zone défilante, alignée sur le contenu, avec un dégradé pour détacher le texte qui passe dessous. | Corrigé |
| 8 | P1 | Activity : chronologie sans heure. | Une heure par événement, tirée des heures des messages et de l'observation. Aucune valeur inventée. | Corrigé |
| 9 | P1 | La portée des onglets était ambiguë (dernière réponse ou session entière). | « Latest response · commit » sur Changes et Checks, « Whole session » sur Activity, info-bulle sur chaque onglet. Règle complète dans `docs/product-direction.md`. | Corrigé (libellés) |
| 10 | P1 | Panneau Details : l'en-tête défilait avec le contenu, on perdait le titre du panneau et le bouton de fermeture. | En-tête collant. | Corrigé |
| 11 | P2 | Onglets sans navigation clavier ni lien avec leur contenu. | Flèches, Début et Fin. `aria-controls`, `tabpanel`, un seul onglet dans l'ordre de tabulation. | Corrigé |
| 12 | P2 | Ouvrir une session au clavier laissait le focus dans la liste. | Le focus va sur le titre (sans anneau visible). | Corrigé |
| 13 | P2 | Textes de 11 px dans le panneau et les en-têtes de message. | 12 px pour les légendes et les mentions. Les étiquettes en capitales restent à 11 px. | Corrigé |
| 14 | P2 | Barres de défilement épaisses et nombreuses. | `scrollbar-width: thin` sur la lecture, le panneau, la liste et le menu. | Corrigé |
| 15 | P2 | Le raccourci I (détails) n'était pas dans l'aide. | Ajouté à la liste des raccourcis. | Corrigé |

## Mouvement (grille `review-animations`)

| Élément | Fréquence | Décision |
|---|---|---|
| Ouverture du panneau Details | Occasionnelle | 220 ms, `ease-out`. Aucun mouvement quand l'action vient du clavier. `prefers-reduced-motion` respecté. Il anime `grid-template-columns` (propriété de mise en page) : accepté, car la largeur du texte doit réellement changer. |
| Titre compact dans la barre | À chaque défilement | Opacité seule, 140 ms, sans mouvement. |
| Changement d'onglet | Dizaines par jour | Aucun mouvement. |
| Passage à la session suivante | Très fréquent | Aucun mouvement. |

## Non traité (à décider ou à construire)

| # | Sujet | Pourquoi |
|---|---|---|
| A | Fichiers et checks par réponse, sélecteur « Dernière réponse / Toute la session » | Demande un modèle de données par réponse. La règle est écrite, la démo n'a qu'un jeu de données par session. |
| B | Ordre des messages | La dernière réponse est en haut, mais les messages précédents sont ensuite dans l'ordre chronologique. À trancher : tout du plus récent au plus ancien, ou fil chronologique classique avec la dernière réponse en bas. |
| C | Précédent / suivant sur mobile | Absents sous 700 px. Prévoir un geste de balayage ou un menu. |
| D | Dates des messages | Les données de démo n'ont que l'heure. Le produit réel devra afficher la date pour les sessions de plusieurs jours. |
| E | Mouvement vérifié par captures, pas à l'œil | Valider les durées en direct. |
