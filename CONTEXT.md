# Relai

Relai organise les échanges entre un utilisateur et les sessions de ses outils de coding IA.

## Language

**Relai (application)** :
Interface locale et open source de gestion du travail avec des outils de coding IA, organisée comme une boîte de réception.

**Relai (message)** :
Message envoyé par l’utilisateur à une destination de coding depuis l’application Relai.

**Harness** :
Outil de coding IA externe qui porte les conversations et le travail de l’agent, comme Codex, Claude Code, OpenCode ou Pi.
_Avoid_ : Modèle IA, fournisseur de modèles.

**Message** :
Contenu échangé dans Relai pour demander du travail à un agent, recevoir son retour ou poursuivre la conversation. Un retour peut être une réponse, une question ou une demande d’approbation.

**Session** :
Conversation gérée par un harness et associée à un dossier de travail. Relai affiche son titre de chat, le nom du harness et son dossier de travail. Son historique reste accessible lorsque le terminal est fermé.

**Destinataire** :
Destination unique d’un envoi : une session existante ou un dossier de travail et un harness pour ouvrir une nouvelle session. La sélection affiche le nom de l’agent, le dossier courant, le titre du chat et un résumé Git/GitHub lorsque disponible.

**Sujet** :
Intitulé du message rédigé par l’utilisateur.

**Prompt** :
Corps du message envoyé au harness, rédigé en Markdown.
