# Relai composer — navigation decisions

This remains a standalone design prototype. No prompts, terminals or Git operations run.

## Research and applied patterns

The WAI-ARIA dialog pattern and MDN documentation were read through their official GitHub source repositories. Direct access to the W3C and Gmail support websites was blocked by the environment; Gmail documentation was not used as verified evidence. No third-party GitHub skill was installed.

| Reference | Applied behavior |
| --- | --- |
| [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — [source consulted](https://github.com/w3c/aria-practices/blob/main/content/patterns/dialog-modal/dialog-modal-pattern.html) | Named dialog; focus starts at the window header; Tab and Shift+Tab remain inside; Escape saves and closes; closing returns focus to the opener. |
| [MDN dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) — [source consulted](https://github.com/mdn/content/blob/main/files/en-us/web/html/reference/elements/dialog/index.md) | Native modal dialog and inert background; reduced composer closes the modal and becomes a nonmodal restoration dock, so the inbox is usable. |
| [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — [source consulted](https://github.com/mdn/content/blob/main/files/en-us/web/api/window/localstorage/index.md) | Draft fields save on input/change and restore after reload. If storage is unavailable, the UI reports tab-only retention. Storage belongs to this browser origin; direct file URL behavior varies. |
| [Lucide icons](https://github.com/lucide-icons/lucide) | One SVG icon set, consistent stroke and size, named buttons with tooltips. License retained in icons/LICENSE and embedded in the standalone HTML. |

## Window behavior

- Normal: compact dialog with scrollable form, persistent window controls and bottom actions.
- Expanded: larger editing area; the same expand control restores the normal size.
- Minimized: saves the draft and shows a compact dock. The inbox remains usable. Restoring keeps the destination, agent, folder, Relai title and Markdown text.
- Closed: saves the draft. Reopen with Compose prompt or Drafts. Cancel currently behaves as close-with-save; nothing is discarded.
- Keyboard: Escape saves/closes; Ctrl/Cmd Enter submits the preview; Alt Enter toggles size; Ctrl/Cmd Shift M minimizes while editing.
- The preview supports one saved composer draft, with existing-session and new-session destination modes.

## Visual decisions

Agent colors identify the sender through the name and avatar. The strong colored left border has been removed. The subtle message and editor gradients remain. Secondary buttons explicitly use dark text on a light background.

## Verified

Browser checks cover draft restoration after minimize/close/reload, both size states, Markdown preview, Cancel contrast, reachable controls on a 390px viewport, Tab containment, and Escape. This is functional browser evidence, not a complete screen-reader or accessibility audit.

## Suggested next refinements

1. Rename Cancel to Save & close to make the current draft-preserving behavior explicit.
2. Add a separate Discard draft action, with confirmation only when text would be lost.
3. Offer multiple saved drafts with a small destination/title list once that workflow is needed.
4. Keep resizing to two reliable presets; add free resizing only if user testing shows a need.

## Session and Relai model

- Sessions lists native agent conversations, identified by agent, native name, local folder and terminal state.
- The Inbox lists Relais: independently titled prompts directed to those sessions.
- The example contains six native sessions and eight Relais. Three distinct Relai titles share the Codex session “Relai interface”.
- Choosing another session or switching creation modes preserves the typed Relai title. The Title input is not populated from a native session name.
- Unread is an additional compact filter. Status tabs and agent/terminal/sort controls share one toolbar on wide screens.
- IBM Plex Sans and Mono are embedded from the experimental repository assets. Their OFL license is retained in fonts/ and the HTML.
- Cancel is retained as requested.

## Conversation in three blocks

- Fixed navigation block: back/close, title, session/Git context, conversation search and message navigation.
- Scroll block: separate message cards; older messages start collapsed, latest response starts open. Clicking a message header or its preview expands it.
- Fixed bottom block: Reply opens the Markdown editor on demand. Minimizing or closing it preserves a local draft specific to that Relai.
- Open in new window uses the same standalone HTML and a conversation route; it shows no global header, sidebar or tool rail. Focus is removed from the conversation controls.
- Browser Back/Forward and reload restore the selected conversation via its fragment. A title receives initial focus; reply controls remain accessible at any scroll position.
- Verified fixed control positions before/after scrolling; Markdown preview; collapsed-message navigation; reply draft restoration; actual popup creation/closure; browser history; 390px mobile layout; composing/session-picker regressions. No backend actions run.
