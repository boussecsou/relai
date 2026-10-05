# SDD-006 — Modèle, effort, modes et skills

Date de consolidation : 4 octobre 2026. Statut : **UI intégrée en simulation ; contrat natif proposé**.

## Recommandation

Garder Relai pour le messaging quotidien et proposer un panneau compact **Session settings** seulement pour les réglages réellement pris en charge. Le terminal natif reste disponible pour les commandes avancées. Tout n’a donc pas à passer exclusivement par le terminal.

Composer reste simple. Dans une conversation, un résumé discret peut indiquer : **Codex · [model] · [effort] · Plan** puis ouvrir les détails. Ces libellés sont illustratifs, pas des valeurs universelles à coder en dur.

## Matrice de contrôle

| Contrôle | Comportement proposé | Repli |
| --- | --- | --- |
| Model | Catalogue natif ; disponibilité et portée indiquées | Open native agent |
| Reasoning effort | Seulement si agent et modèle le supportent ; valeurs natives | Explication d’indisponibilité |
| Behavior mode | Plan/Build ou équivalent natif ; ne pas traduire arbitrairement | Commande native indiquée comme exemple |
| Permissions | Section distincte ; respecter la politique native et montrer les changements | Gestion dans l’agent natif |
| Skills | Catalogue avec provenance et invocation native si supportée | Agent natif ; demande textuelle sans garantie d’invocation |
| Connection/runtime | Statut et commande de connexion distincts des modes | Check connection / Resume selon capacité |

« Mode » ne doit pas fusionner comportement, sécurité et type de connexion. Un skill disponible n’est pas forcément chargé ou invoqué. Une sélection de skills n’est pas une sandbox.

## Portée et synchronisation

Chaque modification montre sa portée réelle : **Next prompt**, **New sessions**, **Requires resume/new session**, **Native only** ou **Unavailable**. Pendant un run actif, ne pas prétendre modifier sa configuration sans support natif. Conserver les valeurs effectives retournées par l’agent, et signaler les valeurs héritées ou non vérifiables.

Hériter de la configuration native par défaut : utilisateur, projet, dossier et politiques. Les overrides sont facultatifs, explicites et liés à un scope ; pas de copie automatique des fichiers/skills dans Relai. Un override ne doit pas élargir silencieusement les permissions.

## Skills

Afficher nom, description, source/provenance et état connu : découvert, disponible, chargé/invoqué si événement natif fiable. L’invocation peut être structurée ou textuelle selon l’interface ; aucune syntaxe slash universelle supposée. En absence de commande supportée, ouvrir le natif ou présenter un texte comme demande, sans promettre une invocation.

## Scénario concret

L’utilisateur ouvre un Relai Codex, consulte Session settings, change l’effort pour le prochain prompt si supporté, invoque un skill disponible via le connecteur si possible, puis envoie Reply. Une opération native-only renvoie vers l’agent avec son contexte de session. Le passage au terminal ne crée pas une seconde exécution concurrente.

## Validation à faire

Tester chaque agent/version réellement installé : catalogues, scope des réglages, mise à jour effective, invocation et événements, reprise, politiques héritées. Déterminer aussi comment attribuer les réponses quand plusieurs Relais partagent une session. Le panneau est désormais intégré au prototype principal : réglages par session et scope prochain prompt, skills et repli natif simulés. Aucun réglage d’agent réel ne change.

[Recherche détaillée existante](../assets/relai-design/terminal-concepts/TERMINAL-INTEGRATION.md), [SDD connecteurs](SDD-007-agent-connectors.md).
