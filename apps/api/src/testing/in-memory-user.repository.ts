import { hashPassword } from '../auth/password';
import type { UserRecord, UserRepository } from '../repositories/user.repository';

/**
 * Faux repository en mémoire (le « mock » de base de données), pour les tests.
 * Aucune connexion à Postgres : on lui passe la liste d'utilisateurs voulue.
 */
export class InMemoryUserRepository implements UserRepository {
  constructor(private readonly users: UserRecord[] = []) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    const target = email.trim().toLowerCase();
    return Promise.resolve(this.users.find((user) => user.email.toLowerCase() === target) ?? null);
  }
}

/** Construit un utilisateur de test avec un mot de passe déjà haché (comme en base). */
export function aUser(params: { email: string; password: string; id?: string }): UserRecord {
  return {
    id: params.id ?? 'usr_test',
    email: params.email,
    passwordHash: hashPassword(params.password),
  };
}
