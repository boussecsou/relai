# Continue Relai development

Updated 9 October 2026. Design branch: `feat/relai-agent-inbox`; baseline publication branch: `feat/relai-agent-inbox-baseline`.

Start with the [documentation index](../README.md), [product direction](../product-direction.md), [glossary](../../CONTEXT.md), [UI rules](../ui-guidelines.md), [use cases](../use-cases.md) and [ADR register](../adr/README.md).

## What exists

[index.html](../../index.html) is the editable standalone UI reference. Use `make serve` at http://127.0.0.1:4173 and `make check` for the prototype and documentation. It contains 19 synthetic sessions, two navigation snapshots, details on demand, chronological exchanges and local review decisions.

There is no native connector, Rust package or production storage yet. Commands, PRs, Git, resources and checks are illustrative. Browser storage is prototype persistence; snoozing schedules no background work.

## Rules to preserve

- One thread per native session; stable identity distinct from mutable title.
- Latest prompt and response chronological, earlier exchanges above and intermediate updates expandable.
- Result covers the selected response; Activity the session; Context the environment. Details are closed on entry.
- Execution, review disposition, read state, stars and verification remain independent.
- Missing data stays missing. History is not evidence of a live source. Shared workspace changes are not automatically attributed to one agent.
- Work continues in the native tool; no Reply or Compose or embedded terminal in this scope.
- Source/session/result alerts follow their scope and do not repeat under every message.
- Core Rust, launched locally by command, browser interface. Frontend, storage and transport remain open.

## Next

Use the [implementation plan](../implementation-plan.md) for the first local slice. Decide the first adapter and its capabilities before real imports/actions. Record production evidence separately from synthetic UI checks.

Read [integration preparation](../integration.md) before publication: main was emptied at 53c1887; an ordinary merge can lose licences and other unchanged files. Baseline publication through a PR is now authorized; the maintainer will review and merge it. The original design workspace remains intact. Follow [issue #12](https://github.com/boussecsou/relai/issues/12) for publication status.
