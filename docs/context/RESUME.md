# Continue the new Relai inbox

Updated 6 October 2026. Working branch: `feat/relai-agent-inbox`.

Read [README](../../README.md), [product direction](../product-direction.md), [glossary](../../CONTEXT.md) and [prototype guide](../../design/relai-inbox/README.md).

The current interface is [index.html](../../index.html), a standalone editable HTML file. Use `make serve` to open it at http://127.0.0.1:4173 and `make check` for structural and optional JavaScript syntax checks. No production backend or native connector exists.

## Product decisions to preserve

- Receive and manage the work produced by agents in their native tools.
- One thread per native session, native chat title and separate stable identity.
- Show messages sent by the user from the native tool and the agent's responses.
- No Reply or Compose action in this version.
- Context for machine, repository, worktree, branch, response commit, PR and recorded checks.
- Execution status separate from user review disposition and read state.
- Local and server sources, with integrations based on actual per-tool capabilities.
- Gmail-inspired navigation, Codex blue, Claude orange, Pi purple, OpenCode grey, light/dark themes and responsive layouts.

The 19 scenarios, terminal illustrations and metrics are synthetic. Do not describe them as native integrations or real project validation. Browser storage is not production persistence.

## Continue with the user

Refine the inbox use cases and missing review behavior before choosing a production architecture. Record decisions in the product document and UI changes in [CHANGELOG-UI.md](../../design/relai-inbox/CHANGELOG-UI.md).

Historical SDDs, ADRs and exports remain references. The [previous continuation guide](relai-v1/RESUME-2026-10-05.md) is an archival snapshot; its old branch and interface paths are historical. The remote deletion of `design/relai-v1/` has been retained. Earlier sources remain in Git history and `docs/context/relai-v1/`.
