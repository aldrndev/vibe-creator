import {
  PrismaClient,
  UserRole,
  SubscriptionTier,
  SubscriptionStatus,
} from "@prisma/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

const users = [
  {
    email: "demo@vibecreator.id",
    password: "demo123",
    role: UserRole.USER,
    tier: SubscriptionTier.CREATOR,
    name: "Demo Creator",
  },
  {
    email: "admin@vibecreator.id",
    password: "admin123",
    role: UserRole.ADMIN,
    tier: SubscriptionTier.PRO,
    name: "Super Admin",
  },
  {
    email: "free@vibecreator.id",
    password: "free123",
    role: UserRole.USER,
    tier: SubscriptionTier.FREE,
    name: "Free User",
  },
];

async function main() {
  console.log(`🌱 Start seeding ${users.length} users...`);

  for (const u of users) {
    const hashedPassword = await hash(u.password);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        role: u.role,
      },
      create: {
        email: u.email,
        name: u.name,
        password: hashedPassword,
        role: u.role,
      },
    });

    // Determine limit based on tier
    let exportsLimit = 3;
    if (u.tier === SubscriptionTier.CREATOR) exportsLimit = 50;
    if (u.tier === SubscriptionTier.PRO) exportsLimit = 1000;

    // Upsert subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        tier: u.tier,
        status: SubscriptionStatus.ACTIVE,
        exportsLimit,
      },
      create: {
        userId: user.id,
        tier: u.tier,
        status: SubscriptionStatus.ACTIVE,
        exportsLimit,
      },
    });

    console.log(
      `✅ Created/Updated user: ${u.email} | Role: ${u.role} | Tier: ${u.tier}`
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Error Seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
