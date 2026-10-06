> Historical reference: this document describes the previous Relai scope. Read [current product direction](../product-direction.md) before applying its decisions.

---
status: accepted
---

# Un service local natif propriétaire du moteur

L’utilisateur délègue le choix d’une installation légère et distribuable qui utilise ses harnesses existants. Relai adopte un service natif dans l’environnement de ces outils, d’abord Linux/WSL, avec UI navigateur et API reliées au même cœur applicatif ; Rust, TypeScript/React, SQLite et Git CLI constituent la stack retenue. Cette organisation garde l’accès aux outils du poste et une installation principale unique ; le mode hybride Docker ajouterait un runner et un protocole à installer et maintenir.

Le service possède le stockage et supervise les processus indépendamment des onglets. Le futur MCP réutilisera ses opérations applicatives ; son implémentation est différée. Docker reste une option ultérieure pour un environnement d’agents containerisés ou un déploiement hybride, avec des contraintes distinctes. L’installation sur plusieurs machines signifie des instances locales indépendantes ; une synchronisation ou orchestration entre machines n’est pas décidée.
