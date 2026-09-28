# Simple Calc

A small calculator web app. It uses standard operator precedence (2 + 3 × 4 = 14)
and exact decimal arithmetic (0.1 + 0.2 = 0.3). You can use it with touch, mouse or
keyboard, on a phone or a desktop, in light or dark mode. It is a static site: no
server, no accounts, no network calls.

## Run it

Requires Node.js 22.13 or newer on the 22 line, or Node.js 24 or 26 and later. The
test and lint tools do not support Node 20 or the odd-numbered Node 25.

```sh
npm install
npm run dev        # development server with live reload
```

```sh
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

`dist/` can be hosted by any static file server. Opening `index.html` straight from
disk does not work, because browsers block ES modules on `file://`.

## Checks

```sh
npm test           # unit and DOM tests (Vitest + jsdom)
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Keyboard

| Key | Action |
|---|---|
| `0`–`9`, `.` (or numpad `,`) | Enter a number |
| `+` `-` `*` `/` | Operators |
| `Enter` or `=` | Equals |
| `Backspace` | Delete the last digit |
| `Escape` | Clear |

## Layout

- `src/calc/` holds the calculation engine: exact arithmetic and the key-press
  state machine. It is pure TypeScript with no DOM. See
  [docs/systems/calculator.md](docs/systems/calculator.md).
- `src/ui/` holds the DOM wiring: button clicks, keyboard mapping and rendering.
- `test/` holds the Vitest suites.
