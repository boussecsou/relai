# SDD-001 — Composer un Relai

Date de consolidation : 4 octobre 2026. Statut : **Direction confirmée ; backend à construire**.

## But

Envoyer un prompt Markdown avec un titre propre à Relai, vers une session existante ou une nouvelle session native. Aucun compte GitHub ni dépôt Git obligatoire.

## Parcours

**Existing session** : cartes contextualisées avec agent et couleur, nom natif, ID discriminant, dossier, connexion et dernière activité. Plusieurs sessions homonymes restent distinguables. Un historique détecté ne devient pas une session contrôlée par un clic implicite.

**New session** : sélecteur agent visuel puis Local folder. Favoris, récents, recherche et Choose another folder ; chemin absolu Linux ou Windows possible. Aucun assistant à étapes. Le service local devra vérifier existence et accès ; la maquette utilise des exemples.

Dans les deux parcours : **Title** puis **Prompt**, toolbar Markdown, Write/Preview, destination près de Send prompt. Les états Existing/New doivent se distinguer par fond, bordure et texte en clair comme en sombre.

## Fenêtre et brouillons

Header et footer accessibles ; corps défilant. Minimiser, restaurer, agrandir, fermer. Cancel et fermeture conservent le brouillon. New Relai conserve le précédent et ouvre une nouvelle composition. Reprendre un brouillon l’indique explicitement. Plusieurs brouillons et réponses non envoyées peuvent coexister. Export Markdown possible.

## Livraison cible, proposition technique

Titre et contenu sont conservés avant l’envoi. Si une session travaille, mettre en file par session. Afficher séparément queued, accepted, running et completed. L’accusé Relai ne garantit pas une réponse finale de l’agent. Les réglages de session restent secondaires, voir SDD-006.

## Critères de réception

Choisir les deux destinations au clavier ; identifier l’agent sans couleur seule ; fermer/restaurer sans perdre le texte ; recharger et retrouver plusieurs brouillons ; distinguer titres Relai et nom natif ; lire un aperçu Markdown sûr ; savoir où part l’envoi avant confirmation.

La maquette valide des interactions, pas la livraison réelle. [Source historique](../sources/repository-docs/sdd/0001-compose-message.md) : l’obligation de titre uniquement pour New session est remplacée par le titre indépendant de chaque nouvelle composition Relai.
