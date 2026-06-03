import type { Prisma, UserStatus } from '@prisma/client';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getExportLimitForTier, resolveSubscriptionValidUntil } from '@/lib/subscription-limits';
import type {
  AdminUpdateSubscriptionInput,
  AdminUpdateUserStatusInput,
  AdminUsersQuery,
} from './admin.schemas';

export type AdminServiceErrorCode = 'NOT_FOUND' | 'SELF_ACTION_FORBIDDEN';

export class AdminServiceError extends Error {
  constructor(
    readonly code: AdminServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

const ACTIVE_USER_WHERE = { status: 'ACTIVE' as const };

function buildUserWhere(query: AdminUsersQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  const and: Prisma.UserWhereInput[] = [];

  if (query.status !== 'ALL') {
    where.status = query.status;
  }

  if (query.search) {
    and.push({
      OR: [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }

  if (query.tier === 'FREE') {
    and.push({
      OR: [{ subscription: null }, { subscription: { tier: 'FREE' } }],
    });
  } else if (query.tier !== 'ALL') {
    where.subscription = { tier: query.tier };
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

function buildUserOrderBy(query: AdminUsersQuery): Prisma.UserOrderByWithRelationInput {
  if (query.sortBy === 'exportsUsed') {
    return { subscription: { exportsUsed: query.sortOrder } };
  }

  return { [query.sortBy]: query.sortOrder };
}

async function ensureUserExists(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new AdminServiceError('NOT_FOUND', 'User not found');
  }
}

export const adminService = {
  async getStats() {
    const [
      activeUsers,
      suspendedUsers,
      deletedUsers,
      totalProjects,
      totalExports,
      totalPayments,
      creatorUsers,
      proUsers,
      recentUsers,
      recentExports,
      revenueAggregate,
    ] = await Promise.all([
      prisma.user.count({ where: ACTIVE_USER_WHERE }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { status: 'DELETED' } }),
      prisma.project.count(),
      prisma.exportHistory.count(),
      prisma.paymentHistory.count({ where: { status: 'PAID' } }),
      prisma.user.count({ where: { ...ACTIVE_USER_WHERE, subscription: { tier: 'CREATOR' } } }),
      prisma.user.count({ where: { ...ACTIVE_USER_WHERE, subscription: { tier: 'PRO' } } }),
      prisma.user.count({
        where: {
          ...ACTIVE_USER_WHERE,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.exportHistory.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.paymentHistory.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const freeUsers = Math.max(0, activeUsers - creatorUsers - proUsers);

    return {
      users: {
        total: activeUsers,
        recent: recentUsers,
        byTier: { free: freeUsers, creator: creatorUsers, pro: proUsers },
        byStatus: { active: activeUsers, suspended: suspendedUsers, deleted: deletedUsers },
      },
      projects: totalProjects,
      exports: { total: totalExports, recent: recentExports },
      revenue: { total: revenueAggregate._sum.amount ?? 0, payments: totalPayments },
    };
  },

  async getUsers(query: AdminUsersQuery) {
    const skip = (query.page - 1) * query.limit;
    const where = buildUserWhere(query);
    const orderBy = buildUserOrderBy(query);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          status: true,
          deletedAt: true,
          suspendedAt: true,
          suspensionReason: true,
          createdAt: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              exportsUsed: true,
              exportsLimit: true,
              validUntil: true,
            },
          },
          _count: { select: { projects: true, exports: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  },

  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        deletedAt: true,
        suspendedAt: true,
        suspensionReason: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
        projects: { take: 10, orderBy: { createdAt: 'desc' } },
        exports: { take: 10, orderBy: { createdAt: 'desc' } },
        payments: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      throw new AdminServiceError('NOT_FOUND', 'User not found');
    }

    return user;
  },

  async updateUserSubscription(userId: string, input: AdminUpdateSubscriptionInput) {
    await ensureUserExists(userId);

    const previous = await prisma.subscription.findUnique({ where: { userId } });
    const exportsLimit = getExportLimitForTier(input.tier);
    const validUntil = resolveSubscriptionValidUntil(input.tier, input.validDays);
    const usagePatch = input.resetUsage ? { exportsUsed: 0 } : {};

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: input.tier,
        status: 'ACTIVE',
        exportsUsed: 0,
        exportsLimit,
        validUntil,
      },
      update: {
        tier: input.tier,
        status: 'ACTIVE',
        exportsLimit,
        validUntil,
        ...usagePatch,
      },
    });

    logger.info({ userId, tier: input.tier, validUntil }, 'User subscription updated by admin');
    return { subscription, previous };
  },

  async updateUserStatus(
    actorUserId: string,
    targetUserId: string,
    input: AdminUpdateUserStatusInput,
  ) {
    if (actorUserId === targetUserId) {
      throw new AdminServiceError('SELF_ACTION_FORBIDDEN', 'Admin cannot change own status');
    }

    await ensureUserExists(targetUserId);

    const statusPatch = resolveUserStatusPatch(input.status, input.reason);

    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: statusPatch,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          suspendedAt: true,
          deletedAt: true,
          suspensionReason: true,
        },
      }),
      prisma.userSession.deleteMany({ where: { userId: targetUserId } }),
    ]);

    logger.info({ targetUserId, status: input.status }, 'User status updated by admin');
    return user;
  },

  async softDeleteUser(actorUserId: string, targetUserId: string) {
    return this.updateUserStatus(actorUserId, targetUserId, {
      status: 'DELETED',
      reason: 'Deleted by admin',
    });
  },

  async getRecentActivity(limit = 20) {
    const [exports, payments, users] = await Promise.all([
      prisma.exportHistory.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, createdAt: true, user: { select: { name: true } } },
      }),
      prisma.paymentHistory.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          tier: true,
          status: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        take: limit,
        where: ACTIVE_USER_WHERE,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    return [
      ...exports.map((entry) => ({ type: 'export' as const, ...entry })),
      ...payments.map((entry) => ({ type: 'payment' as const, ...entry })),
      ...users.map((entry) => ({ type: 'signup' as const, ...entry })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async getAnnouncements() {
    return prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  },

  async createAnnouncement(title: string, content: string) {
    const announcement = await prisma.announcement.create({ data: { title, content } });
    logger.info({ id: announcement.id }, 'Announcement created');
    return announcement;
  },

  async updateAnnouncement(
    id: string,
    data: { title?: string; content?: string; isActive?: boolean },
  ) {
    const announcement = await prisma.announcement.update({ where: { id }, data });
    logger.info({ id }, 'Announcement updated');
    return announcement;
  },

  async deleteAnnouncement(id: string) {
    await prisma.announcement.delete({ where: { id } });
    logger.info({ id }, 'Announcement deleted');
  },
};

function resolveUserStatusPatch(status: UserStatus, reason?: string): Prisma.UserUpdateInput {
  if (status === 'ACTIVE') {
    return {
      status,
      deletedAt: null,
      suspendedAt: null,
      suspensionReason: null,
    };
  }

  if (status === 'SUSPENDED') {
    return {
      status,
      deletedAt: null,
      suspendedAt: new Date(),
      suspensionReason: reason ?? null,
    };
  }

  return {
    status,
    deletedAt: new Date(),
    suspendedAt: null,
    suspensionReason: reason ?? null,
  };
}
