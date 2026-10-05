# Audit UI/UX de Relai — 4 octobre 2026

## Périmètre et méthode

Audit du prototype autonome `index.html`, sans modification de l’interface. Inspection dans Chromium, lecture des styles et des interactions, captures des écrans en thèmes clair et sombre. Parcours : Inbox, Starred, Pending, Sent, Drafts, Sessions, composition existante/nouvelle, sélecteurs d’agents et de dossiers, conversation, réponse et les quatre pages de Settings.

Largeurs examinées : 1440, 768, 390 et 320 px. Les mesures et captures de cette revue se trouvent dans ce dossier. Aucun débordement horizontal du document ni aucune erreur JavaScript n’a été observé dans les parcours capturés. Cela ne garantit pas l’absence de débordements dans tous les composants ou contenus.

Les conclusions distinguent problèmes reproduits, observations visuelles et recommandations. Les contrastes ci-dessous sont calculés sur les couleurs CSS indiquées ; ils ne constituent pas une certification WCAG. Clavier logiciel réel, lecteurs d’écran, daltonisme et tests auprès d’utilisateurs restent à examiner. Les comportements agents, dossiers, envoi et Git sont des simulations : leur absence de connexion n’est pas un défaut de ce prototype.

## Appréciation générale

La direction fonctionne : structure familière de Gmail, séparation sessions/Relais, identité des agents, fenêtres de composition, réponse fixe et dégradés discrets. Il faut conserver cette base. Le principal problème est l’échelle de lecture : beaucoup de contenus utiles sont à 9–12 px, ce qui rend l’interface compacte mais demande un effort.

Le thème sombre est plus lisible pour les textes secondaires que le clair. En revanche, il distingue moins bien certaines surfaces et certains choix actifs. Le clair sépare mieux les blocs, mais ses gris secondaires sont trop pâles. La correction récente du sélecteur Existing session/New session est convaincante ; ce principe doit devenir cohérent dans les autres contrôles.

Priorités : **P1** gêne réelle ou forte difficulté de lecture ; **P2** amélioration notable du parcours ; **P3** finition ou fonctionnalité à envisager. Aucun blocage total n’a été constaté dans les parcours examinés.

## 1. Lisibilité et contraste — P1

**Constats.** Titres de lignes à 12 px, extraits à 11 px, tags/heures/états terminal à 9 px. Corps Markdown et saisie à 12 px. Filtres à 9 px sur mobile. L’identité de l’agent est lisible, mais les informations complémentaires deviennent minuscules.

| Couleurs examinées | Ratio calculé | Lecture |
| --- | ---: | --- |
| Clair : texte secondaire `#858574` sur blanc | 3,75:1 | Insuffisant pour du texte normal selon le seuil AA de 4,5:1 |
| Clair : aide `#a0a08c` sur blanc | 2,66:1 | Insuffisant |
| Clair : Claude `#b66b36` sur blanc | 4,08:1 | Insuffisant pour un petit libellé |
| Sombre : texte secondaire `#afb5a4` sur `#202321` | 7,53:1 | Bonne marge sur ce fond |
| Sombre : texte discret `#858d7a` sur `#202321` | 4,60:1 | Marge faible ; change avec le fond |
| Sombre : texte discret sur fond code `#292e27` | 4,02:1 | Insuffisant, par exemple pour une citation sur une surface voisine |

**Recommandation.** Garder le bouton Compose relai compact. Passer plutôt les titres de liste à 13 px, le texte de conversation et la saisie à 14 px, les métadonnées à 11–12 px. Réduire légèrement les espacements inutiles pour compenser. En clair, foncer les textes secondaires et l’orange de Claude. En sombre, garder du contraste même sur les surfaces surélevées. Réserver les gris très discrets aux éléments décoratifs.

**Critère de réussite.** Toute information nécessaire reste lisible à 100 % ; texte normal ≥ 4,5:1 sur son fond réel, y compris les deux extrémités des dégradés.

## 2. États des boutons et surfaces — P1/P2

**Sombre.** Existing session/New session est désormais clair. Les choix Theme et Density dans Settings restent proches du fond. Write/Preview et certains filtres présentent aussi une différence faible. Le thème a une dominante olive ; c’est une préférence esthétique, pas un défaut objectif.

**Clair.** La sélection est plus facile à comprendre, mais certaines bordures, icônes et aides disparaissent dans les surfaces très pâles.

**Recommandation.** Définir les mêmes règles partout : fond dégradé, bordure et texte distincts pour une sélection ; survol légèrement plus lumineux ; focus clavier séparé du survol. Conserver les dégradés appréciés, en réservant la luminosité la plus forte aux actions principales. Pour les petits choix de Settings, un fond plus visible et une coche suffisent : inutile de les rendre aussi lumineux que Send prompt.

