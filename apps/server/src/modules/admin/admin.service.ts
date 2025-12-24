import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Admin service for dashboard statistics and user management
 */
export const adminService = {
  /**
   * Get dashboard statistics
   */
  async getStats() {
    const [
      totalUsers,
      totalProjects,
      totalExports,
      totalPayments,
      freeUsers,
      creatorUsers,
      proUsers,
      recentUsers,
      recentExports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.exportHistory.count(),
      prisma.paymentHistory.count({ where: { status: 'PAID' } }),
      prisma.subscription.count({ where: { tier: 'FREE' } }),
      prisma.subscription.count({ where: { tier: 'CREATOR' } }),
      prisma.subscription.count({ where: { tier: 'PRO' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        },
      }),
      prisma.exportHistory.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours
          },
        },
      }),
    ]);

    // Calculate revenue from payments
    const paidPayments = await prisma.paymentHistory.findMany({
      where: { status: 'PAID' },
      select: { amount: true },
    });
    const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      users: {
        total: totalUsers,
        recent: recentUsers,
        byTier: {
          free: freeUsers,
          creator: creatorUsers,
          pro: proUsers,
        },
      },
      projects: totalProjects,
      exports: {
        total: totalExports,
        recent: recentExports,
      },
      revenue: {
        total: totalRevenue,
        payments: totalPayments,
      },
    };
  },

  /**
   * Get users list with pagination
   */
  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
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
          _count: {
            select: {
              projects: true,
              exports: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get user details
   */
  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
        projects: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        exports: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  /**
   * Update user subscription manually
   */
  async updateUserSubscription(
    userId: string, 
    tier: 'FREE' | 'CREATOR' | 'PRO',
    validDays = 30
  ) {
    const validUntil = tier === 'FREE' 
      ? null 
      : new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    const exportsLimit = tier === 'FREE' ? 5 : tier === 'CREATOR' ? 50 : 999999;

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: 'ACTIVE',
        exportsUsed: 0,
        exportsLimit,
        validUntil,
      },
      update: {
        tier,
        status: 'ACTIVE',
        exportsUsed: 0,
        exportsLimit,
        validUntil,
      },
    });

    logger.info({ userId, tier, validUntil }, 'User subscription updated by admin');

    return subscription;
  },

  /**
   * Delete user (soft delete or full)
   */
  async deleteUser(userId: string) {
    // Delete user and cascade
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info({ userId }, 'User deleted by admin');
  },

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20) {
    const [exports, payments, users] = await Promise.all([
      prisma.exportHistory.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
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
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);

    // Combine and sort by date
    const activities = [
      ...exports.map(e => ({ 
        type: 'export' as const, 
        ...e, 
        description: `Export ${e.status.toLowerCase()}`,
      })),
      ...payments.map(p => ({ 
        type: 'payment' as const, 
        ...p,
        description: `Payment Rp ${p.amount.toLocaleString()} for ${p.tier}`,
      })),
      ...users.map(u => ({ 
        type: 'signup' as const, 
        ...u,
        description: `New user registered`,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, limit);

    return activities;
  },

  // ============================================================================
  // ANNOUNCEMENTS
  // ============================================================================

  /**
   * Get all announcements
   */
  async getAnnouncements() {
    return prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Create announcement
   */
  async createAnnouncement(title: string, content: string) {
    const announcement = await prisma.announcement.create({
      data: { title, content },
    });

    logger.info({ id: announcement.id, title }, 'Announcement created');
    return announcement;
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(
    id: string, 
    data: { title?: string; content?: string; isActive?: boolean }
  ) {
    const announcement = await prisma.announcement.update({
      where: { id },
      data,
    });

    logger.info({ id, ...data }, 'Announcement updated');
    return announcement;
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(id: string) {
    await prisma.announcement.delete({
      where: { id },
    });

    logger.info({ id }, 'Announcement deleted');
  },
};
