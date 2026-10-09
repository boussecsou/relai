# Repository Guidelines

## Project Structure & Module Organization

Relai is currently a self-contained interactive prototype, not a production app. `index.html` contains the editable interface, styles, scripts, and demo data. Keep it dependency-free unless the project architecture changes. Brand assets live in `assets/brand/`; prototype notes and interaction details are in `design/relai-inbox/`; product direction and development context are in `docs/` and `CONTEXT.md`. Utility checks are in `scripts/`. There is no separate test directory or backend.

## Build, Test, and Development Commands

- `make serve` starts a local server at `http://127.0.0.1:4173` (Python 3 required).
- `make check` checks HTML structure, brand asset consistency, inline JavaScript syntax when Node.js is available, and Markdown links.
- `make doctor` reports available development tools.
- `make design` is an alias for `make check`.

No build or package installation step is required. Opening `index.html` directly in a browser is also supported.

## Coding Style & Naming Conventions

Follow the existing conventions in `index.html`: use clear, descriptive names, consistent indentation, semantic HTML, and accessible labels and states. Keep demo content synthetic. For assets, use lowercase kebab-case filenames and provide light/dark variants where appropriate. Keep documentation concise and update the prototype notes or UI change journal when behavior or design changes.

## Testing Guidelines

There is no dedicated test framework or coverage target. Run `make check` for changes to the prototype, assets, or Markdown. Review interactive changes in a browser at desktop and narrow viewport sizes, including relevant empty, error, and theme states. Do not describe illustrative prototype behavior as a real backend or agent integration.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries with a scope prefix, such as `design: refine inbox motion` or `feat: add brand assets`. Keep changes focused. Open an issue before substantial work, branch from and target `feat/relai-agent-inbox` for inbox work until it is integrated into `main`, and run `make check` before submitting. Explain what changed and how it was checked; include screenshots for visible UI changes. Pull requests are reviewed and squash-merged.

## Security & Configuration

Never commit credentials, private messages, or personal data. Report vulnerabilities privately using the process in `SECURITY.md`.
