# Relai — volumes, réactivité et modularité

Recherche du 30 septembre 2026. Statut : pistes à discuter, aucune implémentation ni choix définitif de stack.
Question : comment garder une application locale Rust/React adaptable avec 10 000 chats et plus de 20 sessions, sans compliquer son code ?

## Faits vérifiés

- Rust organise le code en packages, crates et modules ; les modules contrôlent visibilité et chemins. Les éléments sont privés par défaut et une API publique peut cacher son implémentation. Cela ne prescrit aucun nombre de fichiers ou de crates. [Organisation Rust](https://doc.rust-lang.org/book/ch07-00-managing-growing-projects-with-packages-crates-and-modules.html), [Visibilité](https://doc.rust-lang.org/book/ch07-03-paths-for-referring-to-an-item-in-the-module-tree.html).
- TanStack Virtual virtualise de longues listes et laisse markup et styles à l’application. Il fournit une intégration React et une documentation pour chats, streams et logs ; il ne fournit ni stockage paginé ni garantie de latence. [Introduction](https://tanstack.com/virtual/latest/docs/introduction).
- SQLite WAL permet lectures et écriture concurrentes, avec un seul écrivain à la fois. Les lectures longues peuvent empêcher les checkpoints et laisser grossir le WAL ; `SQLITE_BUSY` reste possible. WAL nécessite les processus sur le même hôte et ne fonctionne pas sur un système de fichiers réseau. [WAL](https://www.sqlite.org/wal.html).
- La documentation SQLite recommande une version corrigeant le bug WAL-reset : 3.51.3 ou ultérieure, ou rétroportages 3.44.6/3.50.7. Vérifier la bibliothèque réellement embarquée, pas seulement la CLI système. [Correctif WAL-reset](https://www.sqlite.org/wal.html#walreset).
- FTS5 propose phrases, préfixes, booléens, filtres de colonnes, BM25 et extraits surlignés. La syntaxe métier et les filtres de dates/états restent à construire dans Relai. [FTS5](https://www.sqlite.org/fts5.html).
- Tokio `mpsc` borné fournit une contre-pression ; sa variante non bornée ne la fournit pas. `broadcast` borne sa rétention et signale `RecvError::Lagged` quand un abonné a perdu des messages. Un canal mémoire ne constitue pas une file durable. [mpsc](https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html), [broadcast](https://docs.rs/tokio/latest/tokio/sync/broadcast/index.html).

## Propositions Relai à valider

### Modules cohérents avec interfaces courtes

Commencer avec quelques modules qui cachent chacun une complexité réelle, dans une crate si cela suffit. Extraire une crate seulement lorsqu’une frontière de déploiement ou de dépendances le justifie.

| Module envisagé | Responsabilité cachée | Interface attendue |
| --- | --- | --- |
| Conversations | Historique, libellés, pagination, recherche et index | Lire une page, chercher, enregistrer un message |
| Envoi | File par session, programmation, états et reprise après arrêt | Enregistrer/annuler un envoi, consulter son état |
| Runtime | Découverte, lancement/reprise, supervision, limites et adaptateurs | Décrire les destinations, envoyer, arrêter, répondre à une approbation |
| Preuves | État Git, résultats de commandes et références aux artefacts | Consulter les preuves d’un run |
| Transport/UI | Connexion runner-service, snapshots et présentation | Commandes métier et changements observables |

Les migrations SQL, checkpoints et index restent derrière la persistance ; le protocole propre à chaque harness reste derrière son adaptateur. Garder les fichiers proches de leur fonctionnalité. Aucun découpage en micro-fichiers, bus universel ou framework de plugins avant un besoin concret.

Un adaptateur annonce ses capacités effectives : historique, reprise, streaming, questions, approbations, interruption, terminal. Il conserve les identifiants natifs. Une session externe détectée sans canal de contrôle ne devient pas une destination pilotable par simple détection.

### Chargement et ressources

- Paginer la liste de chats et l’historique avec ordre stable et curseurs ; charger corps, diffs et pièces jointes à la demande. Virtualiser les lignes visibles sans charger toute la base dans React.
- Séparer cache des résumés et contenu de conversation ; limiter les abonnements détaillés à la session ouverte. Regrouper les deltas visuels et mesurer leurs effets sur focus, scroll et saisie.
- Ouvrir l’émulateur terminal sur demande ; conserver seulement une fenêtre bornée en mémoire. Définir rétention/rotation des logs persistants, leur taille maximale et la visibilité d’une troncature.
- Lire continuellement les sorties des processus, même avec terminal masqué. Prévoir stockage tampon borné et politique explicite en saturation pour éviter de bloquer tout le runtime ou de perdre silencieusement un résultat.
- Limiter séparément sessions chargées, runs actifs et commandes lourdes. Observer CPU, mémoire, stockage et profondeur des files ; une session idle ne consomme pas comme un agent compilant un projet.
- Utiliser des canaux bornés entre tâches ; réserver `broadcast` aux notifications récupérables. En cas de retard ou reconnexion, relire un snapshot et les événements persistés depuis un curseur.

### Persistance et reprise

- Confier SQLite au service propriétaire sur stockage local approprié ; le runner passe par son API plutôt que d’ouvrir la base à travers la frontière Docker/WSL.
- Persister message sortant, destination, ordre, échéance et transition d’état avant l’accusé de réception. Une notification mémoire réveille le dispatcher ; elle ne détient pas seule le travail.
- Réclamer les envois par transaction et réconcilier les runs au redémarrage. Distinguer « enregistré », « accepté par le harness » et « terminé » ; un arrêt entre livraison et accusé peut laisser un résultat incertain.
- Ne pas promettre exactement une exécution si le harness n’offre pas de déduplication vérifiable. Montrer l’incertitude avant de relancer automatiquement.
- Garder des transactions courtes et traiter les écritures par lots maîtrisés. Vérifier activation FTS5, version SQLite, stratégie de checkpoint, sauvegarde et choix de durabilité `synchronous` lors du prototype.
- Définir avant implémentation échéances manquées, fuseau, annulation, session occupée et machine endormie. Aucun canal Tokio ne remplace ces règles persistées.

## Cible de validation proposée

10 000 chats persistés et 25 sessions simultanément disponibles constituent une cible de prototype, pas une performance garantie. Distinguer 25 sessions chargées de 25 runs actifs ; tester ces deux scénarios et documenter l’effet des limites de ressources.

Sur une machine WSL de référence documentée, constituer un jeu reproductible de messages, tailles et logs ; comparer idle, streaming et commandes lourdes.
Mesurer p50/p95 de recherche et ouverture, durée des écritures, frames lentes, mémoire navigateur/service/runner, croissance des logs et du WAL. Fixer les seuils d’acceptation avec l’utilisateur avant d’annoncer la cible atteinte.
Vérifier ordre des réponses en file, redémarrage avec envois persistés, échéance manquée, reconnexion, abonné lent, sortie terminal volumineuse et arrêt d’un processus.

Les volumes de messages par chat, le matériel minimal, la rétention, les recherches dans logs/diffs et la simultanéité de runs lourds restent ouverts. Aucun de ces composants ne prouve seul la réactivité du produit.
