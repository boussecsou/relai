# SDD-005 — Interface inbox et direction visuelle

## Révision du 2 octobre 2026 — composition centrée et terminal

La dernière demande de l’utilisateur remplace la composition latérale : fenêtre modale centrée, fond assombri et flouté, expansion, adaptation mobile, focus clavier contenu et brouillon sauvegardé avant fermeture. La police livrée est IBM Plex Sans Regular avec IBM Plex Mono pour le code et le terminal, fichiers embarqués avec leur licence OFL.

Les filtres d’agent restent disponibles dans toutes les boîtes, même sans résultat et sans session pour l’agent choisi. Les agents détectés complètent une liste stable Codex, Claude Code, OpenCode et Pi. Les filtres actifs sont visibles et réinitialisables. Inbox comporte All, Needs attention et Replies ; leurs nombres tiennent compte de l’agent et de la recherche. Les onglets disposent de navigation clavier. Les conversations locales sont séparées des boîtes d’envoi dans la navigation.

La conversation propose Markdown et Open terminal. Le véritable CLI utilise un PTY et un mode focus ; masquer le panneau conserve son processus. Une seule connexion peut écrire à la fois. Le mode terminal suspend la livraison automatique de ce chat jusqu’au retour explicite. Voir [SDD-006](0006-native-terminal.md). Les sections suivantes décrivent les révisions historiques et ne remplacent pas cette demande.

Statut : interface Glass native et parcours de livraison Codex implémentés au 30 septembre 2026. Les maquettes historiques restent séparées ; la révision suivante fixe l’interface actuelle.

## Révision livrée — workspace Glass et moteur graphique

Application élargie jusqu’à 1760 px sans augmenter la hauteur. Le panneau Compose conserve la liste à partir de 1280 px, propose une expansion et prend l’espace principal aux tailles inférieures. Navigation compacte intermédiaire puis adaptation mobile. Destination, Message, Details et actions utilisent les tokens existants, bordures lisibles et faible chrome. L’UI est en anglais ; noms natifs et texte rédigé restent inchangés.

Les boîtes et leurs vrais états sont affichés sans exemples : démarrage vierge, chargement, absence de résultat, erreur de filtre, sauvegarde, conflit, acceptation, travail, approbation/question, échec, échéance manquée et livraison incertaine. Activity et Changes montrent commandes/plans/diffs, avec arrêt explicite et cartes de décision. Aucun terminal interactif dans cette étape. Dossiers et onglets disposent d’interactions clavier ; les dialogues restaurent le focus.

Vérification rendue sur 390, 768, 1024, 1365 et 1920 px, thèmes clair/sombre, mouvement réduit, clavier, titres/URLs longs et reflow équivalent à un zoom navigateur 200 %, plus parcours navigateur de bout en bout. Contrastes de contrôles mesurés avec le script PracticalSwan. Commandes de zoom du navigateur, lecteur d’écran réel et Core Web Vitals terrain non vérifiés ; ne pas assimiler les captures à une conformité intégrale. [Détails et limites](../research/codex-delivery.md).

## Référence consultée

