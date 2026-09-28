# Calculator

Last verified: 2026-09-28

## Parts

| File | Role |
|---|---|
| [decimal.ts](../../src/calc/decimal.ts) | Exact numbers as normalized BigInt fractions `{n, d}`, with parsing, arithmetic and display formatting. It never converts to `Number`. |
| [engine.ts](../../src/calc/engine.ts) | Pure, immutable state machine: `createState()`, `press(state, key)`, `getDisplay(state)`, and `evaluate(items)`. |
| [keys.ts](../../src/ui/keys.ts) | `keyFromEvent(event)`: maps a keyboard event to an engine `Key`, or null. |
| [app.ts](../../src/ui/app.ts) | `mountCalculator(root)`: wires clicks and `keydown` to `press` and renders `getDisplay` with `textContent`. |

Engine keys: `'0'`–`'9'`, `'.'`, `'+' '-' '*' '/'`, `'='`, `'clear'`, `'backspace'`, `'negate'`.

## Arithmetic and formatting

- Values stay exact through chains. `2 ÷ 3 × 3` is exactly 2, and a result carried
  into the next calculation keeps full precision, not its rounded display.
- Division by zero throws `DivisionByZeroError`. The engine turns it into the message
  `Cannot divide by zero`.
- Display: at most 12 significant digits, rounded half away from zero, with trailing
  zeros removed.
- Exponent form (`1.23456789012e+15`, `9.999e-10`) is used when the *rounded*
  magnitude is ≥ 10^12 or < 10^-9. So 999999999999.5 shows `1e+12`.
- A result never shows `-0`, `Infinity` or `NaN`.

## Input rules (`press`)

- **Precedence:** × and ÷ are evaluated before + and −, and both levels are
  left-associative.
- **Numbers:**
  - Leading zeros collapse.
  - A leading `.` becomes `0.`.
  - Only one `.` is allowed per number.
  - A number holds at most 40 digits (`MAX_ENTRY_DIGITS`).
- **Operators:**
  - A second operator in a row replaces the pending one.
  - An operator pressed before any number continues from 0.
- **After `=`:**
  - A digit or `.` starts a new expression.
  - An operator continues from the result.
  - Pressing `=` again does nothing.
  - Backspace clears to 0.
- **Trailing operator:** `=` does nothing when the expression ends in an operator.
- **Backspace:** edits only the number being typed. With no number being typed, it
  does nothing.
- **±:**
  - Negates the number being typed, or the result.
  - Zero stays unsigned.
  - Before a number is started, it does nothing.
- **After a division error:**
  - A digit or `.` starts fresh.
  - C and Backspace clear.
  - Operators, ± and `=` are ignored.

## Display (`getDisplay`)

- **Expression line:**
  - Shows the expression using `+ − × ÷`, and a typographic minus for negative numbers.
  - After `=` it shows the evaluated expression followed by ` =`.
- **Result line:**
  - While typing, a preview of the complete part of the expression (a trailing
    operator is ignored).
  - After `=`, the final value.
  - After a division error, the error message.
  - A preview that would divide by zero stays blank until `=` is pressed.

## UI gotchas

- The keydown handler calls `preventDefault()` on every key it handles. This stops
  Enter from also clicking a focused button (which would double-fire), `/` from
  opening Firefox quick find, and Backspace from navigating. Ctrl, Meta and Alt
  combinations are left to the browser.
- The result line is not a live region. A separate hidden `role="status"` element
  announces only results, errors and clearing, not every keystroke. Every
  applied key rewrites it, so it only ever holds the latest outcome: the first
  key after an error announces the new number (for example `5`, or `0` after
  Backspace), and any other ordinary key empties it. Keys the engine ignores
  leave it untouched.
- The long-number layout has three parts:
  - The result font steps down (`data-size` lg/md/sm).
  - Both lines scroll horizontally, and after each render they scroll to the end.
  - The page grid uses `minmax(0, 1fr)`, so a long line cannot widen the card.
- The production build injects a strict Content-Security-Policy meta tag
  (`default-src 'self'`) through a plugin in [vite.config.ts](../../vite.config.ts).
  The dev server does not get it. The policy also blocks tools that inject inline
  scripts, such as an axe scan against `vite preview`, so run those against `npm run dev`.
