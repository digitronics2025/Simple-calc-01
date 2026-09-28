// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import { type Calculator, mountCalculator, resultSize } from '../src/ui/app';

let calculator: Calculator;
let root: HTMLElement;

const expression = () => root.querySelector('[data-expression]')?.textContent;
const result = () => root.querySelector('[data-result]')?.textContent;
const announcer = () => root.querySelector('[data-announcer]')?.textContent;

function button(key: string): HTMLButtonElement {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button[data-key]')].find((b) => b.dataset.key === key);
  if (!found) throw new Error(`No button for ${key}`);
  return found;
}

const click = (...keys: string[]) => keys.forEach((key) => button(key).click());

function type(key: string, init: KeyboardEventInit = {}, target: EventTarget = document): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  const page = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = page.body.innerHTML;
  root = document.querySelector<HTMLElement>('[data-calculator]') as HTMLElement;
  calculator = mountCalculator(root);
});

afterEach(() => {
  calculator.destroy();
  document.body.innerHTML = '';
});

describe('markup', () => {
  it('has a button for every required key', () => {
    const keys = [...root.querySelectorAll<HTMLButtonElement>('button[data-key]')].map((b) => b.dataset.key);
    expect(keys.sort()).toEqual(
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/', '=', 'clear', 'backspace', 'negate'].sort(),
    );
  });

  it('gives symbol buttons a spoken label', () => {
    for (const key of ['.', '+', '-', '*', '/', '=', 'clear', 'backspace', 'negate']) {
      expect(button(key).getAttribute('aria-label'), key).toBeTruthy();
    }
  });

  it('uses real buttons that never submit', () => {
    for (const b of root.querySelectorAll('button')) {
      expect(b.type).toBe('button');
    }
  });

  it('starts showing 0', () => {
    expect(expression()).toBe('');
    expect(result()).toBe('0');
  });
});

describe('clicking buttons', () => {
  it('computes with precedence', () => {
    click('2', '+', '3', '*', '4', '=');
    expect(expression()).toBe('2 + 3 × 4 =');
    expect(result()).toBe('14');
  });

  it('chains from a result', () => {
    click('5', '+', '5', '=', '+', '2', '=');
    expect(result()).toBe('12');
  });

  it('uses the function keys', () => {
    click('1', '2', '3', 'backspace');
    expect(expression()).toBe('12');
    click('negate');
    expect(expression()).toBe('−12');
    click('clear');
    expect(result()).toBe('0');
  });

  it('shows and announces division by zero, then recovers on a digit', () => {
    click('5', '/', '0', '=');
    const resultEl = root.querySelector('[data-result]') as HTMLElement;
    expect(result()).toBe('Cannot divide by zero');
    expect(resultEl.classList.contains('is-error')).toBe(true);
    expect(announcer()).toBe('Cannot divide by zero');
    click('7');
    expect(result()).toBe('7');
    expect(resultEl.classList.contains('is-error')).toBe(false);
  });

  it('announces results but not every digit', () => {
    click('1', '2');
    expect(announcer()).toBe('');
    click('+', '3', '=');
    expect(announcer()).toBe('equals 15');
  });
});

describe('keyboard', () => {
  it('drives the calculator from the document', () => {
    for (const key of ['0', '.', '1', '+', '0', '.', '2', 'Enter']) type(key);
    expect(result()).toBe('0.3');
    for (const key of ['1', '.', '1', '*', '3', '=']) type(key);
    expect(result()).toBe('3.3');
    for (const key of ['9', '-', '8', '/', '4', '=']) type(key);
    expect(result()).toBe('7');
  });

  it('handles Backspace and Escape', () => {
    for (const key of ['4', '5', 'Backspace']) type(key);
    expect(expression()).toBe('4');
    type('Escape');
    expect(result()).toBe('0');
    expect(expression()).toBe('');
  });

  it('prevents the browser default for handled keys only', () => {
    for (const key of ['/', 'Backspace', 'Enter', 'Escape', '5', '*']) {
      expect(type(key).defaultPrevented, key).toBe(true);
    }
    expect(type('Tab').defaultPrevented).toBe(false);
    expect(type('r', { ctrlKey: true }).defaultPrevented).toBe(false);
  });

  it('ignores keys pressed with Ctrl, Meta or Alt', () => {
    type('5', { ctrlKey: true });
    type('5', { metaKey: true });
    type('5', { altKey: true });
    expect(result()).toBe('0');
  });

  it('acts once when Enter is pressed on a focused button', () => {
    type('7');
    type('+');
    type('2');
    const seven = button('7');
    seven.focus();
    // Enter reaches the document handler, which cancels the default action
    // that would otherwise click the focused button too.
    const event = type('Enter', {}, seven);
    expect(event.defaultPrevented).toBe(true);
    expect(result()).toBe('9');
    expect(expression()).toBe('7 + 2 =');
  });

  it('stops listening after destroy', () => {
    calculator.destroy();
    type('5');
    click('5');
    expect(result()).toBe('0');
  });
});

describe('long numbers', () => {
  it('shrinks the result line as it grows', () => {
    expect(resultSize('123456789')).toBe('lg');
    expect(resultSize('12345678901234')).toBe('md');
    expect(resultSize('123456789012345')).toBe('sm');
    for (const digit of '123456789012345') type(digit);
    expect(root.querySelector<HTMLElement>('[data-result]')?.dataset.size).toBe('sm');
  });

  it('keeps a 30-digit entry intact in the expression line', () => {
    const digits = '123456789012345678901234567890';
    for (const digit of digits) type(digit);
    expect(expression()).toBe(digits);
  });
});
