# Experimental workspace edition

Branch: `experimental/relai-workspace`.

## Baseline and isolation

The work started from `prototype/glass-mail-reader` at `897ec16`. The existing, uncommitted native application and documentation were inspected and preserved as a separate baseline commit before the redesign. `main` remains at `9dd563de60af7ee7d99d1bf420fa7cdfafee574a`.

The experiment uses the same repository rather than a fork: this keeps provenance and existing development history while isolating all new commits. No merge to main is part of this work. The README uses an independent runtime directory and port so experimental state need not mutate an existing installation.

## Product decisions

The primary task is moving between agent conversations and deciding what to do next. The visual direction is a quiet workspace: graphite or warm white surfaces, green for selection and primary actions, Manrope for headings, IBM Plex for body text and code. Fonts are served locally.

Navigation has three regions: mailboxes, the conversation library and local sources. Starred and Archived are visible without an extra disclosure. Source counts report discovered histories, not inferred agent activity. Filters remain available with zero results. Empty states explain the next useful action, and refreshing an empty mailbox does not replace it with a skeleton every five seconds.

Reading uses a list/detail split above 1100px and a single pane below it. Focus mode hides the list; terminal input also receives the full width. Native histories remain separate from received managed replies. Existing compose, scheduling and approval contracts are retained.

The command palette uses a native modal dialog and a combobox/listbox interaction. Focus returns to its invoker before a selected command opens its next surface. Mobile navigation is inert when closed and contains keyboard focus while open. Single-key shortcuts do not intercept editors or terminals.

Mailbox state is encoded in the URL fragment. The service never receives that fragment in an HTTP request. Reload restores mailbox, search, agent and label; browser Back/Forward restores those views. A conversation selection is intentionally transient. This is local navigation, not a mechanism for sharing private histories with other users.

## Architecture

Shared domain types, date/path formatting and the authenticated API retry boundary now live in `apps/web/src/lib`. Messaging and terminal controls use the same client as the workspace. Navigation, empty states, commands and rendering primitives live in `components`. The root component still owns draft persistence and cross-surface transitions; delivery/runtime logic remains in its existing backend modules.

`style.css` owns the base controls and existing messaging surfaces. `workspace.css` defines the experimental shell and its component styles. This boundary allows the experiment to evolve without changing the protocol contract. A future pass can extract composition and delivery views when their state ownership is made equally explicit.

Rust is pinned with `rust-toolchain.toml`; Cargo and npm lockfiles are committed. Node 22 is declared in `.nvmrc`. CI runs with read-only repository permissions and official actions pinned to commit SHAs. Dependency update configuration targets the experimental branch; [GitHub reads Dependabot configuration from the default branch](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file), so activation is not assumed here.

## Verification

`bash scripts/check.sh` is the local and CI entry point. It covers:

- Tracked-file credential and private-runtime-file checks.
- Prettier, strict TypeScript including unused declarations, production frontend build.
- Rust formatting, Clippy with warnings denied, Rust tests and native compilation.
- Passive histories/drafts/labels, delivery FIFO/recovery, messaging, terminal, native permissions, OpenCode, agent filters and the new workspace suite.

The workspace test uses synthetic API responses and captures safe screenshots. Real HTTP/SSE, SQLite and PTYs are covered separately by the integration fixtures. It checks command selection, focus return, URL restoration, browser Back, filtered emptiness, split/focused reading, light/dark themes, widths 320/390/768/1024/1920, and axe WCAG A/AA rules. Automated scans do not establish full WCAG conformance; a real screen-reader assessment remains unperformed.

One terminal close assertion failed during the initial environment verification, then passed on subsequent runs. The test now checks the release response body before asserting that the panel closes, so future failures provide a useful server error. Five consecutive diagnostic runs passed; no speculative runtime fix was applied without a reproducible failure.

The delivery concurrency fixture originally relied on a three-second timer. A full validation under build load exposed that race. Its FIFO, interrupt and recovery scenarios now use explicit file gates, so the assertions remain meaningful on slower CI workers.

Real provider sends are opt-in and were not performed. The Codex adapter remains explicitly limited to CLI 0.159.x. Synthetic throughput measurements are fixture observations, not a general performance guarantee.

## Completed validation

On 3 October 2026, the final build passed all 12 Rust tests and all eight browser/protocol suites. Prettier, strict TypeScript, `cargo fmt`, and Clippy with warnings denied passed. Both development and release builds completed. The standalone release was launched on port 4192 with isolated Relai storage, returned HTTP 200, and its served index matched the frontend build exactly.

The 25-session test retains its completion assertions with a 60-second ceiling for the load phase, while reporting observed throughput. Compiling a release and running this load fixture concurrently exhausted earlier timing budgets; the standard validation path runs builds and browser tests sequentially.

The final visual review covered composition on mobile and desktop, populated inboxes, the split reader and the command palette. Generated screenshots in `docs/images` contain synthetic fixtures only. The lazy rich-editor bundle still emits Vite's 500 kB chunk advisory; it is loaded when composing rather than on initial inbox startup.

## References used

- [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): modality, focus containment and focus return.
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing): axe integration and the limits of automated scans.
- [Rust installation](https://rust-lang.org/tools/install/): isolated toolchain setup for a reproducible build.

Earlier product specifications remain in `docs/sdd` as the evolution of the product. This document records the experimental interface decisions without rewriting that history.
