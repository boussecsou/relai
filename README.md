<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/logo-dark.svg">
    <img alt="Relai" src="assets/brand/logo-light.svg" height="64">
  </picture>
</p>

# Relai

An open-source inbox for the work produced by coding agents.

Work with your agents in their native tools, then use Relai to review their results, find the relevant context and decide what needs your attention. The product is intended to cover sessions on your computer and on servers, with a Gmail-inspired interface.

## Try the prototype

Open [index.html](index.html) in a browser, or run:

```bash
git clone --branch feat/relai-agent-inbox https://github.com/boussecsou/relai.git
cd relai
make serve
```

Visit **http://127.0.0.1:4173**. Serving the prototype needs Python 3; opening the HTML directly needs only a browser. Fonts, icons, styles and demonstration data are embedded in the file.

## Repository layout

```text
index.html            Self-contained interactive prototype
assets/brand/         Logos and favicon (light and dark variants)
design/relai-inbox/   Prototype notes, UI change journal, third-party licenses
docs/                 Product direction and project context
scripts/              Checks run by `make check` and CI
.github/              CI, issue and pull request templates
```

## What Relai is for

- Receive and review agent results, including deliverables and recorded checks.
- Find sessions that need an intervention: questions, approval requests, failures or incomplete work.
- Organize work by project, source, agent and workspace.
- Follow recurring reviews and highlight meaningful changes.
- Preserve useful results and the decisions made about them.

One thread follows one native session. Its title follows the native chat name, while its identity remains stable. The reader shows messages sent from the native terminal and the agent's responses. Further work continues in the original tool; this version has no Reply or Compose action.

Agent execution status and user review status are separate. An agent finishing a task does not mean its result has been reviewed. Repository, worktree, branch, commit, PR and test context help the user assess the work.

## Current status

**Interactive design prototype; native integrations are still to be built.**

The prototype includes 19 synthetic sessions for Codex, Claude Code, Pi and OpenCode, with local and remote examples. It covers completed work, active runs, permissions, questions, failures, conflicts, disconnected sources, retries, interrupted sessions and historical results.

Search, filters, stars, read states, handling, snoozing, bulk actions, private notes and transcript export are interactive. Browser preferences and review decisions persist locally. Light and dark themes and compact rows are available.

Git, diff and PR views are illustrations. The terminal button opens nothing in the prototype: it states which terminal action a real build would run and copies the resume command. The prototype starts no agent processes and makes no server or GitHub calls. Snoozing stores a review choice; it does not schedule a background reminder.

## Project documentation

- [Product vision, objectives and open decisions](docs/product-direction.md)
- [Current context and glossary](CONTEXT.md)
- [Guide for continuing development](docs/context/RESUME.md)
- [Prototype interactions and all demo scenarios](design/relai-inbox/README.md)
- [UI change journal](design/relai-inbox/CHANGELOG-UI.md)

The architecture for local and server sources remains to be designed.

## Development

```bash
make doctor   # inspect available development tools
make check    # check the prototype and documentation links
make serve    # serve index.html locally
```

The HTML is the current editable source; no build step is required. Python 3 serves the demo and runs structural checks; Node.js enables the optional JavaScript syntax check. There is no production application package or backend yet.

## Security and license

Please report vulnerabilities as described in [SECURITY.md](SECURITY.md).

Relai is licensed under [Apache 2.0](LICENSE). Embedded IBM Plex fonts and Lucide icons retain their respective [third-party licenses](design/relai-inbox/licenses/).
