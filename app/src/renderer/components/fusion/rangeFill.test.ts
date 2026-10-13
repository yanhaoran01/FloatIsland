import { describe, expect, it } from 'vitest';
import { rangePercent } from './rangeFill';

const range = (min: string, max: string, value: string) => ({ min, max, value }) as HTMLInputElement;

describe('rangePercent', () => {
  it('maps the value onto the min-max span', () => {
    expect(rangePercent(range('0', '1', '.25'))).toBe('25%');
    expect(rangePercent(range('10', '110', '60'))).toBe('50%');
  });
  it('clamps and guards degenerate ranges', () => {
    expect(rangePercent(range('0', '10', '20'))).toBe('100%');
    expect(rangePercent(range('5', '5', '5'))).toBe('0%');
    expect(rangePercent(range('', '', 'x'))).toBe('0%');
  });
});
