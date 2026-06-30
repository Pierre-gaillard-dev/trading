import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hachage de mot de passe avec scrypt (intégré à Node, aucune dépendance).
 * On stocke `sel:hash` ; le mot de passe en clair n'est jamais conservé.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);

  // Comparaison à temps constant (évite de fuiter de l'info via le temps de réponse).
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
