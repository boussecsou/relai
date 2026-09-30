# Maquette UI/UX Relai

## Prototype inbox Glass

Le [prototype inbox](inbox-prototype/README.md) conserve le design Glass et ouvre les mails en lecture sans créer de terminal. Les réponses finales des sessions Codex lancées ici arrivent automatiquement dans leur conversation ; son terminal natif reste accessible à la demande. Lancer `npm --prefix design/inbox-prototype ci`, puis `npm --prefix design/inbox-prototype start` et ouvrir http://127.0.0.1:4176. Le premier prototype sur 4174 reste séparé.

## Prototype de terminal interactif

Le [prototype mail → terminal](terminal-prototype/README.md) permet d'ouvrir le **vrai CLI** depuis un mail d'exemple, de revenir à l'inbox et de retrouver sa session. Après installation de ses dépendances, lancer `npm --prefix design/terminal-prototype start` depuis la racine puis ouvrir http://127.0.0.1:4174. Trois dispositions sont comparables. Le pont temporaire Node/Python ne constitue pas le moteur Rust de production.

## Maquettes autonomes

Ouvrir **`relai-glass.html`** dans un navigateur pour la nouvelle version : fond animé, verre dépoli et navigation Gmail. La première maquette reste disponible dans `relai-inbox.html`. Pour servir les deux depuis la racine du dépôt :

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory design
```

Puis ouvrir http://localhost:4173/relai-glass.html.

Maquette de conception autonome : données fictives, sans dépendances, backend, agent ni persistance. Les changements disparaissent au rechargement. Ce fichier ne constitue pas l’UI de production React.

## Interactions

- Sélection de chat, recherche libre ou filtres `harness:codex`, `directory:relai`, `branch:fix/auth`, `label:Bug`.
- Navigation Inbox / Envoyés / En attente / Programmés et libellés.
- New session, Reply, file d’attente et actions d’erreur simulées.
- Programmation ponctuelle ; annulation remet le prompt dans Reply.
- Diff de fichier et terminal fictifs, thème sombre/clair.
- Ctrl/Cmd K pour la recherche, Ctrl/Cmd Entrée pour Reply.

Le prompt Markdown est affiché comme texte dans cette maquette. Les états d’exécution, autorisations et transitions servent uniquement à explorer les parcours ; ils ne valident pas le comportement du runtime de production. Une session « À connecter » reste non envoyable.

Voir [SDD-005](../docs/sdd/0005-inbox-ui-ux.md) pour les références et décisions à valider. Les aperçus sont dans `previews/`.

## Version Glass

Cliquer sur un Relai ouvre sa conversation dans toute la zone centrale. Retour, précédent/suivant, favoris, archives avec annulation, sélection multiple, densité compacte et menu de raccourcis sont disponibles. `C` ouvre New session, `R` cible Reply, `J`/`K` naviguent, Échap revient à la liste. Le fond animé peut être suspendu et respecte la préférence de réduction du mouvement.

Manrope est embarquée dans le HTML ; licence SIL Open Font License dans `fonts/Manrope-OFL.txt`. Aucun chargement externe requis pour le rendu.
