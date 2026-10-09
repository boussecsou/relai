# Relai documentation

Updated 8 October 2026. This repository contains the UI prototype and the handoff for the first implementation. Notion tracks operational work; these files keep the product rules reviewable with the code.

## Read in this order

1. [Product direction](product-direction.md): scope and confirmed constraints.
2. [Domain glossary](../CONTEXT.md): source, session, thread, result and snapshot.
3. [UI guidelines](ui-guidelines.md): visual rules, reader template, alerts and interactions.
4. [Use cases](use-cases.md): coverage of the 37 scenarios; simulation is distinct from UX validation.
5. [Decision register](adr/README.md): accepted principles and unresolved architecture choices.
6. [Implementation plan](implementation-plan.md): the first development slice and its acceptance criteria.
7. [Integration preparation](integration.md): publication of the new baseline into the currently empty main.

## Ownership of information

- Product behavior belongs in product direction, use cases and SDDs.
- Visual and interaction rules belong in UI guidelines. Historical findings stay in the [UI journal](../design/relai-inbox/CHANGELOG-UI.md) and [audit](../design/relai-inbox/AUDIT-DETAIL.md).
- Durable decisions belong in `adr/`; proposals retain their unresolved alternatives.
- Task status, owners, schedules and UX observations are maintained in [the Relai Notion project](https://app.notion.com/p/3eaeba09656f807eb461d437c9cd06fd).
- Update affected local documents and Notion when a rule changes. State whether evidence concerns synthetic UI behavior or a native integration.

Do not recreate the removed v1 Compose/Reply specifications. The current product reviews native sessions; work continues in the original tool.
