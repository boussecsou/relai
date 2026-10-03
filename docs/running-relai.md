# relai

A local, open-source interface for managing coding AI agents like an inbox. Messages target an existing harness session or start a new one in a selected working directory.

The interface runs in a browser. Agent replies, questions, and approval requests appear as inbox messages, with file changes presented as attachments.

New session uses a destination, chat title, and Markdown prompt; Reply continues an existing session with a Markdown prompt. Available harnesses and active sessions should be discovered automatically; discovery and control capabilities vary by harness and remain under design. See the [compose draft](../docs/sdd/0001-compose-message.md).

## Status

**In development — native GUI and Codex sending available for Linux/WSL.** Empty Inbox, passive discovery, readable histories, labels, favorites/archives, persistent Markdown drafts, per-session delivery queues and one-off scheduled sends. Browsing and drafting start no agent. Sending starts a Relai-managed Codex engine; replies, approvals and questions arrive in Inbox.

Discovery covers Codex, Claude Code, OpenCode and Pi histories in the current user's Linux/WSL environment. Only Codex can send, using the installed **Codex CLI 0.159.x** app-server protocol. Other versions fail with a compatibility message. Graphical sending remains unavailable for other harnesses; installed native CLIs can be opened in the same recorded chat. Continuing a detected Codex chat resumes its native thread ID in the managed engine; it does not control an external CLI process, whose activity remains unknown. The native Rust service embeds a TypeScript/React UI and stores Relai state in SQLite. MCP, Windows-wide discovery, packaging and Docker remain future work. See the [installation specification](../docs/sdd/0004-local-installation-and-api.md).

An interactive [inbox design mockup](../design/README.md) uses fictitious data to explore the UI/UX. It is separate from the native graphical app. See the [visual direction draft](../docs/sdd/0005-inbox-ui-ux.md).

See [product direction](../docs/product-direction.md) for confirmed requirements and open decisions, and [CONTEXT.md](../CONTEXT.md) for the project glossary.

## Run the graphical app

Build requirements: Rust stable, a C compiler for bundled SQLite, Node.js 22 and npm. Node is only needed to build the frontend.

~~~sh
npm ci --prefix apps/web
npm run build --prefix apps/web
cargo build --release
RELAI_DATA_DIR=.relai-data ./target/release/relai
~~~

Open **http://127.0.0.1:4179**. The service binds to loopback only. The release binary embeds the UI. Its default data directory is XDG_DATA_HOME/relai (or ~/.local/share/relai); RELAI_DATA_DIR overrides it. The debug build defaults to .relai-data in the working directory. Keep the configured data directory for drafts, labels and preferences. An empty data directory creates an empty Inbox without examples or running sessions.

Sessions uses CODEX_HOME, CLAUDE_CONFIG_DIR, XDG_DATA_HOME / OPENCODE_DB and PI_CODING_AGENT_SESSION_DIR. Configure roots in **Sources and discovery → Configure sources**. RELAI_SESSION_ROOTS accepts a JSON array of objects with tool and absolute path; by default it extends native roots. RELAI_DISCOVERY_ISOLATED=1 uses only these roots. RELAI_PORT changes the port. Multiple Codex roots can be selected when composing; their existing authentication, model and native policies apply. RELAI_CODEX_BIN optionally selects an executable.

Imported histories appear in **Sessions**; only returns from managed work enter **Inbox**. Compose opens as a centered modal with a blurred backdrop, keyboard focus containment, persistent drafts and an expanded view. IBM Plex Sans Regular and Plex Mono are served locally under the included OFL license. Agent filters stay visible in every mailbox, including empty results. Inbox categories separate All, Needs attention and Replies. Send acknowledges native acceptance separately from completion. Queued prompts run FIFO within a session; independent sessions may share a folder. An error suspends only that session's queue. Stop interrupts a managed turn. Activity and Changes expose native progress and diffs; approval/question cards require explicit responses.

**Native terminal:** Open a conversation, then choose **Open terminal**. A real PTY runs the installed CLI. Codex 0.159.x shares Relai’s existing app-server through a private Unix WebSocket bridge; Claude resumes its native ID with per-invocation hooks; OpenCode uses an authenticated local server plus `attach` to the exact native ID. Pi is available only when installed. Closing the panel or browser leaves the process running. One browser tab controls input; others observe and can explicitly take control. **Close terminal process** closes that CLI; **Stop** in Codex Activity interrupts its managed turn.

