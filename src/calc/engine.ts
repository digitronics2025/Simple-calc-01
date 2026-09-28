/**
 * Calculator state machine. Pure and immutable: `press` returns a new state
 * and never touches the DOM, so every rule here is unit-testable.
 */
import {
  type Decimal,
  DivisionByZeroError,
  add,
  divide,
  formatDecimal,
  isZero,
  multiply,
  negate,
  parseDecimal,
  subtract,
} from './decimal';

export type Operator = '+' | '-' | '*' | '/';
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type Key = Digit | Operator | '.' | '=' | 'clear' | 'backspace' | 'negate';

export const DIVIDE_BY_ZERO_MESSAGE = 'Cannot divide by zero';
/** Upper bound on digits in one typed number, to keep input bounded. */
export const MAX_ENTRY_DIGITS = 40;

/** The operand being entered: text the user is typing, or a carried result. */
export type Entry =
  | { readonly kind: 'typed'; readonly text: string }
  | { readonly kind: 'value'; readonly value: Decimal };

export type Token =
  | { readonly kind: 'operand'; readonly value: Decimal; readonly text: string }
  | { readonly kind: 'operator'; readonly op: Operator };

export interface CalcState {
  /** Completed operands and operators; ends with an operator when non-empty. */
  readonly tokens: readonly Token[];
  readonly entry: Entry;
  /** Expression text just evaluated by `=`; null while editing. */
  readonly evaluated: string | null;
  readonly error: string | null;
}

export interface Display {
  /** The expression line, e.g. "2 + 3 × 4" or "2 + 3 × 4 =". */
  readonly expression: string;
  /** The result line: live preview, final value, or error message. */
  readonly result: string;
  readonly isError: boolean;
}

const OPERATOR_SYMBOLS: Record<Operator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const EMPTY: Entry = { kind: 'typed', text: '' };

export function createState(): CalcState {
  return { tokens: [], entry: EMPTY, evaluated: null, error: null };
}

const isOperator = (key: Key): key is Operator =>
  key === '+' || key === '-' || key === '*' || key === '/';
const isDigit = (key: Key): key is Digit => key.length === 1 && key >= '0' && key <= '9';
const countDigits = (text: string): number => text.replace(/\D/g, '').length;

/** Display text for a number: typographic minus instead of hyphen. */
const numberText = (text: string): string => text.replace(/^-/, '−');

function entryText(entry: Entry): string {
  return entry.kind === 'typed' ? entry.text : formatDecimal(entry.value);
}

/** The entry as a completed operand, or null while it is empty. */
function entryOperand(entry: Entry): Extract<Token, { kind: 'operand' }> | null {
  if (entry.kind === 'value') {
    return { kind: 'operand', value: entry.value, text: formatDecimal(entry.value) };
  }
  if (entry.text === '') return null;
  // "5." is shown as "5" once the number is complete.
  return { kind: 'operand', value: parseDecimal(entry.text), text: entry.text.replace(/\.$/, '') };
}

/**
 * Evaluates alternating operands and operators with standard precedence:
 * × and ÷ bind tighter than + and −, and both levels are left-associative.
 * Throws DivisionByZeroError.
 */
export function evaluate(items: readonly (Decimal | Operator)[]): Decimal {
  const first = items[0];
  if (first === undefined || typeof first === 'string') {
    throw new SyntaxError('Expression must start with a number');
  }
  // Pass 1: fold × and ÷ into additive terms.
  const terms: Decimal[] = [first];
  const additive: Operator[] = [];
  for (let i = 1; i < items.length; i += 2) {
    const op = items[i];
    const operand = items[i + 1];
    if (typeof op !== 'string' || operand === undefined || typeof operand === 'string') {
      throw new SyntaxError('Expression must alternate numbers and operators');
    }
    if (op === '*' || op === '/') {
      const last = terms.pop() as Decimal;
      terms.push(op === '*' ? multiply(last, operand) : divide(last, operand));
    } else {
      additive.push(op);
      terms.push(operand);
    }
  }
  // Pass 2: + and − left to right.
  let total = terms[0] as Decimal;
  additive.forEach((op, index) => {
    const term = terms[index + 1] as Decimal;
    total = op === '+' ? add(total, term) : subtract(total, term);
  });
  return total;
}

function evaluateTokens(tokens: readonly Token[]): Decimal {
  return evaluate(tokens.map((token) => (token.kind === 'operand' ? token.value : token.op)));
}

function expressionText(tokens: readonly Token[]): string {
  return tokens
    .map((token) => (token.kind === 'operand' ? numberText(token.text) : OPERATOR_SYMBOLS[token.op]))
    .join(' ');
}

function withEntry(state: CalcState, entry: Entry): CalcState {
  return { ...state, entry, evaluated: null };
}

