# Prototype — mail reçu → terminal interactif

Question : un mail peut-il ouvrir un panneau donnant accès au vrai CLI, puis retrouver le même processus après retour à l'inbox ou rechargement du navigateur ?

Prototype exploratoire Linux/WSL, hors production. Les deux mails sont fictifs. Chaque mail est lié à un emplacement de session ; sa première ouverture démarre un **nouveau** CLI dans le projet Relai. Les ouvertures suivantes retrouvent ce même processus. Aucun terminal externe existant n'est importé.

## Lancement

Installer une fois les dépendances, depuis la racine du dépôt :

```bash
npm --prefix design/terminal-prototype ci
```

Puis démarrer :

```bash
npm --prefix design/terminal-prototype start
```

Ouvrir http://127.0.0.1:4174, puis cliquer sur un mail. Node.js, Python 3 et Codex CLI installé/authentifié sont nécessaires. Le programme utilise Codex directement, sans prompt automatique ni modification de sa configuration. Les demandes et validations restent dans son terminal.

Pour vérifier avec Bash :

```bash
RELAI_PROTOTYPE_COMMAND=bash npm --prefix design/terminal-prototype start
```

Un port différent peut être choisi avec `RELAI_PROTOTYPE_PORT`.

## Parcours et dispositions

- Clic sur un mail → panneau terminal ; retour à l'inbox sans arrêt du CLI.
- A : terminal central avec contexte latéral (`?variant=A`, défaut).
- B : mail à gauche, terminal à droite (`?variant=B`).
- C : mail au-dessus, terminal en dessous (`?variant=C`).
- Mode focus, volet contexte repliable, bouton Reconnecter ; les raccourcis du CLI gardent la priorité dans le terminal. Certains raccourcis réservés au navigateur ne sont pas interceptables.
- Un seul panneau écrit par session ; les autres sont en lecture seule. « Prendre le contrôle » transfère la saisie explicitement.
- « Arrêter » termine le processus ; fermer le panneau ne le termine pas. Un emplacement arrêté ne redémarre pas automatiquement : redémarrer le serveur pour refaire l'expérience.

## Pont temporaire

Navigateur xterm.js → WebSocket → Node.js → PTY Python → CLI natif. Un terminal headless et l'addon serialize restaurent l'écran et un historique borné après reconnexion, sans rejouer les commandes. La sortie est traitée par lots ; un client trop lent doit reconnecter. Cette régulation est minimale et ne valide pas un budget de charge de production.

L'état du terminal reste en mémoire. Fermer le navigateur conserve le CLI tant que le serveur tourne. Arrêter le serveur termine les CLI ; après redémarrage, les emplacements correspondent à de nouveaux processus. L'arrêt de la machine n'est pas couvert.

Le serveur écoute uniquement sur loopback ; accès WebSocket contrôlé par cookie de session et origine. Les sessions ne sont lancées qu'à l'ouverture d'un mail. L'interface distingue état du processus et état du travail : elle ne sait pas encore si l'agent réfléchit ou attend une réponse. Il n'y a pas de hooks agent, inbox alimentée par de vrais retours, file automatique, extraction des diffs ni persistance SQLite.

Le pont Node/Python sert à tester vite la fidélité du terminal. Le moteur de production retenu reste Rust. Voir [la recherche](../../docs/research/interactive-terminal-panel.md).

## Vérification de cette révision

Vérifié dans Chromium avec un véritable PTY Bash : ouverture depuis le mail, saisie et sortie Unicode, Ctrl-C, retour/rechargement/fermeture puis reconnexion au même processus, restauration de l'écran alternatif, panneau observateur et transfert de contrôle. Les trois dispositions, leur mode focus et un écran mobile de 390 px ont été contrôlés sans débordement horizontal ni erreur JavaScript observée.

Le véritable CLI Codex installé a également été ouvert dans le panneau : menu `/`, commande `/skills` et liste native des skills ont été affichés sans envoyer de prompt ni invoquer de skill. Cela ne valide pas encore l'exécution de skills, les approbations pendant une tâche, les entrées IME ni la couverture des autres harnesses. Les captures de Codex et scripts de vérification restent temporaires, hors du dépôt.

Verdict : le parcours mail → terminal natif et la reconnexion au même processus sont réalisables dans ce prototype. La disposition finale attend le retour utilisateur. Prochaine expérience : recevoir un vrai événement de réponse du CLI dans l'inbox, puis ouvrir le terminal correspondant.
