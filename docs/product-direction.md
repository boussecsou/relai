# Relai: current product direction

Updated 6 October 2026. This document supersedes the earlier direction based on composing messages and controlling agents from Relai.

## Vision and objectives

Relai is an open-source inbox for reviewing and managing the work produced by coding agents. Users work in their native tools and return to Relai to find results, understand their context and decide what needs attention.

The intended sources include agents on a user's computer and on servers. Codex, Claude Code, Pi and OpenCode have different session formats and integration capabilities. Relai should represent the information each source actually exposes.

1. Make completed results easy to find and review without losing unhandled work.
2. Surface questions, approvals, failures and incomplete results that require intervention.
3. Organize deliverables across agents and machines by project and workspace.
4. Make recurring reviews useful without filling the inbox with unchanged reports.
5. Preserve useful results, provenance and the user's decisions.

The first three use cases are the proposed starting scope. Recurring review behavior and long-term decision management are extensions whose priority and detailed rules still need confirmation.

## Session and conversation model

- A thread represents one native agent session, rather than an individual reply.
- The display title follows the native chat name. A separate stable source identity prevents renaming from creating another thread.
- The reader shows the user's messages from the native terminal and the agent's replies chronologically.
- Commands, tool events and output can be expanded without overwhelming the main conversation.
- A new response brings the thread back to attention and marks it unread.
- The first version has no Reply or Compose action. The user continues in the native tool.
- Opening or resuming that tool should return to the relevant session when supported. Reading saved history, resuming a conversation and attaching to a running terminal are distinct capabilities.
- Conversation forks and subagents retain their relationship to their parent. A conversation branch is distinct from a Git branch.

## Inbox management

Use familiar Gmail navigation: mailboxes, a session list, a thread reader, search, filters, stars, read states, handling and snoozing. Returning from a session should preserve the list's filters, position and focus.

Execution status and review disposition are separate. Ready, running, blocked, interrupted or unknown describe the source. Unread, in inbox, handled or snoozed describe the user's review state. A completed run is not evidence of correctness, and handling a result is not approval of a GitHub PR.

Private notes and export make the reviewed work reusable. Decisions such as retained, rejected or replaced are part of the longer-term direction; their full workflow is not implemented yet.

## Useful context

Show context when available, without inventing missing values:

- Source, machine, working directory and when the state was last observed.
- Repository, worktree, branch, response commit and current commit.
- Changed files, deliverables, PR state and CI information.
- Recorded check commands, outcomes, partial validation and results tied to an older snapshot.
- Agent, model, reported resource usage, permissions and observed tools or skills.
- Stable native identity, conversation fork, parent/subagent relationship and recurring review origin.

A disconnected source has an unknown current execution state even when its transcript remains readable. Changes in a shared checkout must not automatically be attributed to one agent. Reported resource estimates are not billing totals.

## Open architecture and behavior decisions

The collection and review focus requires a fresh architecture discussion. Earlier Rust, React, SQLite, Git CLI, Tauri and local-service documents are historical proposals or decisions for the previous scope.

Resolve how sources are connected, which events represent a new result, how histories are imported and reconciled, how stable identities and duplicate events are handled, and how local and remote data are stored and accessed. Native terminal access must declare capabilities per tool and environment.

Also define what happens when a new response arrives in a handled or snoozed thread, how recurring runs are grouped when they use different native sessions, and what constitutes a meaningful change in a recurring review.

## Current implementation

[index.html](../index.html) is a self-contained interactive prototype with 19 synthetic sessions. It demonstrates navigation, review management, conversations and context. Native connectors, live terminal access, GitHub actions, background reminders and production persistence have not been implemented.

See the [scenario guide](../design/relai-inbox/README.md) and [UI journal](../design/relai-inbox/CHANGELOG-UI.md). Use this document and the latest user decisions as the current product reference; historical specifications remain useful for understanding past work.
