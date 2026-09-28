import { describe, expect, it } from 'vitest';
import { keyFromEvent } from '../src/ui/keys';

const plain = (key: string) => ({ key, ctrlKey: false, metaKey: false, altKey: false });

describe('keyFromEvent', () => {
  it('maps every digit', () => {
    for (const digit of '0123456789') {
      expect(keyFromEvent(plain(digit))).toBe(digit);
    }
  });

  it('maps the decimal point, including a numpad comma', () => {
    expect(keyFromEvent(plain('.'))).toBe('.');
    expect(keyFromEvent(plain(','))).toBe('.');
  });

  it('maps the four operators', () => {
    expect(keyFromEvent(plain('+'))).toBe('+');
    expect(keyFromEvent(plain('-'))).toBe('-');
    expect(keyFromEvent(plain('*'))).toBe('*');
    expect(keyFromEvent(plain('/'))).toBe('/');
  });

  it('maps Enter and = to equals', () => {
    expect(keyFromEvent(plain('Enter'))).toBe('=');
    expect(keyFromEvent(plain('='))).toBe('=');
  });

  it('maps Backspace and Escape', () => {
    expect(keyFromEvent(plain('Backspace'))).toBe('backspace');
    expect(keyFromEvent(plain('Escape'))).toBe('clear');
  });

  it('allows Shift, which typing + and * needs', () => {
    expect(keyFromEvent({ ...plain('+'), shiftKey: true } as ReturnType<typeof plain>)).toBe('+');
  });

  it('leaves shortcuts with Ctrl, Meta or Alt to the browser', () => {
    expect(keyFromEvent({ ...plain('r'), ctrlKey: true })).toBeNull();
    expect(keyFromEvent({ ...plain('1'), ctrlKey: true })).toBeNull();
    expect(keyFromEvent({ ...plain('-'), metaKey: true })).toBeNull();
    expect(keyFromEvent({ ...plain('5'), altKey: true })).toBeNull();
  });

  it('ignores keys the calculator does not use', () => {
    for (const key of ['a', 'x', ' ', 'Tab', 'ArrowLeft', 'F5', 'Delete', 'toString', 'constructor', '__proto__']) {
      expect(keyFromEvent(plain(key)), key).toBeNull();
    }
  });
});
