import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { DEMO_ACCOUNT } from '@trading/shared';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { email: DEMO_ACCOUNT.email },
    update: {},
    create: {
      email: DEMO_ACCOUNT.email,
      passwordHash: hashPassword(DEMO_ACCOUNT.password),
    },
  });
  console.log(`Compte de démo prêt : ${DEMO_ACCOUNT.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
