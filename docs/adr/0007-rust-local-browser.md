# Cœur Rust et interface navigateur locale

Statut : accepté ; demande explicite de l’utilisateur, consignée le 8 octobre 2026.

Relai doit rester un outil secondaire léger, lancé localement par une commande, avec une interface dans le navigateur. Son cœur sera en Rust. Cette direction évite d’exiger une application desktop dédiée pour la première version ; elle n’arrête pas les bibliothèques, le stockage ou le transport.

TypeScript a été envisagé pour le frontend sans décision définitive. REST n’est pas une décision prise : l’utilisateur a corrigé ce terme pour préciser Rust. Les budgets de mémoire/démarrage et le mode de distribution restent à fixer et à mesurer.
