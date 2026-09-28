import { describe, expect, it } from 'vitest';
import {
  DivisionByZeroError,
  add,
  divide,
  formatDecimal,
  multiply,
  negate,
  parseDecimal,
  subtract,
} from '../src/calc/decimal';

const d = parseDecimal;
const fmt = (text: string): string => formatDecimal(d(text));

describe('parseDecimal', () => {
  it('parses integers, fractions and signs exactly', () => {
    expect(d('12')).toEqual({ n: 12n, d: 1n });
    expect(d('0.1')).toEqual({ n: 1n, d: 10n });
    expect(d('-0.25')).toEqual({ n: -1n, d: 4n });
    expect(d('.5')).toEqual({ n: 1n, d: 2n });
    expect(d('3.')).toEqual({ n: 3n, d: 1n });
    expect(d('-0')).toEqual({ n: 0n, d: 1n });
    expect(d('007.500')).toEqual({ n: 15n, d: 2n });
  });

  it('rejects text that is not a plain decimal', () => {
    for (const bad of ['', '-', '.', '1.2.3', 'abc', '1e5', '+1', ' 1']) {
      expect(() => d(bad), bad).toThrow(SyntaxError);
    }
  });
});

describe('exact arithmetic', () => {
  it('has no floating-point artefacts', () => {
    expect(formatDecimal(add(d('0.1'), d('0.2')))).toBe('0.3');
    expect(formatDecimal(multiply(d('1.1'), d('3')))).toBe('3.3');
    expect(formatDecimal(subtract(d('0.3'), d('0.1')))).toBe('0.2');
    expect(formatDecimal(multiply(d('0.07'), d('100')))).toBe('7');
  });

  it('keeps repeating divisions exact through later operations', () => {
    expect(multiply(divide(d('2'), d('3')), d('3'))).toEqual({ n: 2n, d: 1n });
    expect(formatDecimal(divide(d('1'), d('3')))).toBe('0.333333333333');
    expect(formatDecimal(divide(d('2'), d('3')))).toBe('0.666666666667');
  });

  it('normalizes signs and zero', () => {
    expect(divide(d('1'), d('-2'))).toEqual({ n: -1n, d: 2n });
    expect(subtract(d('5'), d('5'))).toEqual({ n: 0n, d: 1n });
    expect(negate(d('0'))).toEqual({ n: 0n, d: 1n });
    expect(negate(d('-1.5'))).toEqual({ n: 3n, d: 2n });
  });

  it('throws a typed error on division by zero', () => {
    expect(() => divide(d('5'), d('0'))).toThrow(DivisionByZeroError);
    expect(() => divide(d('0'), d('0.000'))).toThrow(DivisionByZeroError);
  });
});

describe('formatDecimal', () => {
  it('prints exact values without trailing zeros', () => {
    expect(fmt('0')).toBe('0');
    expect(fmt('-0')).toBe('0');
    expect(fmt('1.500')).toBe('1.5');
    expect(fmt('-42')).toBe('-42');
    expect(fmt('123456789012')).toBe('123456789012');
  });

  it('rounds to 12 significant digits, half away from zero', () => {
    expect(fmt('1.23456789012345')).toBe('1.23456789012');
    expect(fmt('1.00000000000500')).toBe('1.00000000001');
    expect(fmt('-1.00000000000500')).toBe('-1.00000000001');
    expect(fmt('0.1234567890125')).toBe('0.123456789013');
    expect(fmt('99999999999.95')).toBe('100000000000');
  });

  it('switches to exponent form at 10^12', () => {
    expect(fmt('999999999999')).toBe('999999999999');
    expect(fmt('1000000000000')).toBe('1e+12');
    expect(fmt('999999999999.5')).toBe('1e+12');
    expect(fmt('-1234567890123456')).toBe('-1.23456789012e+15');
    expect(formatDecimal(multiply(d(`1${'0'.repeat(20)}`), d('3')))).toBe('3e+20');
  });

  it('switches to exponent form below 10^-9', () => {
    expect(fmt('0.000000001')).toBe('0.000000001');
    expect(fmt('0.00000000123')).toBe('0.00000000123');
    expect(fmt('0.0000000009999')).toBe('9.999e-10');
    expect(fmt('-0.00000000000012345')).toBe('-1.2345e-13');
    expect(fmt('0.00000000099999999999999')).toBe('0.000000001');
  });

  it('never prints Infinity or NaN for huge or tiny values', () => {
    const huge = multiply(d('9'.repeat(40)), d('9'.repeat(40)));
    expect(formatDecimal(huge)).toBe('1e+80');
    expect(formatDecimal(divide(d('1'), huge))).toBe('1e-80');
  });
});
