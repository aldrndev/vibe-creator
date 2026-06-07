import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'argon2';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function writeLine(message = '') {
  process.stdout.write(`${message}\n`);
}

async function main() {
  writeLine('🌱 Seeding database...');

  // Create demo user
  const demoUserPassword = await hash('demo123');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@vibecreator.id' },
    update: {},
    create: {
      email: 'demo@vibecreator.id',
      password: demoUserPassword,
      name: 'Demo User',
      role: UserRole.USER,
      subscription: {
        create: {
          tier: 'CREATOR',
          status: 'ACTIVE',
          exportsUsed: 3,
          exportsLimit: 50,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
    },
  });
  writeLine(`✅ Demo User created: ${demoUser.email}`);

  // Create admin user
  const adminPassword = await hash('Qwer@0856');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vibecreator.id' },
    update: {},
    create: {
      email: 'admin@vibecreator.id',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
      subscription: {
        create: {
          tier: 'PRO',
          status: 'ACTIVE',
          exportsUsed: 0,
          exportsLimit: 999999,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      },
    },
  });
  writeLine(`✅ Admin User created: ${adminUser.email}`);

  // Create free user
  const freeUserPassword = await hash('free123');
  const freeUser = await prisma.user.upsert({
    where: { email: 'free@vibecreator.id' },
    update: {},
    create: {
      email: 'free@vibecreator.id',
      password: freeUserPassword,
      name: 'Free User',
      role: UserRole.USER,
      subscription: {
        create: {
          tier: 'FREE',
          status: 'ACTIVE',
          exportsUsed: 4,
          exportsLimit: 5,
        },
      },
    },
  });
  writeLine(`✅ Free User created: ${freeUser.email}`);

  writeLine();
  writeLine('🎉 Database seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
