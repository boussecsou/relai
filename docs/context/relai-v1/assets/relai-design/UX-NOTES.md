# Notes UX/UI — Relai

Ce fichier est le journal de référence des choix d’interface. Chaque modification future doit indiquer son motif, son effet visible et sa vérification. Les choix remplacés restent dans l’historique ; ils ne doivent pas être présentés comme encore applicables.

- [Journal des modifications du 4 octobre 2026](CHANGELOG-UI.md)
- [Audit ayant motivé les modifications](audit/AUDIT-UI-UX.md)
- [Notes de la version précédente, conservées pour l’historique](audit/UX-NOTES-before-implementation.md)
- [Notes en anglais, intégrées dans l’interface](DESIGN-NOTES.md)

## Contraintes validées

- Priorité à l’ordinateur et aux thèmes clair/sombre. Conserver le mobile actuel ; aucune refonte mobile pour cette livraison.
- Interface autonome HTML/CSS/JavaScript, utilisable sans installation. Les agents, dossiers, terminaux, envois et Git restent illustratifs.
- Structure inspirée de Gmail, esthétique calme et compacte, projets dans la sidebar.
- Libellé exact **Compose relai**. Slogan conservé : **One prompt. One title. Your chosen session.**
- Conserver **Title**, **Send prompt**, **Cancel**, les dégradés et un petit bouton Compose relai.
- Codex bleu, Claude orange, OpenCode gris ; garder les noms visibles en plus des couleurs.
- Pas de trait bleu épais sur les messages, de Forward, d’emoji ajouté ou de nouveau mode focus.
- Une session native peut contenir plusieurs Relais, chacun doté d’un titre indépendant.
- Deux accès directs : session existante ou nouvelle session avec agent et dossier local. Pas d’assistant à étapes, ni de connexion GitHub.
- Composition avec minimiser/agrandir/fermer, brouillons conservés ; conversation avec navigation et réponse disponibles sans remonter ou descendre toute la page.

## Décisions de cette livraison

1. **Compacité par la structure, pas par des textes minuscules.** Titres 13 px, texte Markdown et saisie 14 px, métadonnées 11–12 px sur ordinateur. Le bouton Compose relai reste petit. Les titres sont alignés et les tags sont sur une ligne de contexte secondaire.
2. **Deux thèmes cohérents, avec des palettes adaptées.** Foncer les textes secondaires du clair ; éclaircir ceux du sombre. Les fenêtres et menus doivent ressortir du fond. Les sélections secondaires utilisent un dégradé moins lumineux que l’action d’envoi.
3. **Même langage de sélection partout.** Fond, bordure, texte et état accessible indiquent le choix actif. Le focus clavier est distinct du survol et respecte reduced-motion.
4. **Non-lus et étoiles sont des états durables du navigateur.** Point discret à position stable, titre renforcé, Mark unread disponible et actions collectives. Le compteur Inbox indique explicitement les non-lus.
5. **Navigation contextuelle.** Retour à la vraie boîte ou à la session d’origine, restauration du scroll et du focus. Les URL de liste conservent critères et session ouverte. Les fenêtres de conversation restent autonomes.
6. **Recherche lisible et déterministe.** Surlignage des occurrences, compteur de résultat, flèches limitées aux messages correspondants pendant la recherche, bouton pour effacer. Expand all/Collapse all suit les ouvertures individuelles.
7. **Filtres et sélection rendent leur effet visible.** Résumé des filtres actifs avec Clear, état vide proposant Clear filters. Barre temporaire après sélection, état intermédiaire de Select all, sans Archive/Delete dont le sens n’est pas défini.
8. **La destination fait partie de la composition.** Résumé près de Send prompt, messages explicites pour sessions fermées ou d’activité inconnue. Indiquer Resuming draft et offrir New Relai ; ce dernier conserve le brouillon précédent.
9. **Les brouillons peuvent être emportés.** Export Markdown individuel et des brouillons sélectionnés. La sauvegarde indique la limitation à l’onglet si localStorage est indisponible. Cancel conserve son nom et son comportement de fermeture avec sauvegarde.
10. **Sessions représente les conversations natives.** Onglets d’activité des terminaux, ID, chemin, dernière activité et non-lus. Les onglets review/completed restent attachés aux Relais. Exemple supplémentaire d’une session et d’un dossier homonymes.
11. **Choix de dossier unifié.** Favorites et Recent dans le menu, recherche adaptée aux dossiers, Choose another folder en bas du menu. Le chemin manuel reste possible. Une nouvelle composition utilise par défaut un dossier favori, pour éviter de sélectionner accidentellement un dossier d’archive. Le bouton externe est conservé pour découvrir facilement ce parcours.
12. **Markdown complet dans les deux lieux de lecture.** Marked 17.0.5 embarqué sous licence MIT, sans npm chez l’utilisateur. Liens, tableaux, listes de tâches, niveaux de titres, blocs de code avec langage et Copy. HTML brut affiché en texte, filtrage des éléments/attributs et protocoles de lien. Images distantes présentées comme références, sans chargement automatique.
13. **Git décrit le dossier.** Exemples cohérents de branche partagée, worktree séparé, dossier sans dépôt. Détail à la demande, fichiers modifiés, contexte partagé et heure de snapshot illustratif. Le détail permet aussi d’explorer detached HEAD, branche modifiée, conflit et snapshot périmé. Les changements ne sont pas attribués automatiquement à un agent.
14. **Outils facultatifs.** Barre droite masquée par défaut, réactivable depuis l’en-tête ou Settings. Son bouton ambigu + devient Help. Les notes de conception y sont accessibles. More projects apparaît uniquement lorsque plus de quatre projets existent. Les noms d’agents dans la sidebar deviennent de vrais filtres ; l’icône de filtre de recherche devient un bouton.
15. **Paramètres centrés sur les choix utiles.** États actifs plus visibles, focus conservé après modification, état de stockage exact. La mention technique de police embarquée quitte les préférences ; elle reste dans la documentation.
16. **Pas de promesse de conformité non testée.** Les parcours clavier et contrastes ciblés sont vérifiés. Le lecteur d’écran, le clavier mobile physique/virtuel et les tests utilisateurs ne sont pas simulés ni annoncés comme validés.