Distinguer trois niveaux de surface en sombre : fond du workspace, panneau, menu/fenêtre. Un menu doit rester identifiable par sa bordure et son élévation, même si son fond est proche du panneau.

## 3. Inbox, tags et non-lus — P2

**À conserver.** Point non lu, titre légèrement renforcé, repo, agent et statut visibles avant l’ouverture. L’interface permet déjà de comprendre l’essentiel sans entrer dans le Relai.

**À améliorer.** Les tags placés avant le titre déplacent son début selon chaque ligne. Plusieurs points coexistent : agent, non lu, terminal. La reconnaissance dépend donc aussi de leur position. Le compteur Inbox affiche les non-lus, tandis que d’autres compteurs représentent le total ; cette différence mérite une explication.

**Recommandation.** Aligner le titre dans une zone stable et garder les tags à proximité, sans supprimer le contexte demandé. Réserver une petite position fixe au point non lu. Conserver le nom écrit de l’agent et du terminal : la couleur seule ne suffit pas. Ajouter une infobulle « Unread Relais » au compteur Inbox.

**Limite reproduite du prototype.** Ouvrir un Relai enlève son point, mais recharger la page rétablit les données d’exemple non lues. Même limite de persistance pour les étoiles. Avant un usage réel, conserver ces deux états et offrir « Mark as unread » ; cette action manque actuellement.

## 4. Filtres et sélection — P2

Les menus d’agents sont plus utiles qu’un select natif et gardent l’identité visuelle. En revanche, un projet choisi peut rester associé à un filtre agent/terminal/recherche, sans résumé global des critères. « Clear all filters » est caché dans le menu à trois points.

**Recommandation.** Afficher un court résumé uniquement lorsqu’un filtre est actif, par exemple « Codex · Running · relai », accompagné de « Clear ». Garder les boutons actuels lorsque rien n’est filtré. En état vide, proposer directement de retirer les filtres.

Sur mobile, Any terminal est tronqué à 320 px. Regrouper les filtres secondaires dans « Filters · 2 », conserver Unread accessible, et rendre le tri indépendant. Cela libère de l’espace sans ajouter une barre permanente.

Les cases de sélection n’exposent pas d’action collective utile : Select all coche les lignes, mais More ne propose que les filtres et Settings. Prévoir une barre temporaire « 3 selected » avec Mark read/unread et Star, puis une sortie claire. Ne pas ajouter Archive/Delete tant que leur sens produit n’est pas défini. Synchroniser aussi la case globale et son état intermédiaire avec les lignes.

## 5. Navigation et retour — P1

**Problème reproduit.** Ouvrir un Relai depuis Starred puis cliquer « Back to inbox » ramène à Starred. Le comportement préserve le contexte, mais le libellé annonce une autre destination. Même risque depuis une session ou les autres boîtes.

**Recommandation.** Utiliser « Back to Starred », « Back to Drafts » ou « Back to session », ou un simple « Back » avec la destination accessible. Garder ce retour en haut et en bas comme demandé. Restaurer le scroll et le focus sur la ligne d’origine. La navigation par historique est une bonne base.

Le lien Session dans une conversation doit aussi conserver le contexte de retour. Après rechargement, les routes des boîtes/filtres ne sont pas restaurées comme celles des conversations ; traiter cela avant une intégration produit.

## 6. Conversation et recherche — P1/P2

Les trois blocs fixes fonctionnent bien : contexte en haut, messages au centre, Reply en bas. La distinction You/agent par avatar, nom et fond discret fonctionne sans le trait bleu rejeté. Conserver ce traitement.

**Recherche reproduite.** « tags » trouve deux messages. Les mots ne sont pas surlignés. Après recherche, les flèches restent celles de la navigation générale : Previous peut sélectionner un message sans correspondance.

**Recommandation.** Pendant une recherche, naviguer entre les résultats, afficher « 1 of 2 », surligner les occurrences et proposer une croix pour effacer. Hors recherche, naviguer entre les messages. Distinguer visuellement le message courant sans réintroduire de bande latérale.

L’intitulé Expand all/Collapse all peut devenir incohérent après des ouvertures individuelles : le recalculer à chaque changement. Permettre une infobulle au résumé tronqué, ou une ouverture simple de tout l’en-tête. Les longs blocs de code doivent garder un défilement horizontal interne et un bouton Copy propre au bloc.

En lecture longue, limiter la largeur du texte à environ 75–90 caractères selon le contenu ; les blocs de code peuvent utiliser davantage de largeur. Ne pas ajouter de mode focus puisque la fenêtre dédiée couvre déjà ce besoin.

