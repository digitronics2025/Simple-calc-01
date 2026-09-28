/**
 * Exact rational arithmetic on BigInt fractions.
 *
 * Every value is a normalized fraction n/d with d > 0 and gcd(|n|, d) = 1, so
 * 0.1 + 0.2 is exactly 3/10 and 2 ÷ 3 × 3 is exactly 2. Nothing here converts
 * to a JavaScript Number, which is what keeps floating-point artefacts out.
 */

export interface Decimal {
  readonly n: bigint;
  readonly d: bigint;
}

export class DivisionByZeroError extends Error {
  constructor() {
    super('Division by zero');
    this.name = 'DivisionByZeroError';
  }
}

/** Significant digits shown for a result. */
export const DISPLAY_DIGITS = 12;
/** Results at or above 10^12 in magnitude use exponent form. */
const MAX_FIXED_EXPONENT = 11;
/** Results below 10^-9 in magnitude use exponent form. */
const MIN_FIXED_EXPONENT = -9;

const ZERO_VALUE: Decimal = { n: 0n, d: 1n };

const abs = (x: bigint): bigint => (x < 0n ? -x : x);

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

function fraction(n: bigint, d: bigint): Decimal {
  if (d === 0n) throw new DivisionByZeroError();
  if (n === 0n) return ZERO_VALUE;
  const sign = d < 0n ? -1n : 1n;
  const g = gcd(n, d);
  return { n: (sign * n) / g, d: (sign * d) / g };
}

const DECIMAL_PATTERN = /^(-)?(\d*)(?:\.(\d*))?$/;

/**
 * Parses plain decimal text such as "12", "-0.5", ".5" or "3." exactly.
 * Throws on anything else, including an empty string or a lone sign.
 */
export function parseDecimal(text: string): Decimal {
  const match = DECIMAL_PATTERN.exec(text);
  const whole = match?.[2] ?? '';
  const frac = match?.[3] ?? '';
  if (!match || whole + frac === '') {
    throw new SyntaxError(`Not a decimal number: "${text}"`);
  }
  const digits = BigInt(whole + frac);
  return fraction(match[1] ? -digits : digits, 10n ** BigInt(frac.length));
}

export const ZERO = ZERO_VALUE;
export const isZero = (x: Decimal): boolean => x.n === 0n;
export const negate = (x: Decimal): Decimal => (x.n === 0n ? x : { n: -x.n, d: x.d });
export const add = (a: Decimal, b: Decimal): Decimal => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
export const subtract = (a: Decimal, b: Decimal): Decimal => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
export const multiply = (a: Decimal, b: Decimal): Decimal => fraction(a.n * b.n, a.d * b.d);

/** Throws DivisionByZeroError when b is zero. */
export function divide(a: Decimal, b: Decimal): Decimal {
  if (b.n === 0n) throw new DivisionByZeroError();
  return fraction(a.n * b.d, a.d * b.n);
}

/** Largest e with 10^e <= n/d, for n, d > 0. */
function decimalExponent(n: bigint, d: bigint): number {
  let e = n.toString().length - d.toString().length;
  const atLeast = (exp: number): boolean =>
    exp >= 0 ? n >= d * 10n ** BigInt(exp) : n * 10n ** BigInt(-exp) >= d;
  if (!atLeast(e)) e -= 1;
  return e;
}

/**
 * Formats a value for display: at most 12 significant digits, rounded half
 * away from zero, trailing zeros removed. Magnitudes of 10^12 and above or
 * below 10^-9 use exponent form such as "1.23456789012e+15". Never "-0".
 */
export function formatDecimal(x: Decimal): string {
  if (x.n === 0n) return '0';
  const sign = x.n < 0n ? '-' : '';
  const n = abs(x.n);

  let exponent = decimalExponent(n, x.d);
  // Scale so the integer part holds exactly DISPLAY_DIGITS digits, then round.
  const shift = DISPLAY_DIGITS - 1 - exponent;
  const num = shift >= 0 ? n * 10n ** BigInt(shift) : n;
  const den = shift >= 0 ? x.d : x.d * 10n ** BigInt(-shift);
  let mantissa = num / den;
  if (2n * (num % den) >= den) mantissa += 1n;
  if (mantissa === 10n ** BigInt(DISPLAY_DIGITS)) {
    mantissa /= 10n;
    exponent += 1;
  }

  const digits = mantissa.toString();
  if (exponent > MAX_FIXED_EXPONENT || exponent < MIN_FIXED_EXPONENT) {
    const rest = digits.slice(1).replace(/0+$/, '');
    const expSign = exponent < 0 ? '-' : '+';
    return `${sign}${digits[0]}${rest ? `.${rest}` : ''}e${expSign}${Math.abs(exponent)}`;
  }
  if (exponent >= 0) {
    const whole = digits.slice(0, exponent + 1);
    const frac = digits.slice(exponent + 1).replace(/0+$/, '');
    return `${sign}${whole}${frac ? `.${frac}` : ''}`;
  }
  const frac = ('0'.repeat(-exponent - 1) + digits).replace(/0+$/, '');
  return `${sign}0.${frac}`;
}
