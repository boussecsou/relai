# Codex delivery — implementation and verification

Revision: 2026-09-30. This document describes the implemented delivery increment and supersedes statements that sending, queues and scheduling are deferred in the earlier passive-only revision.

## Native contract

The adapter targets installed Codex CLI **0.159.x**, verified against 0.159.0's locally generated app-server schema and the [official app-server reference](https://learn.chatgpt.com/docs/app-server). Relai launches `codex app-server --listen stdio://` lazily when an actual delivery executes. It initializes the JSON-RPC connection, sends the `initialized` notification and correlates request IDs. Each configured Codex source uses its own inherited `CODEX_HOME`; no credentials are copied into Relai or browser storage. Existing model and approval policies apply.

New destinations use `thread/start`, persist the returned thread ID, set the native name, then call `turn/start`. Existing destinations use `thread/resume` with the same native ID. Relai never forks implicitly or attaches to an external terminal. The status shown is the managed engine's status; external CLI activity remains unknown. Opening histories, receiving events, browsing folders and editing drafts do not start an app-server. Claude Code, OpenCode and Pi remain read-only.

Native thread/turn/item IDs are persisted separately from Relai delivery IDs. The first managed resume stores a baseline of the passively read history; later live user/agent items use native identities. The reader combines this baseline with managed items without merging by text or appending the native transcript a second time. External edits made after this baseline are not merged into the managed reader; simultaneous use of the same native thread from an external CLI is not coordinated. This is a current limitation, not evidence that an external process is idle.

## State and recovery

Submission requires draft ID, revision and idempotency key. A transaction freezes the prompt/destination metadata, stores a delivery and consumes the draft. Retrying the same submission returns the same delivery; mismatched revisions/schedule data conflict. Native acceptance is distinct from completion. Attempts retain their acknowledgement and error data.

Queued work is FIFO per native session, ordered by entry into the queue. At most one delivery for a session runs in the managed engine. Different sessions may run concurrently in the same folder; there is no repository lock. A failed, stopped or uncertain delivery suspends only its session until an explicit recovery action. Retry starts a new attempt; Skip releases the queue; Cancel restores the frozen message as a new draft. Pending delivery edits use optimistic revisions and retain local text on conflict. Active work must be interrupted from its conversation.

The scheduler stores UTC milliseconds plus an IANA zone. The UI rejects past, nonexistent and common ambiguous local times at clock changes. The process must be running for on-time execution; this increment does not install an OS daemon or wake the machine. At startup, overdue scheduled messages become Missed, with explicit Send now, Reschedule or Cancel. Queued work resumes. Dispatch past the native-send boundary without a saved final outcome becomes Uncertain and is never replayed automatically.

Verification reads a saved native thread/turn and accepts only a terminal outcome. Without a saved native turn ID, history must be inspected manually. Explicit resend requires acknowledgement of possible duplicate work. Browser refresh, SSE reconnection and snapshot polling cannot trigger delivery. Service shutdown requests managed turn interruption and terminates only its own app-server process groups. A single-owner file lock prevents two services dispatching from the same data directory.

## Returns and interactions

Final answers, questions, approvals and terminal errors create received Inbox entries. Progress, plans, commands and diffs remain in Activity and Changes. The GUI exposes command/file approvals, permission requests, native user-input questions and basic MCP elicitation forms. Decisions are correlated with the original live process and accepted once; expired requests cannot be answered. Requested permission grants are limited to the native requested set and turn scope. Unsupported native tool/auth callbacks receive an explicit protocol error, never automatic permission.

MCP form support covers basic string, number, integer, boolean and enum fields; complex schema forms and full interactive terminal commands are outside this increment. API validation checks required fields, basic types and enum values. The server preserves native policies, but GUI rendering does not replace the harness's own sandbox or permission system.

## Mailboxes and search

Inbox contains managed returns grouped by conversation, never imported native histories. Sent requires a saved native acceptance. Drafts contains editable drafts; Queued contains pending, preparing, failed and uncertain deliveries; Scheduled contains future and missed schedules. Sessions is the passive catalogue. Favorites and archives remain conversation annotations.

