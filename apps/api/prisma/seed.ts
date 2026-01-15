import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "argon2";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const demoUserPassword = await hash("demo123");
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@vibecreator.id" },
    update: {},
    create: {
      email: "demo@vibecreator.id",
      password: demoUserPassword,
      name: "Demo User",
      role: UserRole.USER,
      subscription: {
        create: {
          tier: "CREATOR",
          status: "ACTIVE",
          exportsUsed: 3,
          exportsLimit: 50,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
    },
  });
  console.log(`✅ Demo User created: ${demoUser.email}`);

  // Create admin user
  const adminPassword = await hash("admin123");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@vibecreator.id" },
    update: {},
    create: {
      email: "admin@vibecreator.id",
      password: adminPassword,
      name: "Admin User",
      role: UserRole.ADMIN,
      subscription: {
        create: {
          tier: "PRO",
          status: "ACTIVE",
          exportsUsed: 0,
          exportsLimit: 999999,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      },
    },
  });
  console.log(`✅ Admin User created: ${adminUser.email}`);

  // Create free user
  const freeUserPassword = await hash("free123");
  const freeUser = await prisma.user.upsert({
    where: { email: "free@vibecreator.id" },
    update: {},
    create: {
      email: "free@vibecreator.id",
      password: freeUserPassword,
      name: "Free User",
      role: UserRole.USER,
      subscription: {
        create: {
          tier: "FREE",
          status: "ACTIVE",
          exportsUsed: 4,
          exportsLimit: 5,
        },
      },
    },
  });
  console.log(`✅ Free User created: ${freeUser.email}`);

  console.log("");
  console.log("🎉 Database seeded successfully!");
  console.log("");
  console.log("Demo Accounts:");
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│ Email                    │ Password  │ Role    │ Tier  │");
  console.log("├─────────────────────────────────────────────────────────┤");
  console.log("│ demo@vibecreator.id      │ demo123   │ USER    │ CREATOR│");
  console.log("│ admin@vibecreator.id     │ admin123  │ ADMIN   │ PRO    │");
  console.log("│ free@vibecreator.id      │ free123   │ USER    │ FREE   │");
  console.log("└─────────────────────────────────────────────────────────┘");
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