## 7. Composition et brouillons — P2

**À conserver.** Compose relai, slogan actuel, Title, deux accès distincts, sauvegarde locale, minimiser/agrandir/fermer, en-tête et pied fixes. Pas d’assistant en plusieurs étapes nécessaire.

Le titre et le prompt survivent au changement de destination : bon comportement. Le contexte de session et de dossier est utile, mais pourrait être résumé au moment d’envoyer pour éviter un envoi dans la mauvaise session.

**Recommandation.** Dans le pied, afficher discrètement « To Codex · Relai interface » ou « New Claude Code session · website ». Garder Send prompt comme action principale. Pour une session fermée, expliquer avant envoi « This will resume the session » ; pour Unknown, éviter d’annoncer que le terminal est disponible.

Rendre l’état de sauvegarde fiable : Saved, Saving, Saved for this tab only. L’indicateur Settings « Always on » ne devrait pas promettre une sauvegarde durable si le stockage navigateur échoue. Une copie/export de brouillon serait utile à terme. Conserver Cancel comme demandé, en expliquant au survol qu’il ferme et conserve le brouillon.

Actuellement, Compose relai peut reprendre un brouillon actif. Rendre ce choix perceptible : « Resume draft » dans la fenêtre et une action distincte « New Relai » évitent de penser que le bouton ouvre toujours un formulaire vide.

## 8. Sessions, agents et dossiers — P2

**Modèle conseillé.** Sessions doit continuer à représenter les sessions natives des agents. Un Relai est un prompt avec son titre, rattaché à une session. Plusieurs Relais peuvent partager la même session. Ne pas transformer Sessions en seconde liste de titres.

Dans Sessions, les onglets Needs review/Completed portent aujourd’hui sur les Relais contenus. Cela peut faire croire que la session est elle-même terminée. Clarifier « Sessions with Relais needing review », ou donner à Sessions ses propres filtres d’activité. Afficher la dernière activité et une quantité de Relais non lus pour faciliter le choix entre sessions semblables.

Les chemins aident à identifier la destination. Prévoir des exemples avec deux dossiers de même nom et deux sessions du même agent dans le même dossier. Garder un identifiant court en second niveau pour les distinguer.

Les menus utilisent bien les couleurs des agents et une coche de sélection. Le champ de recherche des dossiers affiche toutefois « Search by name, agent or folder » : utiliser « Search folders or paths ». Séparer visuellement Favorites et Recent au lieu du seul suffixe « favorite ». Placer Choose another folder dans le même menu, avec une action stable en bas, peut réunir les deux façons de choisir sans cacher la saisie d’un chemin.

## 9. Git dans chaque session — P2/P3

L’affichage branche + fichiers modifiés est pertinent, mais les exemples montrent des branches différentes pour des sessions qui partagent le même dossier. Dans un dossier Git partagé, la branche et les modifications appartiennent au working tree ; elles ne sont pas isolées par agent.

**Recommandation.** Afficher le contexte réel du dossier : dépôt, branche, nombre de fichiers modifiés, dernière actualisation. Si plusieurs sessions utilisent ce working tree, montrer discrètement « Shared folder · 2 sessions ». Si elles utilisent des worktrees distincts, afficher le nom du worktree. Ne pas attribuer automatiquement toutes les modifications à la conversation ouverte.

Dans la conversation, garder un résumé court et ouvrir le détail à la demande. Un état sans dépôt Git doit être prévu. Les états detached HEAD, branche changée depuis le début, conflit et information périmée peuvent être dessinés plus tard, sans connecter Git à ce stade.

## 10. Markdown — P1 pour l’objectif produit

**Vérifié.** Les formats simples, le gras, les listes et le code sont pris en charge. Les liens, tableaux et listes de tâches ne produisent pas leurs éléments Markdown attendus dans la prévisualisation actuelle.

**Recommandation.** Employer le même rendu Markdown pour Preview et les messages reçus. Ajouter liens, tableaux, listes de tâches, différents niveaux de titres et blocs de code avec leur langage. Garder la protection contre le HTML injecté. Fournir quelques exemples concrets longs pour contrôler l’affichage.

Cela peut être livré dans un HTML autonome avec une bibliothèque embarquée : pas de dépendance à installer chez l’utilisateur pour ouvrir la maquette. L’intégration réelle dans Relai sera une étape distincte.

## 11. Settings, icônes et barre latérale — P2/P3

Dans Settings, améliorer les états actifs en sombre et conserver le focus après un changement. Éviter de mettre au même niveau de préférence des choix utiles et des détails techniques comme « Bundled » : la police peut être mentionnée dans About plutôt qu’occuper une ligne.

