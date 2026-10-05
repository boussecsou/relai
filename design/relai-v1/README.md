# Relai visual workspace

Open **index.html** in a modern browser. It is self-contained: CSS, JavaScript, IBM Plex fonts, Lucide icons and the Marked Markdown renderer are embedded. No Node, npm, Python, browser extension or installation is required to use it. You can also view and test it within Codex using the browser tools available there.

## What to explore

- Inbox: nine received Relais, including review requests and completed responses.
- Starred: four saved Relais from different projects and states.
- Pending: three queued or scheduled prompts, explicitly shown as not yet sent.
- Sent: two prompts, distinguishing acceptance from completion.
- Drafts: three initial composer drafts. New saved composers and unsent conversation replies appear here too.
- Sessions: seven **native agent sessions**, rather than prompt titles. Open one to see its associated Relais. A Relai is an independently titled prompt sent to a session; several Relais can use the same session.

Choose an existing session or a coding agent plus a local folder in **Compose relai**. Agents use consistent colors. Folder choices include favorites, recently used example paths, and a separate chooser with an editable absolute path; Linux and Windows path formats are accepted.

The folder browser is a simulation. A standalone web page does not silently inspect the computer's directories or installed agents. Actual filesystem discovery, terminal startup, delivery and Git operations would need the local Relai service. None occurs in this design preview.

## Preferences and drafts

Use the theme button or Settings → Appearance for Light, Dark or System. Density can be Comfortable or Compact. Settings also has agent command examples, favorite folders, keyboard shortcuts and an optional tool rail. Design notes are accessible from that rail. Read/star states are persisted in this browser; selection enables bulk actions. Commands are never executed.

Composer drafts, replies, folder preferences and theme choices are stored in the browser when local storage is available. They are not synchronized with real agent sessions. File-URL storage behavior depends on the browser and file location; use the same location when replacing the HTML. The draft keys from the preceding preview are imported when available. If storage is unavailable, the UI reports tab-only retention.

Conversation navigation, fixed Reply, pop-out windows and browser Back/Forward remain available. Browser pop-up permission may be needed for Open in new window.

## UX/UI decision journal

UX-NOTES.md records the current constraints and design choices. CHANGELOG-UI.md maps every audit improvement to its purpose and validation. DESIGN-NOTES.md is the English version embedded in the Notes panel. Historical decisions and the previous interface are preserved under audit/. Desktop is the priority; the existing mobile layout is retained.

## Editing the preview

The supporting source files are app-shell.html, app.css, app.js and app-icons.json. build-preview.py combines them with the existing fonts and licenses into index.html. Python is used only for rebuilding while editing, not for opening the finished HTML. The preceding version is retained as previous-interface.html. The repository application remains unchanged.

## Validation

Verified browser behavior covers populated mailboxes, native-session grouping, colored selectors, recent/custom folders, safe Markdown preview, composer and reply drafts, reloading, minimize/expand, preferences, dark theme, pop-out conversations and history. Controls and selection menus were checked at 320/390/768px. Primary and Cancel button text has contrast above 4.5:1 at both gradient endpoints in light and dark themes; this is not a claim of a full accessibility audit.

Marked 17.0.5 is bundled under vendor/ with its MIT license. Licenses are retained under icons/LICENSE and fonts/IBM-Plex-OFL.txt and embedded in the standalone HTML.

## Integrated session workspace

Open a conversation → Session workspace, or Sessions → choose a session → Session workspace. Six sections expose connection, activity, sample terminal output, next-prompt settings, skills and agent profiles. Settings → Agents also opens profiles.

All native operations remain simulated. Model values are examples. Overrides are stored by native session ID in a separate browser key; connection/activity/skill demo state lasts for this tab only. The standalone index.html embeds runtime.js and runtime.css along with the existing sources. No dependency is needed to open it. The previous UI and new validation evidence are retained under audit/.
