# Journal des modifications UI — Relai

## 2026-10-04 — Application de l’audit, priorité ordinateur

**Demande :** implémenter les remarques de l’audit, garder le mobile sans en faire une priorité, consigner toutes les modifications et décisions dans des notes Markdown.

**Référence :** [audit détaillé](audit/AUDIT-UI-UX.md). **Décisions et contraintes :** [UX-NOTES.md](UX-NOTES.md). La version HTML avant modification est conservée dans `audit/before-audit-implementation.html`.

| Zone de l’audit | Modification livrée | Motif UX/UI |
| --- | --- | --- |
| Lisibilité | Titres et corps agrandis, métadonnées lisibles, secondaires plus contrastés | Garder une interface compacte sans rendre les informations difficiles à lire |
| Thèmes et boutons | Sélections cohérentes, panneaux/menus sombres distincts, focus plus visible | Distinguer repos, survol, choix actif et focus |
| Inbox | Titres alignés, tags en seconde ligne, point non lu dans une colonne stable | Faciliter le balayage visuel et conserver le contexte avant ouverture |
| Non-lus/étoiles | Stockage local, Mark unread dans la conversation, actions collectives | Conserver les choix après rechargement |
| Filtres | Résumé actif, Clear visible, sortie proposée dans les résultats vides | Rendre les combinaisons de critères compréhensibles |
| Sélection | Barre temporaire, read/unread/star/unstar, Select all intermédiaire, export des brouillons | Donner une utilité aux cases sans ajouter d’actions destructrices |
| Retour | Libellé contextuel, scroll/focus rétablis, routes de liste restaurables | Revenir là où la lecture a commencé |
| Recherche | Surlignage, position du résultat, flèches limitées aux correspondances, effacement | Éviter de naviguer vers des messages hors recherche |
| Messages | État Expand/Collapse recalculé, résumés accessibles, texte de largeur bornée | Lecture longue et contrôle prévisibles |
| Composition | Destination près de Send prompt, reprise de brouillon explicite, New Relai | Réduire la confusion entre titre, session et destination |
| Sauvegarde | Export Markdown, indication exacte en cas de stockage indisponible | Permettre une copie portable et éviter une fausse promesse de sauvegarde |
| Sessions | Filtres d’activité, identifiants, dernière activité, non-lus, session homonyme | Représenter les sessions natives plutôt que les titres de prompts |
| Dossiers | Favorites/Recent, recherche spécifique, choix alternatif dans le menu, dossier homonyme | Choisir la bonne destination avec davantage de contexte |
| Git | Branche partagée cohérente, worktree distinct, sans dépôt, snapshot, fichiers et aperçus detached/conflit/branche changée/périmé | Montrer l’état du dossier plutôt que l’attribuer à une session |
| Markdown | Rendu GFM embarqué, liens/tableaux/tâches/titres/code, copie par bloc, filtrage | Même rendu dans Preview et les réponses, sans dépendance utilisateur |
| Settings | Sélections accessibles, focus préservé, stockage exact, outils facultatifs | Paramètres compréhensibles au clavier et dans les deux thèmes |
| Icônes/sidebar | Épaisseur homogène, tooltips, agents cliquables, recherche-filtres fonctionnelle | Retirer les éléments qui semblent interactifs sans l’être |
| Rail droit | Masqué par défaut, option en-tête/Settings, Notes accessibles, + remplacé | Libérer de l’espace en gardant les outils disponibles |
| Mouvement | Respect de prefers-reduced-motion | Éviter d’imposer des transitions et déplacements animés |
| Mobile | Adaptation conservée, contrôles de régression uniquement | Respecter la priorité ordinateur demandée |

### Vérification

Les 14 groupes de parcours ont réussi ; aucune erreur JavaScript n’a été observée. Les résultats exécutés sont consignés dans [implementation-tests.json](audit/implementation-tests.json). Les six contrôles complémentaires et les mesures de contraste sont dans [final-validation.json](audit/final-validation.json). Les groupes de scénarios couvrent les états lus/étoiles après reload, actions collectives, filtres/routes, retours contextuels, sessions, Git, recherche, rendu Markdown et injection HTML/protocoles, brouillons/minimisation/reprise/export, nouvelle fenêtre réelle, Settings/focus, thèmes, contenus longs et stockage indisponible.

