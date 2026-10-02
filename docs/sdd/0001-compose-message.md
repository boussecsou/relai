# SDD-001 — Composer un message

## Révision du 2 octobre 2026 — fenêtre de rédaction centrée

La demande explicite la plus récente remplace le panneau à droite : Compose et Reply s’ouvrent au centre avec un fond flouté. Les comportements d’envoi, de programmation, de sauvegarde et de conflit sont conservés. Échap ferme après sauvegarde ; le navigateur contient le focus dans son dialogue natif. Les révisions ci-dessous restent historiques. Le terminal est désormais décrit dans [SDD-006](0006-native-terminal.md).

Statut : composition et envoi Codex implémentés au 30 septembre 2026. La révision suivante prévaut sur les propositions et étapes passives conservées plus bas.

## Révision livrée — composition et envoi

Le panneau de composition se place à droite, avec la liste visible sur grand écran et une commande d’expansion. Les régions Destination, Message, Details et actions sont délimitées ; interface en anglais, contenu natif et utilisateur préservé. Le titre est obligatoire pour une nouvelle session ; une réponse garde agent, dossier, titre et branche disponibles. Le contexte récent est consultable dans le panneau. Dossiers détectés/récents, autocomplétion clavier et navigation bornée remplacent la saisie seule.

Visuel/Markdown/Preview conservent le Markdown comme référence. Autosauvegarde et révisions empêchent l’écrasement entre onglets. Send et Schedule sont les actions principales ; copie, export et sauvegarde explicite restent dans More. Une soumission consomme atomiquement le brouillon, conserve un instantané et protège les doubles clics/requêtes. Les erreurs laissent le contenu récupérable. L’acceptation native et la fin du travail sont distinctes.

Codex reprend le même thread natif via un moteur géré par Relai, sans contrôler le CLI externe. Nouvelle session créée seulement à l’exécution d’un envoi. Les autres outils restent lisibles mais non envoyables. Files FIFO par session, sessions indépendantes dans un même dossier, programmation ponctuelle et récupération sont décrites dans le [contrat implémenté](../research/codex-delivery.md). Terminal interactif différé.

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

### Révision du parcours — terminal natif

Après essai, l’utilisateur a précisé que le clic sur un mail doit ouvrir sa lecture dans l’inbox Glass, sans nouvelle session. Le terminal natif reste une vue optionnelle du même chat, conservant commandes `/`, skills et menus. La réponse peut être préparée dans la conversation en Markdown ; le prototype propose de la copier puis de la coller dans ce CLI. « New session » est la seule action qui crée un processus. Un envoi graphique direct, la file automatique et la programmation exigent encore une intégration propre au harness. Voir [SDD-005](0005-inbox-ui-ux.md#direction-confirmée--inbox-glass-et-terminal-du-même-chat) et le [prototype inbox](../../design/inbox-prototype/README.md).

### Questions restantes

- Couverture et mode de connexion des sessions externes, avec état inconnu si leur activité ne peut pas être confirmée.
- Ordre, annulation et comportement après erreur de la file d’attente.
- Arrêt du moteur et reprise après arrêt de la machine ; fermeture du navigateur et masquage du terminal sans arrêt des agents.
- Informations Git/GitHub du résumé : branche, dépôt distant, PR, fraîcheur et disponibilité.
- Définition du dossier courant affiché : dossier de session ou dossier d’une commande terminal.
- Transmission du titre au harness et repli lorsque le renommage natif n’est pas disponible.

## Livraison graphique du 30 septembre 2026

Préparation implémentée : destinataire existant ou nouvelle destination, libellés multiples, ticket facultatif, Markdown/Visuel/Aperçu, brouillon persistant avec révision et copie lors d’un conflit. Une réponse conserve l’identité native et ne demande pas de nouvel objet. Une nouvelle destination ne lance aucun runtime. Enregistrer, copier et exporter disponibles ; envoi différé suivant [ADR-003](../adr/0003-passive-catalogue-and-blank-inbox.md).
