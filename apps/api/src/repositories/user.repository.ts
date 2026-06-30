export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

/**
 * Contrat d'accès aux utilisateurs (port). Le code métier dépend de cette
 * interface, pas de Prisma → on peut injecter une fausse implémentation en test.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
}
