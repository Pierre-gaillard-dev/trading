import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('verifyPassword', () => {
  it('hashes and verifies a password correctly', () => {
    const password = 'StrongPassw0rd!';
    const hashed = hashPassword(password);
    expect(hashed).not.toBe(password);

    const isValid = verifyPassword(password, hashed);
    expect(isValid).toBe(true);
  });

  it('fails verification for an incorrect password', () => {
    const password = 'StrongPassw0rd!';
    const hashed = hashPassword(password);
    const isValid = verifyPassword('WrongPassword!', hashed);
    expect(isValid).toBe(false);
  });
});