## Différences avec les notes historiques

Le prototype gère plusieurs brouillons. Le bouton Cancel reste inchangé à la demande de l’utilisateur. Le libellé Compose relai est définitif pour cette livraison. Le nombre d’exemples est maintenant de sept sessions natives et neuf Relais reçus ; les notes précédentes restent un historique.

## Suite des notes

Pour toute prochaine modification, ajouter une entrée au journal avec : date, demande, choix, éléments modifiés, conséquences et tests. Consigner aussi les propositions rejetées pour éviter de les réintroduire.

## 2026-10-04 — Exploration des connexions aux agents et terminaux

Une nouvelle recherche et trois maquettes sont conservées séparément de l’interface courante. Le choix recommandé est de garder un service local avec un connecteur natif par agent, d’hériter les réglages/skills existants et de distinguer historique, contrôle live et terminal. La navigation principale reste inchangée.

- [Étude et sources](terminal-concepts/TERMINAL-INTEGRATION.md)
- [Décisions des maquettes](terminal-concepts/UX-DECISIONS.md)
- [Galerie HTML interactive](terminal-concepts/index.html)

Il s’agit de propositions visualisables : aucun terminal, SDK d’agent ou moteur local n’a été intégré ou exécuté.

## 2026-10-04 — Intégration du Session workspace dans index.html

Demande : réunir terminaux, agents et réglages définis dans l’interface actuelle, sans créer de branche. Les sources et index restent dans `/workspace/relai-design`, hors du dépôt Git ; aucun commit ni push.

- **Accès contextuel** depuis la conversation et depuis les Relais d’une session ; **Agent profiles** depuis Settings → Agents. Panneau latéral avec fermeture fixe, corps défilant, six onglets et focus clavier contenu. Fermer préserve conversation, réponse et connexion illustrative.
- **Overview** distingue Connected, Saved history, Needs connection et Activity unknown ; ID, chemin et propriété visibles. L’API d’exemple est maintenant marquée d’activité externe inconnue plutôt que de supposer une reprise sûre.
- **Activity / Terminal** conservent des événements distincts des messages, une approbation OpenCode simulée et des sorties de commande d’exemple. Ni console live ni miroir de TUI externe. Aucun agent, programme ou réseau de connexion n’est exécuté.
- **Settings** montre modèle, effort et mode de comportement pour le prochain prompt, avec valeurs natives par défaut. Les valeurs proposées sont des fixtures ; effort Claude native-only, OpenCode indisponible dans cet exemple. Permissions séparées, héritées, jamais augmentées par Plan/Build.
- **Portée** : overrides isolés par ID de session et persistés localement ; résumé visible dans la conversation. Les sessions d’un même agent ne partagent pas ces overrides. Les connexions, événements et skills sélectionnés sont des états de démonstration conservés seulement pendant l’onglet.
- **Skills** : catalogue/provenance illustratifs, choix du prochain prompt et effacement ; disponibilité n’est pas invocation. Seul le scénario Codex connecté propose la sélection structurée fictive ; autres actions montrent le repli natif sans exécuter de commande.
- **Profiles** : héritage utilisateur/projet et compatibilité par agent, Supported / Agent updated / Unsupported interface / Executable missing. Une rupture bloque l’action de connexion illustrative mais conserve l’historique ; Recheck reste simulé.
- **Deux thèmes** : réutilisation des palettes et couleurs d’agent, dégradés sobres, onglet sélectionné et focus distincts. IBM Plex et Lucide restent embarqués. Adaptation mobile conservée sans refonte.

Vérifications : 22 contrôles d’intégration et six de régression dans `audit/terminal-integrated/`, aucune erreur JavaScript sur ces parcours. Captures clair/sombre conservées, pas de requête réseau d’agent. Le navigateur de test bloque file:// ; tests servis en HTTP local, pas preuve d’un test d’ouverture file:// dans ce navigateur. L’HTML reste construit avec ressources embarquées.

L’architecture native reste à implémenter. Cette livraison intègre l’UI autorisée ; elle ne valide pas toutes les capacités des SDK installés. L’interface précédente complète est conservée dans `audit/before-terminal-integration/`.
