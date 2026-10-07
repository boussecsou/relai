# Relai brand assets

| File | Use |
|---|---|
| `logo-light.svg` | Full logo for **light** backgrounds (dark wordmark). |
| `logo-dark.svg` | Full logo for **dark** backgrounds (light wordmark). |
| `favicon.svg` | The mark alone, square canvas. Tab icon and any small, square slot. |

All files are vector and need no font. The prototype embeds the same artwork inline in
`index.html`, so it still opens as a single file. `make check` fails if the embedded favicon
and `favicon.svg` drift apart.

## Colors

| Role | Value |
|---|---|
| Mark gradient | `#beb6f6` → `#472dff` |
| Mark accent | `#482eff` |
| Wordmark on light | `#202b3c` |
| Wordmark on dark | `#f3f6fb` |

## Usage

- Pick the logo by background, not by operating-system theme: `logo-light.svg` on light, `logo-dark.svg` on dark.
- In Markdown on GitHub, switch with `<picture>` and `prefers-color-scheme` (see the README).
- Keep clear space around the logo equal to the height of the mark's top face, and do not go below 24 px tall for the full logo or 16 px for the mark.
- Do not recolor, stretch, rotate or add effects.
