import type { PasswordCheck } from '../types/password';

/**
 * Règles de robustesse du mot de passe (vérifiées côté front ET côté serveur).
 * Fonction PURE : même entrée → même sortie, aucune IO. Facile à tester.
 */
export const PASSWORD_MIN_LENGTH = 12;

export function validatePassword(password: string): PasswordCheck {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Au moins ${PASSWORD_MIN_LENGTH} caractères`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Au moins une minuscule');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins une majuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins un chiffre');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Au moins un caractère spécial');
  }

  return { valid: errors.length === 0, errors };
}
