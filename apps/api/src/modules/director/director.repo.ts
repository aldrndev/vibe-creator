/**
 * Director Repository
 * Tenant-scoped data access for Director module
 */

import { DirectorStep, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Comprehensive type including all relations needed for the UI
export type DirectorSessionWithDetails = Prisma.DirectorSessionGetPayload<{
  include: {
    asset: true;
    analysisJob: {
      include: {
        candidates: true;
      };
    };
    selectedClips: {
      include: {
        candidate: true;
        transcript: true;
      };
    };
    subtitleStyle: true;
    transcribeJob: true;
    exportJob: true;
  };
}>;

export const directorRepo = {
  /**
   * Find a session by ID and User ID (Tenant Scoped)
   * Includes all necessary relations for the full dashboard view
   */
  async findSession(sessionId: string, userId: string): Promise<DirectorSessionWithDetails | null> {
    return prisma.directorSession.findFirst({
      where: {
        id: sessionId,
        userId, // STRICT TENANT SCOPE
      },
      include: {
        asset: true,
        analysisJob: {
          include: {
            candidates: {
              orderBy: { rank: 'asc' },
            },
          },
        },
        selectedClips: {
          include: {
            candidate: true,
            transcript: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        subtitleStyle: true,
        transcribeJob: true,
        exportJob: true,
      },
      // Type cast needed because Prisma types are sometimes too specific with 'null' vs 'undefined' in deep includes
    }) as Promise<DirectorSessionWithDetails | null>;
  },

  /**
   * Create a new session for a user
   */
  async createSession(userId: string) {
    return prisma.directorSession.create({
      data: {
        userId,
        step: DirectorStep.IMPORT,
      },
    });
  },

  /**
   * Delete a session (Tenant Scoped)
   */
  async deleteSession(sessionId: string, userId: string) {
    // Prisma deleteMany is safer for tenancy than delete + check
    // But typically we want 404 if not found.
    // Standard pattern: count/findFirst then delete, or deleteMany and check count.
    // For strictness, deleteMany ensures we never delete someone else's by ID only.
    const result = await prisma.directorSession.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });
    return result.count > 0;
  },

  /**
   * Update session step
   */
  async updateStep(sessionId: string, userId: string, step: DirectorStep) {
    try {
      return await prisma.directorSession.update({
        where: { id: sessionId, userId }, // Prisma allows unique constraint filter, so this fails if userid doesn't match?
        // Actually for updates, 'id' is unique, so 'where' must uniquely identify.
        // Prisma update requires unique input. {id, userId} might not be a composite unique key.
        // So we must rely on findFirst (authorization) then update(id).
        // OR use updateMany which supports arbitrary where clauses.
        data: { step },
      });
    } catch {
      // If composite key isn't supported in update, use updateMany
      const { count } = await prisma.directorSession.updateMany({
        where: { id: sessionId, userId },
        data: { step },
      });
      if (count === 0) throw new Error('Session not found or access denied');
      return { id: sessionId, step };
    }
  },

  async exists(sessionId: string, userId: string): Promise<boolean> {
    const count = await prisma.directorSession.count({
      where: { id: sessionId, userId },
    });
    return count > 0;
  },

  /**
   * Upsert subtitle style
   */
  async upsertSubtitleStyle(
    sessionId: string,
    data: {
      fontToken?: string;
      textColorToken?: string;
      bgColorToken?: string;
      fontSize?: number;
      position?: string;
      animation?: string;
    },
  ) {
    return prisma.directorSubtitleStyle.upsert({
      where: { sessionId },
      create: {
        sessionId,
        ...data,
      },
      update: data,
    });
  },

  // ===========================================================================
  // ASSET METHODS
  // ===========================================================================

  async findAssetBySession(sessionId: string) {
    return prisma.directorAsset.findUnique({ where: { sessionId } });
  },

  async findLatestReusableUrlAsset(sourceUrlNormalized: string) {
    return prisma.directorAsset.findFirst({
      where: {
        sourceUrlNormalized,
        ingestStatus: 'READY',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findLatestReusableContentAsset(contentHash: string) {
    return prisma.directorAsset.findFirst({
      where: {
        contentHash,
        ingestStatus: 'READY',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async findReusableContentAssetCandidates(sizeBytes: bigint, durationMs?: number) {
    return prisma.directorAsset.findMany({
      where: {
        ingestStatus: 'READY',
        sizeBytes,
        ...(typeof durationMs === 'number'
          ? {
              durationMs: {
                gte: durationMs - 2000,
                lte: durationMs + 2000,
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
  },

  async findAssetByIdForUser(assetId: string, userId: string) {
    return prisma.directorAsset.findFirst({
      where: {
        id: assetId,
        session: {
          userId,
        },
      },
    });
  },

  async createAsset(data: Prisma.DirectorAssetUncheckedCreateInput) {
    return prisma.directorAsset.create({ data });
  },

  async updateAsset(id: string, data: Prisma.DirectorAssetUpdateInput) {
    return prisma.directorAsset.update({ where: { id }, data });
  },

  async deleteAsset(id: string) {
    return prisma.directorAsset.delete({ where: { id } });
  },

  // ===========================================================================
  // ANALYSIS METHODS
  // ===========================================================================

  async createAnalysisJob(data: Prisma.DirectorAnalysisJobUncheckedCreateInput) {
    return prisma.directorAnalysisJob.create({ data });
  },

  async upsertAnalysisJobBySession(
    sessionId: string,
    create: Omit<Prisma.DirectorAnalysisJobUncheckedCreateInput, 'sessionId'>,
    update: Prisma.DirectorAnalysisJobUpdateInput,
  ) {
    return prisma.directorAnalysisJob.upsert({
      where: { sessionId },
      create: {
        sessionId,
        ...create,
      },
      update,
    });
  },

  async updateAnalysisJob(id: string, data: Prisma.DirectorAnalysisJobUpdateInput) {
    return prisma.directorAnalysisJob.update({
      where: { id },
      data,
    });
  },

  async findLatestReusableAnalysisByAsset(asset: {
    contentHash?: string | null;
    sourceUrlNormalized?: string | null;
    storageKey: string;
  }) {
    const assetFilter = asset.contentHash
      ? { contentHash: asset.contentHash }
      : asset.sourceUrlNormalized
        ? { sourceUrlNormalized: asset.sourceUrlNormalized }
        : { storageKey: asset.storageKey };

    return prisma.directorAnalysisJob.findFirst({
      where: {
        status: 'COMPLETED',
        candidates: {
          some: {},
        },
        session: {
          asset: assetFilter,
        },
      },
      include: {
        candidates: {
          orderBy: { rank: 'asc' },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
  },

  // ===========================================================================
  // CLIP METHODS
  // ===========================================================================

  async deleteSelectedClips(sessionId: string) {
    return prisma.directorSelectedClip.deleteMany({ where: { sessionId } });
  },

  async createSelectedClips(clips: Prisma.DirectorSelectedClipUncheckedCreateInput[]) {
    // Transactional create to ensure atomic selection
    return prisma.$transaction(
      clips.map((clip) =>
        prisma.directorSelectedClip.create({
          data: clip,
          include: { candidate: true },
        }),
      ),
    );
  },

  async findSelectedClip(clipId: string, sessionId: string) {
    return prisma.directorSelectedClip.findFirst({
      where: { id: clipId, sessionId },
    });
  },

  async updateSelectedClip(clipId: string, data: Prisma.DirectorSelectedClipUpdateInput) {
    return prisma.directorSelectedClip.update({
      where: { id: clipId },
      data,
      include: { candidate: true },
    });
  },

  async deleteSelectedClip(clipId: string) {
    return prisma.directorSelectedClip.delete({
      where: { id: clipId },
    });
  },

  async countSelectedClips(sessionId: string) {
    return prisma.directorSelectedClip.count({
      where: { sessionId },
    });
  },

  async updateClipTranscript(clipId: string, segments: object[]) {
    return prisma.directorClipTranscript.update({
      where: { selectedClipId: clipId },
      data: {
        segments,
        updatedAt: new Date(),
      },
    });
  },

  // ===========================================================================
  // TRANSCRIBE METHODS
  // ===========================================================================

  async createTranscribeJob(data: Prisma.DirectorTranscribeJobUncheckedCreateInput) {
    return prisma.directorTranscribeJob.create({ data });
  },

  async updateTranscribeJob(id: string, data: Prisma.DirectorTranscribeJobUpdateInput) {
    return prisma.directorTranscribeJob.update({
      where: { id },
      data,
    });
  },

  // ===========================================================================
  // EXPORT METHODS
  // ===========================================================================

  async createExportJob(data: Prisma.DirectorExportJobUncheckedCreateInput) {
    return prisma.directorExportJob.create({ data });
  },
};
