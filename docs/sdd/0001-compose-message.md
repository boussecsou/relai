# SDD-001 — Composer un message

Statut : brouillon. Ce document enregistre le parcours demandé et les décisions encore ouvertes ; il ne décrit pas une fonctionnalité déjà implémentée.

## Objectif

Composer une demande dans une interface inspirée de Gmail, en visant une session de coding existante ou en lançant une nouvelle session dans un dossier de travail.

## Parcours demandé

### Session existante

Le champ destinataire propose les sessions détectées par Relai. Chaque entrée sélectionnable montre le nom de l’agent, le dossier courant et le titre du chat, par exemple « Codex CLI — /home/user/projects/p1 — Régler issue 3 », avec un résumé Git/GitHub lorsque disponible. Un Relai est envoyé à un seul destinataire. Le nom de l’agent est le nom du harness détecté automatiquement. Les historiques locaux des harnesses détectés apparaissent automatiquement, actifs ou non, selon la couverture de l’adaptateur. Les métadonnées sont découvertes en premier ; les conversations sont chargées progressivement. Une session détectée mais non pilotable apparaît comme « À connecter » ; l’envoi devient disponible après connexion.

« Reply » demande uniquement le prompt Markdown pour la session choisie, sans sujet distinct.

### New session

En l’absence de session lancée, l’utilisateur choisit un dossier de travail et un harness parmi les outils disponibles détectés automatiquement. Exemple : dossier « /home/user/projects/p1 », harness « Codex CLI ».

« New session » demande un titre de chat, la destination de lancement, le prompt Markdown et permet les libellés. L’envoi demande à Relai de lancer automatiquement le harness avec le prompt et le contexte d’exécution nécessaire. La session travaille en arrière-plan et son terminal est consultable dans l’interface.

### Réponse et file d’attente

« Reply » continue la conversation et la même session native. « New session » crée une nouvelle session et sa conversation Relai ; son parcours comprend le destinataire de lancement et les libellés. Si la session travaille déjà, le nouveau Relai rejoint une file d’attente. Une réponse à un chat arrêté reprend automatiquement sa session native lorsque le harness le permet. Si le dossier manque ou que la reprise échoue, Relai explique le problème et propose une action de récupération. L’ordre, l’annulation et les reprises après erreur sont à détailler dans le SDD-003.

Fermer le navigateur ou masquer le terminal laisse les agents travailler tant que le moteur local tourne. Arrêter un agent est une action explicite. Arrêter la machine conserve l’historique ; la reprise du travail dépend des capacités du harness. Les détails d’arrêt du moteur et de reprise restent à définir.

## Formulaire initial

- Destinataire : session existante ou dossier de travail et harness pour une nouvelle session.
- Titre de chat : uniquement lors de « New session » ; aucun sujet distinct pour « Reply ».
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
- « New session » est accessible pour créer une session distincte ; les détails du formulaire restent à définir.
- Un aperçu Markdown optionnel dans le corps du message.

## Décisions encore ouvertes

- Couverture et mode de connexion des sessions externes, avec état inconnu si leur activité ne peut pas être confirmée.
- Ordre, annulation et comportement après erreur de la file d’attente.
- Arrêt du moteur et reprise après arrêt de la machine ; fermeture du navigateur et masquage du terminal sans arrêt des agents.
- Informations Git/GitHub du résumé : branche, dépôt distant, PR, fraîcheur et disponibilité.
- Définition du dossier courant affiché : dossier de session ou dossier d’une commande terminal.
- Transmission du titre au harness et repli lorsque le renommage natif n’est pas disponible.