La revue visuelle a également corrigé le dossier par défaut : choisir un favori plutôt que le premier dossier de la liste, et distinguer Draft in progress de Resuming draft. Les états vides n’affichent pas un Saving permanent. Les textes secondaires contrôlés atteignent 5,69:1 en clair et 8,69:1 en sombre sur la surface principale ; ces mesures ciblées ne constituent pas une certification complète.

Les captures avant changement restent dans `audit/`. Les nouvelles captures de présentation sont regroupées dans `audit/implemented/`.

### Limites assumées

- Les états du dépôt, terminaux et envois restent des exemples. Aucune commande ou connexion GitHub n’est exécutée.
- Les aperçus detached HEAD, conflit, branche changée et snapshot périmé sont disponibles dans le détail Git. Leur détection réelle appartient au futur service local.
- More projects est prévu et apparaît au-delà de quatre projets. Les exemples en comportent trois ; la pagination de très grandes listes reste à vérifier avec des données réelles.
- Le mobile, les lecteurs d’écran et les tests utilisateurs n’ont pas fait l’objet d’une nouvelle campagne complète.
- Stockage et exports restent locaux. Pas de synchronisation des brouillons entre appareils.

### Choix conservés / propositions écartées

Cancel n’est pas renommé. Pas de Forward/emoji, de nouveau mode focus, de trait bleu épais, de wizard de composition ou de nouvelle connexion GitHub. Le bouton Compose relai reste compact. Le logo définitif attend le fichier de l’utilisateur.

## 2026-10-04 — Recherche agents/terminaux et concepts HTML

**Demande :** proposer une intégration intuitive et extensible pour Codex, Claude Code, OpenCode et leurs configurations/skills ; produire des visualisations HTML.

**Livré :** trois maquettes autonomes plus une galerie, thèmes clair/sombre, interactions de connexion/reprise/permissions, profils natifs et scénarios de compatibilité. Recherche officielle élargie à Pi, Gemini CLI et Aider ; sources/statuts/snapshots consignés. Étude technique et décisions dans `terminal-concepts/`.

**Choix :** service local propriétaire du cycle de vie, connecteurs natifs distincts, ACP lorsqu’approprié, configuration héritée par défaut. La reprise d’un historique ne vaut pas attachement à un terminal externe. Une mise à jour d’agent ne force pas systématiquement une mise à jour de Relai ; une rupture de contrat peut nécessiter un correctif du connecteur.

**Validation :** quatre groupes de scénarios du navigateur, aucune erreur JavaScript dans les parcours testés. L’application et la maquette principale n’ont pas été modifiées ; il s’agit de concepts, sans processus d’agent exécuté.

## Session workspace intégré — 4 octobre 2026

- Ajout de `runtime.js` et `runtime.css`, embarqués par `build-preview.py` dans index.html.
- `app-shell.html` : fenêtre latérale de session avec contrôles fixes. `app.js` : entrées conversation/session/Settings, résumé d’overrides et focus incluant les selects.
- Navigation Overview / Activity / Terminal / Settings / Skills / Profiles ; sessions contextualisées, reprise/connexion/check simulés, URL loopback validée sans requête.
- Modèle, effort et comportement séparés des permissions, héritage par défaut, overrides par ID de session et scope prochain prompt. Skills sélectionnables/effaçables sans invocation réelle.
- Compatibilité d’agent isolée, historique maintenu, terminal de sorties illustratives et approbations explicites.
- Historique sauvegardé avant modification. 22 contrôles d’intégration + six de régression : isolation, persistance, contrôles indisponibles, connexion, approbation, activité inconnue, récupération, Escape/Tab, thèmes, débordement, composeur, Reply et absence de requêtes externes.
- Aucun changement de branche, commit, push ni moteur d’agent réel. Les concepts restent conservés séparément comme sources de conception.
