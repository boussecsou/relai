# SDD-006 — Terminal natif de la même conversation

Implémentation du 2 octobre 2026. Une conversation conserve son identifiant natif et son dossier. Lire son Markdown reste passif ; **Open terminal** démarre ou retrouve son CLI dans un véritable PTY. Cela ne prend pas le contrôle d’un terminal extérieur déjà ouvert.

## Processus et autorité d’envoi

Le service Rust conserve le PTY indépendamment des connexions navigateur. Masquer la vue et fermer un onglet ne terminent pas le processus. Une seule connexion écrit et redimensionne ; les autres observent. **Take control** transfère explicitement cette autorité. Une reconnexion restitue l’écran courant grâce à un émulateur serveur, sans relancer un processus actif. Le scrollback complet n’est pas restitué ; l’historique natif reste conservé séparément.

**Close terminal process** termine ce CLI. L’interruption d’un tour Codex reste l’action **Stop** d’Activity. Le moteur partagé peut continuer un tour lorsque son TUI se ferme. Le mode terminal persiste en SQLite ; il bloque le dispatcher du chat, y compris les échéances devenues queued, et laisse travailler les autres chats. **Return to automatic sending** exige la fin du tour, ferme le CLI, attend sa terminaison puis libère la file. Après un redémarrage du service, le mode reste suspendu jusqu’à cette action explicite. Les processus ne survivent pas à l’arrêt du service ou de la machine.

## Adaptateurs

- **Codex 0.159.x** : `resume --remote unix://… ID`. Un pont WebSocket Unix privé relie le TUI au client app-server stdio existant. Il remappe les identifiants RPC et partage les événements. Il évite une migration de l’envoi graphique stable vers un autre moteur. Les demandes de validation sont persistées avant diffusion. Une réponse du TUI et une réponse graphique font une transition conditionnelle `pending → answering` ; une seule est transmise. Les changements de chat et forks sont refusés dans ce terminal lié à une conversation. Le transport natif est expérimental selon la [documentation Codex](https://learn.chatgpt.com/docs/app-server).
- **Claude Code** : `--resume ID --settings JSON` avec hooks limités à cette invocation, sans écriture des paramètres globaux. `PermissionRequest` attend une décision graphique ponctuelle ; absence de décision ou expiration rend la main au CLI. `UserPromptSubmit`, `Stop` et `StopFailure` donnent les états et retours. Les autres dialogues, notamment certains prompts de sandbox, restent natifs. Voir les [hooks officiels](https://code.claude.com/docs/en/hooks).
- **OpenCode** : serveur loopback authentifié avec secret aléatoire en environnement, puis `attach --session ID --dir …`. La session et le schéma sont vérifiés avant ouverture. SSE fournit état, réponse et permission ; l’API traite une validation encore en attente. Une réponse native invalide la carte graphique. Les racines de données incompatibles sont refusées. L’envoi graphique n’est pas ajouté. Voir le [serveur officiel](https://opencode.ai/docs/server/) ; le schéma local vérifié de 1.18.34 utilise `/permission/{requestID}/reply`.
- **Pi** : reprise par chemin natif si installé. Absent sur la machine vérifiée ; aucun envoi graphique ni adaptation graphique de ses permissions n’est annoncé.

## Persistance, flux et sécurité

Tables additives `runtime_modes`, `terminal_turns`, `terminal_requests`. Le prompt Codex natif complet, dont skills et pièces jointes, est sauvegardé transactionnellement avant `turn/start`. Les erreurs incertaines ne sont jamais rejouées automatiquement. Un prompt natif ne peut pas être réessayé graphiquement en le réduisant à du texte ; sa reprise passe par le CLI après vérification. L’API refuse aussi la restauration en brouillon, la reprogrammation et l’envoi immédiat d’une intention terminal ; ces actions pourraient perdre son payload natif. Verify native outcome reste disponible pour l’inspection et Skip pour libérer la file sans recréer de brouillon.

Le WebSocket navigateur utilise les contrôles Host, Origin et cookie locaux existants. Le socket Unix utilise un répertoire 0700 et un fichier 0600. Les chemins et commandes de lancement proviennent du catalogue natif et de l’adaptateur, jamais d’une commande reçue du navigateur. Le dossier doit exister.

Sortie PTY par blocs de 16 KiB, diffusion bornée à 128 blocs, fenêtre d’acquittement par client de 64 blocs. Les clients lents reconnectent après dépassement. xterm et l’émulateur limitent le scrollback à 3 000 lignes ; dimensions serveur bornées à 120 × 300. Aucun état métier n’est inféré de l’ANSI. Liens terminal limités à HTTP(S), raccourcis navigateur exclus de la zone de saisie, Ctrl+Escape retourne aux contrôles.

## Vérification et limites

Playwright couvre modal centré/flouté, focus et brouillons, matrice des quatre agents/huit vues, catégories Inbox, PTY, contrôle entre deux onglets, reconnexion, file manuelle et programmée suspendue, reprise explicite, permissions Claude simulées, serveur HTTP/SSE OpenCode factice avec réponse GUI et native, et arrivée des retours. Les tests existants vérifient FIFO, 25 sessions indépendantes, planification et récupération. Les tailles 390, 768, 1024, 1365 et 1920 ainsi que le reflow équivalent à 200 % sont couvertes.

Le véritable TUI Codex 0.159.3 a été affiché sur un chat isolé avec fournisseur factice sans envoyer de prompt. Les scénarios d’inférence réelle et les permissions réelles des fournisseurs nécessitent des essais distincts ; les fixtures ne démontrent pas leur fonctionnement universel. Les lecteurs d’écran réels et la prise de contrôle de processus extérieurs restent hors de cette vérification.
