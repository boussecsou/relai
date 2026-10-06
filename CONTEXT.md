# Relai — current context

Relai receives and organizes the work produced by coding agents. Read [product direction](docs/product-direction.md) and the [continuation guide](docs/context/RESUME.md) before changing the prototype.

## Glossary

**Agent tool / harness:** the native coding tool that owns the conversation and execution, such as Codex, Claude Code, Pi or OpenCode. It is distinct from the model provider.

**Source:** the tool and environment from which Relai obtains history or events. A source can be local or remote; integrations remain to be built.

**Native session:** the conversation managed by the agent tool. Saved history may outlive a running process or terminal.

**Thread:** Relai's view of one native session, including user messages sent in the native tool, agent responses and associated context.

**Native chat title:** the session's display name, kept separate from its stable identity.

**Result:** a response or deliverable to review. It is not automatically a successful implementation.

**Execution status:** the source's observed state, such as active, waiting for permission, failed or unknown.

**Review disposition:** the user's inbox decision, such as in inbox, handled or snoozed. Read state and stars are separate properties.

**Workspace:** working directory and, where available, its repository, worktree, branch and commits. Git is optional.

**Response snapshot:** context associated with a particular result, which may differ from current workspace state.

**Native terminal action:** access to or resumption of the original session, subject to the tool's capabilities. The prototype displays an illustration only.

## Current scope

Gmail-inspired review and organization, with local and server sources as the intended direction. No Compose or Reply action in this version; work continues in the native tool. Architecture and native integrations remain open.

The prototype is [index.html](index.html).
