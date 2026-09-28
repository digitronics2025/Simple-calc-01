import type { Key } from '../calc/engine';

const KEY_MAP: Readonly<Record<string, Key>> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': '.',
  // Some keyboard layouts send a comma from the numpad decimal key.
  ',': '.',
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  '=': '=',
  Enter: '=',
  Backspace: 'backspace',
  Escape: 'clear',
};

export type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>;

/**
 * Maps a keyboard event to a calculator key, or null when the calculator
 * should leave the event alone. Shortcuts with Ctrl, Meta or Alt are never
 * taken, so browser commands such as Ctrl+R keep working.
 */
export function keyFromEvent(event: KeyInput): Key | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  return Object.hasOwn(KEY_MAP, event.key) ? (KEY_MAP[event.key] ?? null) : null;
}