One parser serves all mailboxes. `in:` chooses one scope; `inbox:auth` chooses Inbox and searches `auth`; `envoyer:auth` chooses Sent. Quoted phrases are single terms; terms and filters combine with AND. Supported filters are `agent:` (case-insensitive exact tool), `folder:` (path prefix), `branch:` (exact branch), `label:` (ID or case-insensitive name), `is:unread` and `is:starred`. Unknown colon terms remain literal text; conflicting scopes, malformed quotes and invalid recognized filters return visible errors. The result header shows the resolved scope. This is a Gmail-inspired subset, not full Gmail search syntax; see [Gmail's operators](https://support.google.com/mail/answer/7190?hl=en).

Catalogue content uses the native/managed FTS index. Drafts and delivery searches use frozen prompt metadata; Inbox uses received text. Pages are bounded at 100 rows, conversation history at 50 messages, Activity at the latest 300 items and interaction history at 50 requests. Folder browsing lists up to 100 directories per page, enumerates at most 10,000 entries, respects a canonical browsing root and does not launch commands. Recent and detected folders provide suggestions; unavailable paths remain visible as unavailable.

## API and storage

The existing loopback cookie/origin/host protections remain in effect. New routes:

| Route | Operation |
| --- | --- |
| `GET /api/v1/mailbox` | Parsed scoped search and bounded pagination |
| `POST /api/v1/deliveries` | Idempotent submission from a saved draft |
| `GET/PATCH /api/v1/deliveries/{id}` | Delivery/attempt history and revision-checked pending edits |
| `POST /api/v1/deliveries/{id}/actions` | Cancel, skip, retry, send now, reschedule, reconcile, explicit resend |
| `GET /api/v1/sessions/{id}/activity` | Native items, pending requests and delivery queue |
| `POST /api/v1/sessions/{id}/interrupt` | Interrupt a managed native turn |
| `POST /api/v1/requests/{id}/respond` | Correlated explicit interaction response |
| `GET /api/v1/folders` | Suggestions or bounded directory navigation |
| `GET /api/v1/events` | Replayable durable changes plus live notifications and resync |

The additive SQLite migration creates deliveries, attempts, baseline history, runtime items, received entries, native requests, recent folders and event log. Legacy drafts deserialize missing source/branch fields as empty. Existing annotations, preferences, labels and histories remain intact. SQLite is the source of truth; reconnect uses snapshots and event IDs instead of reconstructing execution from browser state.

## Verification boundaries

Rust tests cover native parsing, 10,000-row pagination, labels/FTS, draft conflicts, additive migration, recovery, mailbox syntax and populated mailbox content. Protocol fixtures exercise native-ID continuation, idempotency, FIFO, independent same-folder work, native interactions, interruption, due/missed schedules, acknowledgement loss and abrupt restarts. A 25-session fixture run verifies concurrent delivery; timings are local observations only.

A real Codex 0.159.0 smoke run completed two text-only turns in one new native thread in a disposable working folder. It verified new-thread delivery and same-ID continuation without project operations. Approvals, provider failures and crash scenarios are fixture-tested; this does not claim all real provider/tool paths were tested.

Browser tests exercise passive navigation, Markdown round trips, draft recovery, folder navigation, search, sending, native approval cards and scheduling/cancellation. Rendered checks cover dark/light themes, reduced motion, keyboard tabs, 390–1920 px layouts, long titles/URLs and a 683 × 450 CSS-pixel viewport at device scale 2 to reproduce reflow equivalent to 200% browser zoom from 1365 × 900. This follows the [W3C explanation of equivalent CSS viewport widths](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html); actual browser zoom controls and screen-reader testing remain unverified, as do field Core Web Vitals. The build reports a lazy rich-editor chunk of roughly 514 kB minified (163 kB gzip); it loads only when the editor is needed. No universal accessibility or performance certification is claimed.

Final verification record: 12 Rust tests passed; TypeScript checking, frontend build, Cargo formatting, Prettier and release build passed. Passive browser E2E, delivery fixtures and messaging browser flows passed. The final 25-session fixture run completed in 9.84 seconds while other verification work was running; the final 10,000-row pagination test observed 141 ms. These are observations from this machine, not production budgets. The embedded release preview on port 4179 opened with 0 Inbox conversations, 229 detected histories and 0 browser errors; it started no native engine during browsing. The preceding preview binary and SQLite state were backed up in `/tmp` before replacement. Disposable screenshots and fixture directories are temporary local verification artifacts, not exported native conversations.
