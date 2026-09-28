/**
 * DOM wiring for the calculator: buttons and keyboard feed `press`, and the
 * display is redrawn from `getDisplay`. All calculation rules live in calc/.
 */
import { type CalcState, type Key, createState, getDisplay, press } from '../calc/engine';
import { keyFromEvent } from './keys';

const PRESSED_CLASS = 'is-pressed';
const PRESSED_MS = 120;

export interface Calculator {
  /** Applies a key as if it were pressed, and redraws. */
  press(key: Key): void;
  /** Removes the listeners added by `mountCalculator`. */
  destroy(): void;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Calculator markup is missing ${selector}`);
  return element;
}

/** Size step for the result line, so long values shrink before they scroll. */
export function resultSize(text: string): 'lg' | 'md' | 'sm' {
  if (text.length <= 9) return 'lg';
  if (text.length <= 14) return 'md';
  return 'sm';
}

/**
 * Connects the calculator markup inside `root` to the engine. Keyboard input
 * is read from `keyboardTarget` (the whole document by default).
 */
export function mountCalculator(root: HTMLElement, keyboardTarget: Document | HTMLElement = document): Calculator {
  const expressionEl = requireElement<HTMLElement>(root, '[data-expression]');
  const resultEl = requireElement<HTMLElement>(root, '[data-result]');
  const announcerEl = requireElement<HTMLElement>(root, '[data-announcer]');
  let state: CalcState = createState();

  function render(): void {
    const display = getDisplay(state);
    expressionEl.textContent = display.expression;
    resultEl.textContent = display.result;
    resultEl.dataset.size = resultSize(display.result);
    resultEl.classList.toggle('is-error', display.isError);
    // Keep the latest digits in view when a line is wider than the display.
    expressionEl.scrollLeft = expressionEl.scrollWidth;
    resultEl.scrollLeft = resultEl.scrollWidth;
  }

  /**
   * Announces outcomes to screen readers, not every keystroke. Every applied
   * key rewrites the status, so an earlier outcome is never left behind.
   */
  function announce(key: Key, previous: CalcState): void {
    const display = getDisplay(state);
    if (display.isError) {
      announcerEl.textContent = display.result;
    } else if (key === '=') {
      announcerEl.textContent = `equals ${display.result}`;
    } else if (key === 'clear') {
      announcerEl.textContent = 'cleared';
    } else if (previous.error !== null) {
      // Input restarted after an error: say the new number in its place.
      announcerEl.textContent = display.result;
    } else {
      announcerEl.textContent = '';
    }
  }

  function apply(key: Key): void {
    const previous = state;
    const next = press(state, key);
    if (next === previous) return;
    state = next;
    render();
    announce(key, previous);
  }

  function flash(key: Key): void {
    const button = [...root.querySelectorAll<HTMLElement>('[data-key]')].find((el) => el.dataset.key === key);
    if (!button) return;
    button.classList.add(PRESSED_CLASS);
    window.setTimeout(() => button.classList.remove(PRESSED_CLASS), PRESSED_MS);
  }

  function onClick(event: MouseEvent): void {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-key]');
    if (!button || !root.contains(button)) return;
    apply(button.dataset.key as Key);
  }

  function onKeyDown(event: Event): void {
    const key = keyFromEvent(event as KeyboardEvent);
    if (key === null) return;
    // Stops Enter from also clicking a focused button, "/" from opening
    // Firefox quick find, and Backspace from navigating back.
    event.preventDefault();
    apply(key);
    flash(key);
  }

  root.addEventListener('click', onClick);
  keyboardTarget.addEventListener('keydown', onKeyDown);
  render();

  return {
    press: apply,
    destroy() {
      root.removeEventListener('click', onClick);
      keyboardTarget.removeEventListener('keydown', onKeyDown);
    },
  };
}