Board [Relai Inbox — UI/UX References](https://www.tldraw.com/f/lICfQ-b8nWMNsCc4zcYaB?d=v-2529.-809.9977.6001.page), consulté le 30 septembre 2026 via le plugin tldraw, capture et lecture des éléments. Le board contient cinq images d’interfaces d’inbox/dashboard et trois images de gradients/textures. Aucun élément du board n’a été modifié.

Les références montrent listes compactes, navigation latérale, vues divisées, surfaces claires et sombres, tags et recherche. Les fonds colorés servent de références de matière ; l’utilisateur demande explicitement de rester principalement en gris foncé et blanc.

## Direction retenue

- Sobriété inspirée de Notion et organisation de boîte mail inspirée de Gmail.
- Surfaces graphite, texte blanc doux, séparateurs fins ; variante claire sur blanc et gris.
- Accents teal et lilas désaturés, réservés aux états et à des gradients diffus peu opaques.
- Texture très légère en périphérie ; aucun gradient derrière le corps des messages ou les commandes.
- Densité adaptée à beaucoup de chats : lignes compactes, hiérarchie typographique et métadonnées secondaires.
- Petits rayons, icônes simples, absence de blocs décoratifs qui réduisent l’espace de travail.

## Tokens proposés

| Rôle | Sombre | Clair |
| --- | --- | --- |
| Fond | `#161719` | `#F6F6F5` |
| Surface | `#1D1F22` | `#FFFFFF` |
| Surface surélevée | `#25282D` | `#F0F1F2` |
| Texte | `#ECEDEF` | `#25272B` |
| Texte secondaire | `#A5AAB2` | `#626873` |
| Accent discret | `#A1C9C0` | `#386C63` |

Typographie système sans serif pour titres et corps, monospace système pour dossiers, branches et terminal. Titres 18–24 px, corps 14 px, métadonnées 12 px ; corps de conversation limité en largeur. Les couleurs et contrastes de tous les états seront vérifiés lors de l’implémentation.

## Organisation proposée

Sur grand écran : navigation latérale, liste des chats et conversation sélectionnée. La recherche globale reste visible en haut. La navigation comprend Inbox, Envoyés, En attente, Programmés et libellés ; les regroupements automatiques Agent/Dossier/Branche sont des filtres de contexte et ne créent pas de copie du chat.

Chaque ligne présente titre, harness, dossier abrégé, branche disponible, aperçu du dernier message, heure et état textuel. L’état actif/inconnu et la contrôlabilité sont distincts. La conversation détaille le contexte, les messages, les changements de fichiers et le terminal consultable à la demande.

Sur écran moyen, réduire la navigation et garder liste/conversation. Sur mobile, passer entre liste et conversation avec retour explicite ; l’éditeur et les actions restent accessibles sans défilement horizontal de page.

## Parcours représentés dans la maquette

- Sélectionner et chercher les chats ; filtres simples de harness, branche et libellé.
- Filtrer par regroupements automatiques Agent/Dossier/Branche et libellés personnalisés.
- « New session » : destination de lancement, titre, prompt Markdown et libellé.
- « Reply » : prompt uniquement ; mise en file simulée si la session travaille déjà.
- Consulter les changements et ouvrir le terminal ; les commandes restent fictives.
- Programmer un Relai ponctuel avec date/heure locale ; affichage et annulation simulés.
- Afficher erreurs, questions et états de connexion avec actions compréhensibles.
- Passer entre thèmes sombre et clair ; conserver les états en mémoire uniquement.

La maquette ne reproduit pas l’indexation, la durée d’un run, la reprise native ou les états d’un vrai harness. Aucun travail, commit ou message externe n’est exécuté.

## Accessibilité et mouvement

Navigation clavier, focus visible, champs nommés, boutons avec libellé accessible, dialogues refermables et focus restitué. États identifiables par texte, pas seulement couleur. Respect de `prefers-reduced-motion` ; les gradients animés sont lents, discrets et absents des zones de lecture. Dans le produit, exposer un réglage pour désactiver la texture et le mouvement.

## Maquette et validation

Maquette autonome : `design/relai-inbox.html`, ouvrable directement dans un navigateur, sans dépendance ni backend. Les états de démonstration sont signalés et les changements disparaissent au rechargement.

À valider avec l’utilisateur : hiérarchie et densité, confort de lecture des prompts/réponses, espace du terminal, contraste, navigation à plusieurs onglets et quantité d’accent coloré. La direction ne démontre pas la cible de 10 000 chats / 25 sessions ; pagination et virtualisation feront partie de l’UI de production.

## Révision Glass — nouvelles références Gmail

La nouvelle maquette `design/relai-glass.html` suit le parcours inbox pleine largeur → clic sur un Relai → conversation, avec retour et navigation précédente/suivante. Fond teal/bleu/pêche animé lentement, surface en verre dépoli, typographie Manrope embarquée et boutons arrondis. Ajouts : favoris, archives avec annulation, sélection multiple, densité compacte, raccourcis et suspension du mouvement. Deux nouvelles références du board ont été consultées ; le board reste intact.

Vérification navigateur réalisée : navigation, favoris, archivage/annulation, actions groupées, recherche, New session, Reply, densité/mouvement et vues mobile sans débordement horizontal. Les interactions restent simulées.

## Direction confirmée — inbox Glass et terminal du même chat

L’utilisateur souhaite conserver l’expérience du véritable CLI de chaque harness, notamment commandes `/`, skills, menus et validations. Après essai du premier prototype, le parcours retenu est inbox → lecture de la conversation → terminal du même chat à la demande. Un mail reçu ne crée jamais de session. Seul « New session » lance un nouveau processus.

La lecture utilise un rendu Markdown dans le style Glass : Manrope, graphite/blanc, accents teal/lilas/pêche, liste pleine largeur, tâches à revoir, libellés et tickets. Chaque ligne affiche agent, dossier, titre, branche disponible, aperçu, heure et état textuel. La préparation d’une réponse reste dans cette conversation ; le prototype copie le prompt pour collage manuel dans le CLI associé. L’envoi graphique direct et la file automatique nécessitent encore une intégration au harness. Le terminal conserve un mode focus, un contraste renforcé et une palette ANSI colorée.

Le [prototype inbox](../../design/inbox-prototype/README.md) remonte les réponses finales des sessions Codex lancées ici grâce à `notify`, même si le panneau terminal est masqué. Lire un mail, recevoir une réponse, reconnecter le navigateur et changer de vue ne créent aucun processus supplémentaire. Les exemples sont explicitement distingués des conversations locales. Tickets et tâches sont des métadonnées locales, sans connexion à un gestionnaire externe. Stockage en mémoire et plafond de 200 lignes : la persistance et la cible de charge restent à implémenter dans le moteur natif.

Le [premier prototype interactif](../../design/terminal-prototype/README.md), conservé séparément, compare trois dispositions. Son ancien comportement de création au clic est remplacé dans le nouveau prototype. Aucun des deux ne sait prendre le contrôle d’un CLI externe déjà ouvert.

## Révision graphique — catalogue passif et démarrage vierge

Cette révision remplace la priorité terminal décrite ci-dessus. Application dans apps/web, service Rust dans crates/relai ; voir [ADR-003](../adr/0003-passive-catalogue-and-blank-inbox.md).

Au premier démarrage, Inbox, libellés et brouillons sont vides. Les historiques détectés apparaissent dans Sessions et le destinataire, sans création de mail ou runtime. Lecture seule et activité inconnue sont distinguées. Pas de démonstrations dans l’application.

Glass est conservé : Manrope, teal/lilas/pêche, gradient périphérique statique, navigation 220 px, lignes 64 px ou 48 px, corps 14 px et métadonnées 12 px. Mobile sans débordement. Le retour du lecteur conserve filtres, page et position.

Libellés persistants multiples avec édition/suppression ; favoris, archives et tickets locaux. Recherche sur métadonnées puis texte indexé progressivement. Sources et erreurs consultables ; dossiers natifs configurables dans l’interface.

Rédaction graphique : destinataire agent/dossier/chat, titre seulement pour une nouvelle destination, Visuel/Markdown/Aperçu, autosauvegarde persistante et copie en cas de conflit. Les formats non convertibles restent en Markdown. Copier/exporter disponibles ; envoi, programmation et terminal non simulés.