Les icônes Lucide sont cohérentes. À petite taille, leur trait fin manque parfois de présence. Uniformiser taille et épaisseur, agrandir la zone cliquable et ajouter une infobulle aux boutons sans texte. L’icône de réglages à droite de Search ressemble à une action, mais est un SVG décoratif sans interaction : la rendre fonctionnelle ou la retirer.

La colonne droite Notes/Calendar/Tasks a peu de valeur dans le parcours principal et son « + » est ambigu. Proposition optionnelle : la rendre repliable ou la masquer tant qu’un usage concret n’est pas défini. Aucun besoin de revoir la largeur actuelle de la sidebar, déjà appréciée.

Les agents dans la sidebar sont présentés comme des éléments informatifs, mais ressemblent à des filtres. Rendre leur clic utile, ou atténuer cette apparence interactive. Prévoir « More projects » si la liste grandit.

## 12. Clavier, accessibilité et mobile — P1/P2

**Problème reproduit.** Cliquer Compact dans Settings reconstruit les contrôles et le focus retombe sur BODY. Au clavier, on perd son emplacement. Restaurer le focus sur le choix actif sans fermer la fenêtre.

Les boutons ont des noms accessibles et la composition utilise un dialog natif ; les annonces de toast utilisent déjà role=status. En revanche, les choix Theme/Density et les onglets de liste doivent exposer leur état sélectionné, pas uniquement une classe CSS. Les lignes avec role=button contiennent aussi des boutons et cases : revoir la sémantique pour un parcours lecteur d’écran prévisible.

Les contours de focus des champs utilisent des couleurs d’agent très pâles. Sur la surface de référence, environ 1,26:1 en clair et 1,84:1 en sombre. Certains champs Search suppriment aussi leur outline. Prévoir un anneau visible autour du champ ou du groupe, indépendant du fond. Vérifier Tab, Shift+Tab, Escape et les menus imbriqués.

Sur mobile, les filtres restent minuscules et plusieurs icônes sont dans des cibles de 24–27 px. Viser des zones de 40–44 px pour les actions tactiles fréquentes, sans agrandir le dessin de l’icône. WCAG 2.2 AA autorise certaines cibles de 24 px avec conditions et exceptions ; les mesures seules ne permettent pas de conclure à une violation générale.

À 390 × 844, réponse ouverte, le bloc du haut prend environ 188 px, celui du bas 313 px et la conversation environ 286 px. Le clavier logiciel n’est pas inclus dans ces chiffres. Compacter le contexte Git sur mobile, conserver Reply/Close disponibles, et tester avec un vrai clavier Android/iOS. Éviter plusieurs défilements imbriqués lorsque le clavier occupe une grande partie de l’écran.

## Ordre de correction proposé

1. **Lisibilité** : contrastes en clair, tailles du texte utile, focus visible dans les deux thèmes.
2. **Parcours fiables** : retour contextuel, résultats de recherche, focus après Settings, états sélectionnés accessibles.
3. **Cohérence visuelle** : sélections de Settings/Preview/filtres, hiérarchie des surfaces sombres, titres et points non lus alignés.
4. **Composition et sessions** : résumé de destination, reprise de brouillon explicite, activité réelle, favoris/récents.
5. **Usage quotidien** : actions collectives, états lus/étoiles persistants, Markdown complet, mobile avec clavier.
6. **Finitions optionnelles** : rail droit repliable, infobulles, contexte Git détaillé à la demande.

## Vérifications à effectuer après correction

- Vérifier contrastes sur les fonds réels, y compris survol, sélection et dégradés.
- Ouvrir depuis chaque boîte/session puis revenir à la même liste, au même scroll et à la même ligne.
- Parcourir entièrement composition, menus et Settings au clavier sans perdre le focus.
- Rechercher un mot présent dans plusieurs messages ; les flèches traversent uniquement les résultats tant que la recherche est active.
- Recharger après lecture, étoile et saisie de brouillon ; contrôler les états conservés et les erreurs de stockage.
- Tester contenus longs : titre de 120 caractères, chemins Windows/UNC, sessions homonymes, grand tableau et longues lignes de code.
- Contrôler 320/390/768 px, zoom 200 %, clavier mobile réel, puis un lecteur d’écran.
- Faire tester les deux parcours « nouveau Relai dans une session existante » et « nouveau Relai dans une nouvelle session » à quelques utilisateurs.

## Repères de référence

- [WCAG : contraste du texte](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG : contraste des composants](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [WCAG : taille des cibles](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WAI-ARIA : fenêtres modales](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WAI-ARIA : onglets](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

Ces références donnent les critères de revue ; aucune recherche externe ni étude utilisateur n’est revendiquée pour cet audit.
