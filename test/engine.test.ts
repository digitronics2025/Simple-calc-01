import { describe, expect, it } from 'vitest';
import { parseDecimal } from '../src/calc/decimal';
import {
  type CalcState,
  type Key,
  DIVIDE_BY_ZERO_MESSAGE,
  MAX_ENTRY_DIGITS,
  createState,
  evaluate,
  getDisplay,
  press,
} from '../src/calc/engine';

/** Short key notation: C = clear, < = backspace, n = negate (±). */
const KEY_ALIASES: Record<string, Key> = { C: 'clear', '<': 'backspace', n: 'negate' };

function run(sequence: string, state: CalcState = createState()): CalcState {
  return [...sequence].reduce((current, char) => press(current, KEY_ALIASES[char] ?? (char as Key)), state);
}

const show = (sequence: string, state?: CalcState) => getDisplay(run(sequence, state));
const result = (sequence: string, state?: CalcState) => show(sequence, state).result;

describe('initial state', () => {
  it('shows an empty expression and 0', () => {
    expect(getDisplay(createState())).toEqual({ expression: '', result: '0', isError: false });
  });
});

describe('operator precedence', () => {
  it('multiplies and divides before adding and subtracting', () => {
    expect(result('2+3*4=')).toBe('14');
    expect(result('10-2*3=')).toBe('4');
    expect(result('2*3+4*5=')).toBe('26');
    expect(result('1+8/4-2=')).toBe('1');
  });

  it('is left-associative at each level', () => {
    expect(result('8/2/2=')).toBe('2');
    expect(result('10-4-3=')).toBe('3');
    expect(result('100/10*5=')).toBe('50');
  });

  it('shows the evaluated expression with symbols', () => {
    expect(show('2+3*4=').expression).toBe('2 + 3 × 4 =');
    expect(show('9-6/3=').expression).toBe('9 − 6 ÷ 3 =');
  });
});

describe('evaluate', () => {
  it('evaluates alternating numbers and operators', () => {
    const d = parseDecimal;
    expect(evaluate([d('2'), '+', d('3'), '*', d('4')])).toEqual({ n: 14n, d: 1n });
  });

  it('rejects malformed expressions', () => {
    const d = parseDecimal;
    expect(() => evaluate([])).toThrow(SyntaxError);
    expect(() => evaluate(['+'])).toThrow(SyntaxError);
    expect(() => evaluate([d('1'), '+'])).toThrow(SyntaxError);
  });
});

describe('chaining', () => {
  it('continues from a result when an operator follows =', () => {
    const afterFirst = run('5+5=');
    expect(getDisplay(afterFirst).result).toBe('10');
    const afterSecond = run('+2=', afterFirst);
    expect(getDisplay(afterSecond)).toEqual({ expression: '10 + 2 =', result: '12', isError: false });
  });

  it('starts a new expression when a digit or point follows =', () => {
    expect(show('5+5=7')).toEqual({ expression: '7', result: '7', isError: false });
    expect(show('5+5=.5')).toEqual({ expression: '0.5', result: '0.5', isError: false });
  });

  it('ignores repeated =', () => {
    expect(run('5+5==')).toEqual(run('5+5='));
  });

  it('keeps full precision when chaining a repeating result', () => {
    expect(result('2/3=')).toBe('0.666666666667');
    expect(result('2/3=*3=')).toBe('2');
  });

  it('evaluates a lone number on =', () => {
    expect(show('5=')).toEqual({ expression: '5 =', result: '5', isError: false });
  });
});

describe('decimal results', () => {
  it('has no floating-point artefacts', () => {
    expect(result('0.1+0.2=')).toBe('0.3');
    expect(result('1.1*3=')).toBe('3.3');
    expect(result('2/3*3=')).toBe('2');
    expect(result('1/3=')).toBe('0.333333333333');
  });

  it('uses exponent form for very large and very small results', () => {
    expect(result('999999*999999*999999=')).toBe('9.99997000003e+17');
    expect(result('1/1000000/1000000=')).toBe('1e-12');
    expect(result('999999999999+1=')).toBe('1e+12');
    expect(result('999999999999=')).toBe('999999999999');
  });

  it('can continue from an exponent-form result', () => {
    expect(show('1000000*1000000=+1=')).toEqual({
      expression: '1e+12 + 1 =',
      result: '1e+12',
      isError: false,
    });
  });
});

describe('division by zero', () => {
  it('shows a clear message instead of crashing', () => {
    expect(show('5/0=')).toEqual({ expression: '5 ÷ 0 =', result: DIVIDE_BY_ZERO_MESSAGE, isError: true });
    expect(show('0/0=').result).toBe('Cannot divide by zero');
    expect(show('1+6/0*2=').isError).toBe(true);
  });

  it('starts fresh on the next digit or point', () => {
    expect(show('5/0=7')).toEqual({ expression: '7', result: '7', isError: false });
    expect(show('5/0=7+1=').result).toBe('8');
    expect(show('5/0=.2').result).toBe('0.2');
  });

  it('clears on C or backspace', () => {
    expect(run('5/0=C')).toEqual(createState());
    expect(run('5/0=<')).toEqual(createState());
  });

  it('ignores operators, ± and = while the error shows', () => {
    const error = run('5/0=');
    for (const key of ['+', '-', '*', '/', '=', 'negate'] as Key[]) {
      expect(press(error, key), key).toBe(error);
    }
  });

  it('only previews a zero divisor as blank before =', () => {
    expect(show('5/0')).toEqual({ expression: '5 ÷ 0', result: '', isError: false });
    expect(show('5/0.5')).toEqual({ expression: '5 ÷ 0.5', result: '10', isError: false });
  });
});

