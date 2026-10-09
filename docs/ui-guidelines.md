# Relai — règles graphiques et interactions

Référence du 8 octobre 2026. Les règles ci-dessous décrivent le gabarit retenu ; les limites de couverture sont dans [les cas d’usage](use-cases.md). La maquette reste autonome et toutes ses données sont synthétiques.

## 1. Identité et lisibilité

- Conserver la navigation d’une boîte de réception : liste pour trier, fil pour lire, inspecteur pour approfondir.
- Utiliser les logos de `assets/brand/` suivant le fond, avec marque seule sur mobile. Ne pas déformer, recolorer ou ajouter d’effets au logo. Respecter [les règles de marque](../assets/brand/README.md).
- Garder les polices IBM Plex intégrées ; réserver Plex Mono aux chemins, commandes, commits et identifiants.
- Titres de session : environ 23 px desktop, 20 px mobile. Messages : 15 px desktop, 14 px mobile. Métadonnées utiles : 12 px minimum ; étiquettes de catégories : 11 px.
- Utiliser une hiérarchie sobre : titre, état, demande et réponse. Ne pas ajouter de compteurs ou cartes sans information nouvelle.
- Conserver les messages originaux. Les résumés éventuels doivent être distingués du transcript.

## 2. Couleurs et thèmes

Les tokens de `index.html` sont la référence de rendu. Les variantes sombres doivent préserver le sens et la lisibilité.

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#f3f6fb` | `#121823` |
| Surface de lecture | `#ffffff` | `#1b2330` |
| Surface secondaire | `#f8faff` | `#202a38` |
| Texte | `#202b3c` | `#e5ecf6` |
| Texte secondaire | `#566275` | `#a4b2c7` |
| Action / sélection | `#2862d6` | `#96b9ff` |
| Succès | `#247454` | `#8bd7b1` |
| Attention | `#98630d` | `#f1c87d` |
| Erreur | `#bb4250` | `#ffa5ae` |

Codex est bleu, Claude orange, Pi violet et OpenCode gris. Les couleurs d’agent indiquent l’origine ; elles ne remplacent pas les couleurs d’état. Toute information colorée possède aussi un texte ou une icône.

## 3. Liste et navigation

- Boîtes : Inbox, Needs attention, Starred, Snoozed, Handled, All sessions.
- Une ligne représente une session native. Une nouvelle réponse actualise ce fil ; le titre n’est pas sa clé d’identité.
- Les compteurs représentent des sessions, pas des messages ni des appels d’outils.
- Recherche et filtres doivent conserver le contexte au retour du lecteur : boîte, projet, position et focus.
- Montrer les actions secondaires au survol ou au focus sur desktop ; les garder accessibles sur écran tactile.
- Un résultat vide explique le filtre actif et offre un moyen de le retirer.
- La logique des filtres statut/machine existe dans la maquette ; leur accès complet reste à concevoir.

## 4. Gabarit d’un relais reçu

1. Barre de navigation et de classement : retour, position dans la liste, précédent/suivant, traitement, report, étoile, menu et détails.
2. En-tête compact : titre, état d’exécution, agent, projet, machine, branche si disponible et mise à jour.
3. Avertissement de session uniquement si intervention ou prudence nécessaire.
4. Échanges anciens repliés au-dessus du dernier échange.
5. Dernier prompt puis réponse dans l’ordre chronologique. Les mises à jour intermédiaires et commandes/sorties se déplient à leur emplacement.
6. Liens courts vers les fichiers, vérifications, livrables et PR de cette réponse.
7. Action de poursuite dans le terminal, avec motif explicite lorsqu’elle est indisponible.

Les prompts utilisateur sont légèrement teintés ; les réponses d’agent ont un filet discret. Il n’y a pas de champ Reply ou Compose. Une session sans Git conserve le même gabarit.

## 5. Inspecteur

- Fermé à chaque entrée dans une session ; ne pas reprendre l’ancienne préférence de panneau ouvert.
- **Result** porte sur la réponse sélectionnée et son commit. Le sélecteur reste disponible pendant la lecture. Une preuve absente ne se remplit pas à partir d’une autre réponse.
- **Activity** porte sur la session : événements d’exécution, observation et réception. Ne pas déduire l’heure d’un événement technique de celle d’un message.
- **Context** porte sur l’environnement : machine, chemin, Git, source, ressources, permissions, identité et note privée.
- Un lien de fichiers/checks ouvre Result et le bon snapshot. Le bouton de la barre ouvre Context.
- À partir de 1200 px : panneau à droite de 360 px. En dessous : fenêtre modale ; jusqu’à 700 px : plein écran.
- Conserver le défilement et les détails dépliés du transcript pendant l’ouverture/fermeture. Échap ferme les détails avant de quitter le lecteur et restaure le focus.
- L’icône représente une colonne latérale droite ; réserver les curseurs aux réglages.

