# Organisation Notion et guide d’import

Date de consolidation : 4 octobre 2026. Statut : **Préparé localement ; non publié**.

## Page cible

[Relai v1](https://app.notion.com/p/Relai-v1-3efeba09656f803d865cdf19ac688596?source=copy_link).

## Bases proposées

| Base | Propriétés proposées | Vues |
| --- | --- | --- |
| Documents | Title, Type, Status, Date, File, Source | SDD ; UX ; Recherche ; Historique |
| Decisions | Title, Status, Scope, Rationale, Evidence | Confirmées ; Réalisation ; Proposées ; Rejetées |
| Research sources | Title, URL, Review date, Status, SHA256, Bytes, Note | Sources lues ; Indisponibles |
| Validation backlog | Title, Status, Category, Evidence | À décider ; À vérifier |
| Artifacts | Title, Type, File, Current, SHA256, Bytes | Maquettes ; Captures ; Preuves ; Sources |

Dans Notion, convertir les catégories en Select/Status et les dates en Date après import. Proposer ensuite relations Documents↔Decisions et Documents↔Research ; les CSV ne créent pas ces relations. Les chemins File sont des références à l’archive, pas des liens Notion déjà publiés.

## Import manuel

1. Télécharger et extraire l’archive. Garder une copie complète : elle comprend les HTML, captures, textes originaux et licences.
2. Dans la page cible, importer Relai-v1.md et les pages du dossier pages via l’option Markdown/Text de Notion disponible dans votre client. Selon l’importeur, importer les fichiers séparément ou préparer un ZIP des seuls Markdown.
3. Importer chaque CSV du dossier databases comme base, puis ajuster les types des propriétés et créer les vues proposées.
4. Associer le contenu des pages Markdown aux entrées Documents souhaitées : l’import CSV ne remplit pas automatiquement le corps des pages avec le fichier indiqué.
5. Joindre l’archive complète comme artifact, ou déposer les captures et HTML dans des sous-pages Assets si la limite de taille du compte le permet. Les HTML s’ouvrent localement ; ils ne sont pas une application exécutée dans Notion.
6. Réparer les liens relatifs en liens de pages/fichiers Notion après import ; vérifier les relations, permissions et couverture avant de marquer la publication complète.

Aucune dépendance nécessaire pour ouvrir les maquettes HTML. L’organisation fournie couvre les documents disponibles et les décisions de la conversation, mais n’est pas un export brut du transcript de chat inaccessible comme fichier.
