# SDD-004 — Service local, API et distribution

Date de consolidation : 4 octobre 2026. Statut : **Architecture retenue dans le dépôt ; détails ouverts**.

## Socle

Rust supervise le moteur et les processus ; TypeScript/React sert l’UI ; SQLite conserve le store ; Git CLI fournit les informations Git. Un service local possède le store et les processus, indépendamment du nombre d’onglets. Linux/WSL est la première cible.

Modules conversations, envois, runtime/connecteurs et Git derrière des interfaces courtes. Chaque adaptateur déclare ses capacités au lieu d’exposer partout ses commandes CLI. API versionnée, pagination, événements et accès local protégé ; règles exactes d’authentification et d’origine à spécifier. Un futur MCP partage les opérations applicatives, il n’est pas à construire maintenant.

## Distribution

Produit cible distribué avec UI embarquée, sans obligation de Node ou Rust chez l’utilisateur. Formats de packages, supervision et plateforme Windows native à valider. Plusieurs machines signifient plusieurs instances indépendantes ; aucune synchronisation retenue.

Docker est une option ultérieure : un conteneur ne contrôle pas automatiquement les processus de l’hôte. Un bridge local serait une architecture distincte à concevoir. Tauri peut être une extension desktop ultérieure.

## Ce qui est livré aujourd’hui

HTML autonome avec CSS/JS, fontes et bibliothèques embarquées : ouvrir le fichier suffit. Python est uniquement utilisé pour regénérer le fichier pendant le travail de design. Aucun service Rust, envoi natif, terminal réel ou installation locale n’est démontré par ces maquettes.

[ADR navigateur](../sources/repository-docs/adr/0001-browser-interface.md), [ADR service natif](../sources/repository-docs/adr/0002-native-local-service.md), [SDD installation/API original](../sources/repository-docs/sdd/0004-local-installation-and-api.md).
