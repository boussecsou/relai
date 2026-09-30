# SDD-005 — Interface inbox et direction visuelle

Statut : brouillon. Direction demandée par l’utilisateur et proposition de parcours ; la maquette utilise uniquement des données fictives et ne contrôle aucun agent.

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
