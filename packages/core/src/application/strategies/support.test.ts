import { describe, it, expect } from 'vitest';
import { lastTwoNumbers } from './support';

describe('lastTwoNumbers', () => {
  it('renvoie les deux dernières valeurs si elles sont non-null', () => {
    expect(lastTwoNumbers([1, 2, 3])).toEqual([2, 3]);
  });

  it('renvoie null si moins de deux éléments', () => {
    expect(lastTwoNumbers([])).toBeNull();
    expect(lastTwoNumbers([1])).toBeNull();
  });

  it('renvoie null si la dernière valeur est null', () => {
    expect(lastTwoNumbers([1, null])).toBeNull();
  });

  it('renvoie null si l’avant-dernière valeur est null', () => {
    expect(lastTwoNumbers([null, 1])).toBeNull();
  });
});
