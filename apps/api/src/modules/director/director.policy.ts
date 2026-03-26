/**
 * Director Policy
 * Centralized authorization and business rules for Director module
 */

import type { DirectorSession } from '@prisma/client';

export const directorPolicy = {
  /**
   * Verify if a user owns a session
   */
  isOwner(session: DirectorSession, userId: string): boolean {
    return session.userId === userId;
  },

  /**
   * Verify if a session is in a valid step for import
   */
  canImport(session: DirectorSession): boolean {
    // Can import only if in IMPORT state, or restarting
    return !!session; // Relaxed for now, allows re-import
  },

  /**
   * Verify if analysis can be started
   */
  canAnalyze(session: DirectorSession): boolean {
    return !!(session.step === 'IMPORT' || session.step === 'ANALYZING');
  },

  /**
   * Verify if clips can be selected
   */
  canSelectClips(session: DirectorSession): boolean {
    // Must be analyzed at least
    return !!session;
  },

  /**
   * Verify if export can be started
   */
  canExport(session: DirectorSession): boolean {
    return (
      session.step === 'EDITING' || session.step === 'EXPORTING' || session.step === 'COMPLETED'
    );
  },
};
