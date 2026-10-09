# Relai — domain language

Relai organizes the work produced by coding agents so the user can review results, understand their provenance and identify the next intervention.

## Sources and conversations

**Agent tool / harness:** the native coding tool owning a conversation and its execution, such as Codex, Claude Code, Pi or OpenCode. It is distinct from the model provider.

**Source:** the tool and environment from which Relai obtains history or events. A source can be local or remote.

**Native session:** a conversation managed by an agent tool. Its saved history may outlive its process or terminal.

**Thread:** Relai's view of one native session, including user messages, responses and context. New responses belong to this thread.
_Avoid_: mail as a stable identity, one thread per response.

**Native chat title:** a session's mutable display name, distinct from its stable identity.

**Conversation fork:** an alternative path in a native conversation. It is distinct from a Git branch.

**Subagent result:** work produced by a related agent context and associated with its parent session. It is not automatically a completed implementation.

## Results and provenance

**Result:** a response or deliverable available for review. Availability does not imply correctness.

**Receipt:** the arrival of a result or update in an existing thread. It does not create a new native session.

**Workspace:** a working directory and, when available, its repository, worktree, branch and commits. Git is optional.

**Response snapshot:** context and evidence associated with one response. It can differ from the current workspace state.

**Recorded check:** an observed verification command and outcome tied to the snapshot it checked. An agent's claim is not itself a recorded check.

**Source observation:** the state and time last reported by a source. A saved observation does not prove current connectivity or execution.

## Execution and review

**Execution status:** the source's observed state, such as active, waiting for permission, failed or unknown.

**Review disposition:** the user's inbox decision, such as in inbox, handled or snoozed. It is distinct from execution, verification, read state and stars.

**Handled:** a result the user has finished reviewing for now. It does not mean a native command or pull request was approved.

**Snoozed:** a thread deferred by the user until a chosen review time. Its agent may continue running independently.

**Source alert:** information about source availability or freshness that can affect several threads.

**Session alert:** an intervention or warning belonging to a particular thread, such as an approval request or conflict.

**Result alert:** a warning tied to a particular response or its evidence, such as a failed check or an older verified commit.

**Native terminal action:** a handoff to the original tool and environment, subject to the source's capabilities. Reading history, resuming a session and attaching to a live terminal are distinct capabilities.
