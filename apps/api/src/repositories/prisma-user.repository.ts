import { PrismaClient } from '@prisma/client';
import type { UserRecord, UserRepository } from './user.repository';

/** Implémentation réelle : lit les utilisateurs dans PostgreSQL via Prisma. */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient = new PrismaClient()) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, passwordHash: true },
    });
  }
}