function pressDigit(state: CalcState, digit: Digit): CalcState {
  const text = state.entry.kind === 'typed' ? state.entry.text : '';
  if (text === '0') return withEntry(state, { kind: 'typed', text: digit });
  if (text === '-0') return withEntry(state, { kind: 'typed', text: `-${digit}` });
  if (countDigits(text) >= MAX_ENTRY_DIGITS) return state;
  return withEntry(state, { kind: 'typed', text: text + digit });
}

function pressPoint(state: CalcState): CalcState {
  const text = state.entry.kind === 'typed' ? state.entry.text : '';
  if (text.includes('.')) return state;
  return withEntry(state, { kind: 'typed', text: text === '' ? '0.' : `${text}.` });
}

function pressOperator(state: CalcState, op: Operator): CalcState {
  const operand = entryOperand(state.entry);
  if (operand) {
    return { ...state, tokens: [...state.tokens, operand, { kind: 'operator', op }], entry: EMPTY, evaluated: null };
  }
  const last = state.tokens[state.tokens.length - 1];
  if (last) {
    // Consecutive operators: the newest replaces the pending one.
    return { ...state, tokens: [...state.tokens.slice(0, -1), { kind: 'operator', op }] };
  }
  // An operator before any number continues from zero.
  return { ...state, tokens: [{ kind: 'operand', value: parseDecimal('0'), text: '0' }, { kind: 'operator', op }] };
}

function pressEquals(state: CalcState): CalcState {
  if (state.evaluated !== null) return state; // Repeated = does nothing.
  const operand = entryOperand(state.entry);
  if (!operand) return state; // Nothing entered, or a trailing operator.
  const tokens = [...state.tokens, operand];
  const expression = expressionText(tokens);
  try {
    const value = evaluateTokens(tokens);
    return { tokens: [], entry: { kind: 'value', value }, evaluated: expression, error: null };
  } catch (error) {
    if (!(error instanceof DivisionByZeroError)) throw error;
    return { tokens: [], entry: EMPTY, evaluated: expression, error: DIVIDE_BY_ZERO_MESSAGE };
  }
}

function pressBackspace(state: CalcState): CalcState {
  // A carried result is not editable text: backspace clears it to zero.
  if (state.entry.kind === 'value') return withEntry(state, EMPTY);
  let text = state.entry.text.slice(0, -1);
  if (text === '-') text = '';
  if (text === '-0') text = '0';
  return withEntry(state, { kind: 'typed', text });
}

function pressNegate(state: CalcState): CalcState {
  const { entry } = state;
  if (entry.kind === 'value') {
    return isZero(entry.value) ? state : withEntry(state, { kind: 'value', value: negate(entry.value) });
  }
  // Nothing to negate yet, and zero stays unsigned.
  if (entry.text === '' || isZero(parseDecimal(entry.text))) return state;
  const text = entry.text.startsWith('-') ? entry.text.slice(1) : `-${entry.text}`;
  return withEntry(state, { kind: 'typed', text });
}

/** Applies one key press and returns the next state. Never throws for a valid key. */
export function press(state: CalcState, key: Key): CalcState {
  if (key === 'clear') return createState();

  if (state.error !== null) {
    // After an error only fresh input or clearing does anything.
    if (isDigit(key)) return pressDigit(createState(), key);
    if (key === '.') return pressPoint(createState());
    if (key === 'backspace') return createState();
    return state;
  }

  const fresh = state.evaluated !== null;
  if (isDigit(key)) return pressDigit(fresh ? createState() : state, key);
  if (key === '.') return pressPoint(fresh ? createState() : state);
  if (isOperator(key)) return pressOperator(state, key);
  switch (key) {
    case '=':
      return pressEquals(state);
    case 'backspace':
      return pressBackspace(state);
    case 'negate':
      return pressNegate(state);
  }
  return state;
}

/** What the two display lines should show for a state. */
export function getDisplay(state: CalcState): Display {
  if (state.error !== null) {
    return { expression: `${state.evaluated ?? ''} =`, result: state.error, isError: true };
  }
  if (state.evaluated !== null) {
    return { expression: `${state.evaluated} =`, result: numberText(entryText(state.entry)), isError: false };
  }

  const operand = entryOperand(state.entry);
  const expression = [expressionText(state.tokens), numberText(entryText(state.entry))]
    .filter((part) => part !== '')
    .join(' ');

  // Preview the complete part of the expression, ignoring a trailing operator.
  const complete = operand ? [...state.tokens, operand] : state.tokens.slice(0, -1);
  if (complete.length === 0) return { expression, result: '0', isError: false };
  try {
    return { expression, result: numberText(formatDecimal(evaluateTokens(complete))), isError: false };
  } catch (error) {
    if (!(error instanceof DivisionByZeroError)) throw error;
    // The error is only reported on =; the preview just stays blank.
    return { expression, result: '', isError: false };
  }
}