describe('live preview', () => {
  it('shows the value of the complete part of the expression', () => {
    expect(show('12')).toEqual({ expression: '12', result: '12', isError: false });
    expect(show('2+3*')).toEqual({ expression: '2 + 3 ×', result: '5', isError: false });
    expect(show('2+3*4')).toEqual({ expression: '2 + 3 × 4', result: '14', isError: false });
  });
});

describe('number entry', () => {
  it('collapses leading zeros', () => {
    expect(show('007').expression).toBe('7');
    expect(show('0').expression).toBe('0');
  });

  it('allows only one decimal point per number', () => {
    expect(show('1.2.3').expression).toBe('1.23');
    expect(show('1.2+3.4.5').expression).toBe('1.2 + 3.45');
  });

  it('turns a leading point into 0.', () => {
    expect(show('.5').expression).toBe('0.5');
    expect(show('3+.').expression).toBe('3 + 0.');
  });

  it('drops a dangling point from a completed number', () => {
    expect(show('5.+1').expression).toBe('5 + 1');
  });

  it('caps the digits in one number', () => {
    const long = '1'.repeat(MAX_ENTRY_DIGITS + 5);
    expect(show(long).expression).toBe('1'.repeat(MAX_ENTRY_DIGITS));
  });

  it('accepts a 30-digit number exactly', () => {
    const digits = '123456789'.repeat(3) + '012';
    expect(show(digits).expression).toBe(digits);
    expect(show(`${digits}-${digits}=`).result).toBe('0');
  });
});

describe('operators', () => {
  it('replaces a pending operator with the next one', () => {
    expect(show('5+*').expression).toBe('5 ×');
    expect(result('5+*2=')).toBe('10');
    expect(result('5-/+2=')).toBe('7');
  });

  it('continues from zero when an operator comes first', () => {
    expect(show('-3=')).toEqual({ expression: '0 − 3 =', result: '−3', isError: false });
  });

  it('does nothing on = with a trailing operator or no input', () => {
    expect(run('5+=')).toEqual(run('5+'));
    expect(run('=')).toEqual(createState());
  });
});

describe('backspace', () => {
  it('removes the last typed character', () => {
    expect(show('123<').expression).toBe('12');
    expect(show('1.5<').expression).toBe('1.');
    expect(show('1.5<<').expression).toBe('1');
    expect(show('7<')).toEqual({ expression: '', result: '0', isError: false });
  });

  it('only edits the current number', () => {
    expect(show('5+<').expression).toBe('5 +');
    expect(show('5+3<').expression).toBe('5 +');
  });

  it('never leaves a bare or zero sign', () => {
    expect(show('5n<').expression).toBe('');
    expect(show('0.5n<<').expression).toBe('0');
  });

  it('clears a result to zero', () => {
    expect(show('5+5=<')).toEqual({ expression: '', result: '0', isError: false });
  });
});

describe('± change sign', () => {
  it('toggles the current number', () => {
    expect(show('5n')).toEqual({ expression: '−5', result: '−5', isError: false });
    expect(show('5nn').expression).toBe('5');
    expect(result('3+5n=')).toBe('−2');
    expect(result('2*3n=')).toBe('−6');
  });

  it('negates a result and keeps chaining from it', () => {
    expect(show('5+5=n')).toEqual({ expression: '−10', result: '−10', isError: false });
    expect(result('5+5=n+2=')).toBe('−8');
  });

  it('leaves zero unsigned', () => {
    expect(show('0n').expression).toBe('0');
    expect(show('0.00n').expression).toBe('0.00');
    expect(show('5-5=n').result).toBe('0');
    expect(show('n')).toEqual(getDisplay(createState()));
  });

  it('does nothing before a number is started', () => {
    expect(show('5+n').expression).toBe('5 +');
  });

  it('never shows -0', () => {
    expect(result('0*5n=')).toBe('0');
    expect(result('5n+5=')).toBe('0');
  });
});

describe('clear', () => {
  it('resets everything', () => {
    expect(run('2+3*4C')).toEqual(createState());
    expect(run('2+3=C')).toEqual(createState());
  });
});

describe('immutability', () => {
  it('never mutates the previous state', () => {
    const before = run('2+3');
    const snapshot = JSON.stringify(before, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
    run('*4=n<C', before);
    expect(JSON.stringify(before, (_, v) => (typeof v === 'bigint' ? v.toString() : v))).toBe(snapshot);
  });
});
