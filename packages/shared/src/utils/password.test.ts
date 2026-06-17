import { describe, expect, it } from 'vitest';
import { validatePassword } from './password';

describe('validatePassword', () => {
  it('should return valid for a strong password', () => {
    const result = validatePassword('StrongPassw0rd!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error if password is too short', () => {
    const result = validatePassword('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Au moins 12 caractères');
  });

  it("should return error if password doesn't contain a lowercase letter", () => {
    const result = validatePassword('STRONGPASSW0RD!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Au moins une minuscule');
  });

  it("should return error if password doesn't contain an uppercase letter", () => {
    const result = validatePassword('strongpassw0rd!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Au moins une majuscule');
  });

  it("should return error if password doesn't contain a digit", () => {
    const result = validatePassword('StrongPassword!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Au moins un chiffre');
  });

  it("should return error if password doesn't contain a special character", () => {
    const result = validatePassword('StrongPassw0rd');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Au moins un caractère spécial');
  });

  it('should return multiple errors for a weak password', () => {
    const result = validatePassword('weak');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Au moins 12 caractères');
    expect(result.errors).toContain('Au moins une majuscule');
    expect(result.errors).toContain('Au moins un chiffre');
    expect(result.errors).toContain('Au moins un caractère spécial');
  });
});
