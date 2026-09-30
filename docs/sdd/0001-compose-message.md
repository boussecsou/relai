# SDD-001 — Composer un message

Statut : brouillon. Ce document enregistre le parcours demandé et les décisions encore ouvertes ; il ne décrit pas une fonctionnalité déjà implémentée.

## Objectif

Composer une demande dans une interface inspirée de Gmail, en visant une session de coding existante ou en lançant une nouvelle session dans un dossier de travail.

## Parcours demandé

### Session existante

Le champ destinataire propose les sessions détectées par Relai. Chaque entrée sélectionnable montre le nom de l’agent, le dossier courant et le titre du chat, par exemple « Codex CLI — /home/user/projects/p1 — Régler issue 3 », avec un résumé Git/GitHub lorsque disponible. Un Relai est envoyé à un seul destinataire. La distinction entre nom d’agent et nom du harness reste à préciser. Une session détectée mais non pilotable apparaît comme « À connecter » ; l’envoi devient disponible après connexion.

L’utilisateur choisit la session, écrit un sujet et un prompt en Markdown, puis envoie son message.

### Nouvelle session

En l’absence de session lancée, l’utilisateur choisit un dossier de travail et un harness parmi les outils disponibles détectés automatiquement. Exemple : dossier « /home/user/projects/p1 », harness « Codex CLI ».

L’envoi demande à Relai de lancer automatiquement le harness avec le prompt et le contexte d’exécution nécessaire. La session travaille en arrière-plan et son terminal est consultable dans l’interface.

### Réponse et file d’attente

L’utilisateur répond dans la conversation comme dans une boîte mail. Si la session travaille déjà, le nouveau Relai rejoint une file d’attente. L’ordre, l’annulation et les reprises après erreur restent à préciser.

Le suivi des chats et leur historique restent accessibles après fermeture du terminal. Fermer l’affichage, terminer le processus et arrêter le service sont des événements distincts ; les règles d’arrêt et de reprise restent à définir.

## Formulaire initial

- Destinataire : session existante ou dossier de travail et harness pour une nouvelle session.
- Sujet : intitulé rédigé par l’utilisateur.
- Prompt : corps du message en Markdown.

Les paramètres de modèle, les rôles et les autres réglages ne font pas partie du formulaire initial demandé.

## Dossier et Git

Le point d’entrée est un dossier de travail du poste. Un dépôt Git est un dossier contenant un historique Git ; les fonctions Git dépendent de sa présence et ne doivent pas être confondues avec la destination du message.

## Limites techniques vérifiées

La découverte d’un harness installé, la découverte de ses conversations enregistrées et le pilotage d’une session déjà active sont des capacités différentes.

[Codex app-server](https://learn.chatgpt.com/docs/app-server) permet de lister et contrôler les threads du serveur connecté. Les listes de conversations enregistrées ne garantissent pas le contrôle de tous les terminaux Codex déjà lancés indépendamment. Chaque adaptateur devra définir ses capacités de découverte et de connexion.

Relai doit conserver cette distinction dans son modèle pour ne pas présenter un historique enregistré comme une session en cours, ni un processus détecté comme une destination pilotable sans connexion établie.

## Suggestions à discuter

- Un destinataire recherchable qui affiche rapidement le titre, le harness et le dossier pour distinguer les sessions homonymes.
- Une action « Nouvelle session » accessible même lorsque des sessions existent déjà.
- Un aperçu Markdown optionnel dans le corps du message.

## Décisions encore ouvertes

- Périmètre de découverte des sessions créées hors Relai et mode de connexion lorsqu’elles ne sont pas pilotables directement.
- Ordre, annulation et comportement après erreur de la file d’attente.
- Rapport entre sujet d’un message, titre du chat natif et thread de l’inbox.
- Cycle de vie des processus lorsque le navigateur, le terminal ou le service est fermé.
- Informations Git/GitHub du résumé : branche, dépôt distant, PR, fraîcheur et disponibilité.
- Définition du dossier courant affiché : dossier de session ou dossier d’une commande terminal.
- Comportement du sujet et du prompt au niveau du harness : transmission exacte et rôle éventuel du sujet dans la création du titre de chat.
