# Inbox et terminal — choix appliqués le 2 octobre 2026

Les références guident l’organisation et les interactions de Relai. Les titres de chats, dossiers, noms d’agents et messages restent les données natives de l’utilisateur.

| Référence | Enseignement retenu | Application dans Relai |
|---|---|---|
| [Gmail : dispositions et boîte](https://support.google.com/mail/answer/18522) | Navigation stable et distinction entre boîte, lecture et rédaction | Boîtes d’envoi séparées des conversations ; lecture Markdown pleine largeur |
| [Gmail : catégories](https://support.google.com/mail/answer/3094499) | Une inbox peut proposer des entrées plus ciblées | All, Needs attention et Replies ; catégories adaptées au travail d’un agent et pouvant se recouper |
| [Gmail : libellés](https://support.google.com/mail/answer/118708) | Organiser sans imposer un classement unique | Libellés personnalisés conservés séparément de l’agent, du dossier et de l’état |
| [Gmail : recherche](https://support.google.com/mail/answer/7190) et [filtres](https://support.google.com/mail/answer/6579) | Rechercher et réduire une boîte avec des critères explicites | Filtre d’agent permanent, critères actifs visibles, suppression et réinitialisation, état vide réversible |
| [Gmail : raccourcis](https://support.google.com/mail/answer/6594) | Les parcours fréquents doivent être accessibles au clavier | Navigation des onglets, dialogues natifs et isolation des raccourcis dans le terminal |
| [ChatGPT : projets](https://help.openai.com/en/articles/10169521-projects-in-chatgpt) | Garder le contexte associé au chat | Agent, dossier, titre et branche restent visibles ; Reply reprend l’identité native |
| [ChatGPT : recherche de conversations](https://help.openai.com/en/articles/10056348-how-do-i-search-my-chat-history-in-chatgpt) | Retrouver une conversation est un parcours distinct de l’ouverture d’un nouveau chat | Sessions reste un catalogue passif, sans remplir artificiellement l’Inbox ni lancer un agent |
| [IBM Plex](https://github.com/IBM/plex) | Famille cohérente pour texte et code | Plex Sans Regular pour l’interface et Plex Mono pour les commandes ; ressources et licence locales |

La dernière demande explicite de l’utilisateur prévaut sur la composition latérale : modal centré avec fond flouté. La fenêtre conserve l’identité du destinataire, les modes d’édition, le contexte récent et les actions d’envoi. La hauteur de l’application n’est pas augmentée ; le contenu déborde dans le modal, avec actions accessibles et expansion facultative.

La persistance des filtres répond à un défaut concret : cacher le sélecteur après une requête sans résultat empêchait de choisir un autre agent. L’affichage des filtres dépend désormais de la vue, sans dépendre du nombre de résultats. La liste des agents ne dépend pas de la présence de chats ; un agent non installé peut être sélectionné pour rechercher ses historiques, tandis que les capacités d’exécution restent explicites.

Le terminal est une surface de travail supplémentaire de la conversation. Il utilise le vrai CLI pour préserver commandes, menus et permissions. La seule autorité d’entrée, le retour explicite à l’automatisation et les états de livraison restent des contraintes produit visibles, car ils changent la décision de l’utilisateur.

Les captures et Playwright vérifient le résultat rendu, les états vides et les transitions, au-delà des styles isolés. Les limites et interfaces natives sont précisées dans [SDD-006](../sdd/0006-native-terminal.md). Ces recherches ne démontrent ni une conformité d’accessibilité intégrale ni une compatibilité universelle avec les fournisseurs.
