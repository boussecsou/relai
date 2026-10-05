# Design notes

## 4 October 2026 — Audit improvements

Desktop is the current priority. The existing mobile layout is retained without a mobile redesign. This remains a visual prototype: no agents, terminals, prompts or Git commands run.

### Reading and identity

- Keep the Gmail-inspired workspace, compact sidebar and subtle button gradients.
- Increase useful reading text: 13px Relai titles, 14px Markdown and prompt input, 11–12px metadata. Keep Compose relai compact.
- Strengthen secondary text in light mode; distinguish panels, menus and active choices in dark mode.
- Keep Codex blue, Claude orange and OpenCode grey. Names accompany colors.
- Give unread markers a stable position. Align titles and move project/status tags into a secondary context line.
- Remember read states and stars in this browser. Offer Mark unread and bulk read/unread/star actions.

### Navigation

- Return to the actual mailbox or native session, with the original scroll and keyboard focus.
- Keep conversation navigation at the top and Reply/Back at the bottom.
- Show active filters and a visible Clear action. Restore mailbox/filter routes on reload.
- In conversation search, highlight matching words and cycle only matching messages. Show result position and a clear button.
- Recalculate Expand all/Collapse all after individual message changes.

### Composition and native sessions

- Keep Existing session and New session as two direct choices, with no wizard.
- A session is the agent's native conversation. A Relai is a titled prompt sent to it; several Relais can share a session.
- Native session tabs describe terminal activity. The Relais inside a session keep their review/completion filters.
- Show session identifiers, local paths, latest activity and unread counts. Include same-name sessions and folders in the examples.
- Group local folders into Favorites and Recent. Allow custom paths and an additional folder action in the menu.
- Make resumed drafts explicit and provide New Relai without losing the previous draft.
- Show the destination near Send prompt. Explain when a closed session will resume or activity is unknown.
- Keep Cancel; it closes and preserves the draft. Export drafts as Markdown for a portable copy.
- If browser storage is unavailable, report that text is retained only in this tab.

### Markdown and Git

- Use one bundled Markdown renderer for previews and received messages.
- Support links, tables, task lists, headings and language-labelled code blocks with Copy.
- Display raw HTML as text; remove unsafe link protocols. Do not load remote images automatically.
- Git context belongs to the working folder. Shared sessions use the same branch; separate worktrees are identified.
- Display shared-folder notices, changes, a sample snapshot time and a no-repository state. The Git detail also previews detached HEAD, branch changes, conflicts and stale snapshots. Do not attribute all file changes to one conversation.

### Controls and preferences

- Preserve keyboard focus after preference changes and expose selected states to assistive technology.
- Use visible focus rings, consistent icons and tooltips for icon buttons.
- Reveal More projects only when there are more than four projects.
- Make agent names in the sidebar usable filters and the Search filters icon functional.
- Keep the optional tool rail hidden by default; show it from the header or Settings. Notes remain accessible here.
- Respect reduced-motion preferences.

### Verification and boundaries

Browser checks exercise read/star persistence, bulk actions, filtered routes, contextual returns, search, Markdown safety, composer drafts, export, native sessions, Git context, settings focus and actual pop-out conversations. Light/dark and narrow layouts are checked for regressions. Real mobile keyboards, screen readers and user studies are still future validation work.

The full French decision journal is saved alongside the prototype as UX-NOTES.md and CHANGELOG-UI.md. No user installation is needed to open index.html; the fonts, icons and Markdown renderer are embedded.
