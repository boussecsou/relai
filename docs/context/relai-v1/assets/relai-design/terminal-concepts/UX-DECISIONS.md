# Décisions UX/UI — concepts de terminaux

Date : 4 octobre 2026. Cette exploration propose des idées ; elle n’ajoute pas un moteur de terminal à Relai et ne remplace pas le prototype principal.

## 01 — Session workspace

**Choix :** panneau latéral à la demande, conversation centrale et Reply fixe. Garder la complexité du moteur en second niveau.

**Contexte visible :** agent, dossier, ID natif, connexion, configuration héritée. Le nom d’un Relai reste indépendant du nom de session.

**Trois vues :** Overview pour la destination ; Activity pour les événements ; Terminal pour les sorties ou une vue native possible. Les sorties de commandes ne sont pas présentées comme le miroir d’un TUI externe.

**Exemples :** Codex contrôlé par Relai, Claude avec historique seulement jusqu’à reprise explicite, OpenCode avec serveur connecté et approbation. Ouvrir ou fermer le panneau ne change pas l’état du moteur.

## 02 — Agent profiles

**Choix :** un profil par agent avec héritage natif par défaut. Les réglages avancés restent hors de Compose relai.

**Configuration :** sources utilisateur/projet, exceptions facultatives pour nouvelles sessions. Les fichiers montrés sont des exemples, pas des lectures locales.

**Skills :** provenance et disponibilité ; les interrupteurs sont montrés uniquement dans le scénario Claude dont les types SDK consultés exposent une sélection. Les scénarios Codex/OpenCode illustrent une intégration en lecture/héritage seulement, même si un futur connecteur pourrait proposer davantage.

**Compatibilité :** Supported, Agent updated, Unsupported interface et Executable missing. L’historique reste distinct de l’envoi et un défaut d’agent ne rend pas tous les autres indisponibles.

## 03 — Session connections

**Choix :** une action adaptée au statut au lieu d’un même bouton Send pour toutes les lignes.

- Connected → Open session.
- Saved history → Resume in Relai, après vérification de propriété.
- Needs connection → Connect server.
- Activity unknown → Check connection, sans création automatique d’une exécution concurrente.

Deux sessions Codex homonymes illustrent la nécessité des IDs, chemins et connexions. Vérifier un endpoint dans la maquette ne déclenche aucun appel réseau.

## Direction visuelle

Conserver l’anglais, IBM Plex, les dégradés sobres, Codex bleu, Claude orange et OpenCode gris. Palette claire/sombre cohérente avec le prototype. Contrôles compacts mais noms explicites, états sélectionnés accessibles, focus visible et motifs de récupération proches de l’action.

Le mobile reste une adaptation de secours : priorité aux écrans d’ordinateur. Aucun nouveau parcours mobile n’a été recherché.

## Vérification exécutée

Quatre groupes de scénarios dans `validation.json` : fichiers autonomes et thèmes ; panneau/session/reprise/approbation ; profils/skills/compatibilité ; états de connexion et endpoint invalide. Les parcours examinés n’ont produit aucune erreur JavaScript. Aucun script ou style distant requis.

Les images 01/02/03-light/dark montrent les écrans principaux. Les simulations ne démontrent ni détection des agents installés, ni contrôle d’un terminal réel, ni compatibilité entre versions de SDK.
