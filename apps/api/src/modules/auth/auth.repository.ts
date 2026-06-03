import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
};

type SubscriptionProfile = {
  tier: 'FREE' | 'CREATOR' | 'PRO';
  status: string;
  exportsUsed: number;
  exportsLimit: number;
  validUntil: Date | null;
} | null;

export interface AuthProfileSnapshot {
  user: UserProfile;
  subscription: SubscriptionProfile;
}

export interface PasswordUpdateInput {
  readonly userId: string;
  readonly passwordHash: string;
  readonly currentRefreshTokenHash?: string;
}

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
} satisfies Prisma.UserSelect;

const subscriptionProfileSelect = {
  tier: true,
  status: true,
  exportsUsed: true,
  exportsLimit: true,
  validUntil: true,
} satisfies Prisma.SubscriptionSelect;

export async function findAuthProfile(userId: string): Promise<AuthProfileSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect,
  });

  if (!user) {
    return null;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: subscriptionProfileSelect,
  });

  return { user, subscription };
}

export async function updateUserProfile(
  userId: string,
  data: { readonly name?: string; readonly avatarUrl?: string | null },
): Promise<AuthProfileSnapshot | null> {
  await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true },
  });

  return findAuthProfile(userId);
}

export async function findUserPasswordHash(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  return user?.password ?? null;
}

export async function updatePasswordAndRevokeOtherSessions(
  input: PasswordUpdateInput,
): Promise<number> {
  const { userId, passwordHash, currentRefreshTokenHash } = input;

  const [, revokeResult] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
      select: { id: true },
    }),
    currentRefreshTokenHash
      ? prisma.userSession.deleteMany({
          where: {
            userId,
            refreshToken: { not: currentRefreshTokenHash },
          },
        })
      : prisma.userSession.deleteMany({
          where: {
            userId,
            id: '__no_session_to_delete__',
          },
        }),
  ]);

  return revokeResult.count;
}