Automatic delivery for that chat pauses while terminal mode is active. Due schedules become queued; other chats continue. Use **Return to automatic sending** when the native turn has finished. This closes the CLI before releasing the queue. Terminal ownership survives a service restart until explicitly released. Screen buffers and output channels are bounded; reconnect restores the current screen, while native conversation history stays on disk. Reconnect does not restore the entire terminal scrollback. Claude hooks have native coverage limits and fall back to CLI prompts; OpenCode permission races are resolved by the native API. Unsupported OpenCode store layouts are rejected rather than resumed in another store. See the [terminal contract](../docs/sdd/0006-native-terminal.md).

Schedules require a future local date and time, stored as a UTC instant with its IANA time zone. Keep the service running for execution. After downtime, missed schedules require **Send now**, **Reschedule** or **Cancel**. Lost acknowledgement or interrupted delivery becomes **Delivery uncertain**, with native verification and an explicit duplicate-risk confirmation before resending. Cancel restores a draft. Database migrations preserve existing drafts and labels; only one process may own a data directory.

Search supports `in:inbox`, `in:sent`, `in:drafts`, `in:queued`, `in:scheduled`, `in:sessions`, `in:starred`, `in:archived`, plus `inbox:term` and the French alias `envoyer:term`. Quoted phrases and ordinary terms combine with AND. Filters include `agent:`, `folder:`, `branch:`, `label:`, `is:unread` and `is:starred`. Contradictory scopes and malformed quotes show errors. Native schema mismatches and unavailable histories produce partial discovery or reading errors. JSONL reading caps histories at 64 MiB and records at 1 MiB.

For frontend development, run the service on 4179 and npm run dev --prefix apps/web on 4178. Rebuild the frontend before compiling a release binary.

## Verification

~~~sh
cargo test -- --nocapture
npm run check --prefix apps/web
npm run build --prefix apps/web
cargo build
npx --prefix apps/web playwright install chromium
npm run test:e2e --prefix apps/web
npm run test:delivery --prefix apps/web
npm run test:messaging --prefix apps/web
npm run test:terminal --prefix apps/web
npm run test:permissions --prefix apps/web
npm run test:opencode --prefix apps/web
RELAI_UI_URL=http://127.0.0.1:4179 npm run test:filters --prefix apps/web
~~~

The passive browser suite uses port 4181 and disposable histories. The delivery suite uses 4182 and a fake app-server to test FIFO, concurrent sessions, acknowledgements, approvals/questions, stop, schedules, crashes and recovery. The terminal suite uses 4185 to verify PTY input, two-tab control, screen restoration, responsive layouts and paused scheduled delivery. The native permission suite uses 4187 and a disposable Claude CLI fixture. The OpenCode suite uses 4188 and an authenticated HTTP/SSE plus CLI fixture. The filter suite checks four agents across eight views with empty results. The messaging browser suite uses 4184 to exercise composition, folder navigation, search, approval, scheduling, dark/light responsive layouts and keyboard tabs. RELAI_CHROMIUM selects an existing Chromium executable. The 10,000-row Rust test and 25-session fixture run measure local behavior, not universal performance.

`npm run test:native --prefix apps/web` is an **opt-in real Codex smoke test** on 4183: it uses your configured model/authentication, may incur provider usage, creates a new native chat in a temporary folder and sends two text-only prompts. It verifies new-thread delivery and continuation of the same native ID. Do not run it against unrelated existing chats.

See [Codex delivery and verification](../docs/research/codex-delivery.md) for the protocol, recovery contract and remaining verification limits.

See the [UI revision](../docs/sdd/0005-inbox-ui-ux.md), [catalogue decision](../docs/adr/0003-passive-catalogue-and-blank-inbox.md) and [research](../docs/research/gui-and-session-discovery.md).

## Security

Please report vulnerabilities privately as described in [SECURITY.md](../SECURITY.md). Never post credentials, private messages, or customer data in issues or pull requests.

## License

Apache License 2.0. See [LICENSE](../LICENSE).