## 6. Alertes selon leur portée

| Portée | Emplacement | Exemple | Destination |
|---|---|---|---|
| Source / machine | Au-dessus de la liste de sessions | worker-02 est hors ligne ; une session peut être obsolète | Sessions de cette source ; accès direct possible si une seule |
| Session | Sous le titre du fil concerné | Approbation, question, conflit, interruption, état courant inconnu | Action native ou contexte de cette session |
| Réponse / preuve | Près du résultat concerné et dans Result | Check échoué, résultat partiel, ancien commit | Vérification et snapshot exacts |

- Une alerte de source explique la connexion et la fraîcheur des informations ; elle n’est pas une erreur du message de l’agent.
- Après déconnexion, le transcript reste consultable et l’état courant est inconnu. Ne pas présenter la dernière observation comme une exécution active.
- Ne pas répéter un avertissement technique sous chaque message. Garder les avertissements essentiels visibles lorsque l’inspecteur est fermé.
- Afficher une phrase courte : problème, périmètre touché et prochaine action. Utiliser l’ambre pour l’attention et le rouge pour un échec/conflit.
- Annoncer les changements utiles de façon accessible sans réannoncer tous les bandeaux à chaque rendu. La stratégie d’annonce du produit réel reste à implémenter.
- La maquette affiche déjà le bandeau source et les avertissements de session/preuve. Le bouton source « Show » filtre les sessions hors ligne ; le lien direct et le regroupement multi-source restent à préciser.

## 7. États et actions

| État | Message à faire comprendre | Suite |
|---|---|---|
| Ready | Résultat disponible ; pas automatiquement correct | Relire les preuves, puis traiter |
| Permission / question | Intervention attendue ; action non exécutée | Approuver/refuser ou répondre dans l’outil natif |
| Running / retry / compacting / queued | Progression ; pas encore de résultat final | Consulter les mises à jour ; une file ne prouve pas un traitement |
| Error / conflict / interrupted | Résultat partiel ou exécution arrêtée | Examiner puis corriger/reprendre dans l’outil natif |
| Unknown / offline | Statut courant impossible à confirmer | Consulter l’historique et reconnecter la source |
| History / merged | Historique terminé conservé | Consulter ou reprendre si la source le permet |

Execution, disposition de revue, lu/non lu, étoile et vérification sont indépendants. « Mark handled » n’approuve ni une commande ni une PR. Les checks d’un ancien commit ne valident pas le workspace actuel.

## 8. Mouvement et accessibilité

- Ouverture du lecteur : fondu/glissement court, actuellement 200 ms à la souris.
- Détails desktop : ouverture en 300 ms, easing `cubic-bezier(.22,1,.36,1)`, avec fondu ; fermeture courte dans la même direction.
- Détails tablette/mobile : apparition en 280 ms, montée de 16/28 px et fond assombri en 240 ms. Pas de rebond ni de nouvelle animation lors d’un changement de section.
- Les détails s’ouvrent immédiatement au clavier et avec `prefers-reduced-motion`. Les animations héritées du lecteur peuvent conserver un fondu réduit.
- Utiliser des libellés accessibles, un focus visible pour les contrôles et de vrais boutons. Les détails fermés sont `inert`.
- Une fenêtre modale garde le focus, se ferme par Échap et rend le focus à son déclencheur ; une fenêtre imbriquée se ferme d’abord.
- Les onglets de l’inspecteur répondent aux flèches, Début et Fin. Les raccourcis sont désactivés pendant la saisie.
- Examiner clair/sombre, écran tactile, desktop, largeur étroite, données absentes et stockage indisponible. Éviter le défilement horizontal de la page.

## 9. Limites et preuves

19 sessions illustratives ; deux snapshots de navigation distincts. Diffs, commandes, PR, modèles et ressources sont fictifs. Relai ne lance pas les agents ou migrations et ne contacte pas GitHub dans la maquette. Le report local ne déclenche pas de rappel.

Les contrôles locaux de rendu et d’interaction ne constituent pas des essais utilisateur ni une preuve d’intégration native. Captures dans `screens/`, ignoré par Git ; joindre une sélection à la future PR ou à Notion. Voir [le journal](../design/relai-inbox/CHANGELOG-UI.md).
