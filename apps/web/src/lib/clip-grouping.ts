/**
 * Clip Grouping and Track Locking System
 * Allows grouping multiple clips for synchronized editing and locking tracks to prevent accidental changes
 */

/**
 * Clip group - multiple clips that move/edit together
 */
export interface ClipGroup {
  id: string;
  name: string;
  /** IDs of clips in this group */
  clipIds: string[];
  /** Color for visual identification */
  color: string;
  /** Whether the group is locked (prevents editing) */
  locked: boolean;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Track lock state
 */
export interface TrackLockState {
  trackId: string;
  /** Prevent all editing */
  locked: boolean;
  /** Prevent deletion only */
  deleteLocked: boolean;
  /** Prevent moving clips */
  moveLocked: boolean;
}

/**
 * Group colors for visual distinction
 */
export const GROUP_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
] as const;

/**
 * Generate unique group ID
 */
export function createGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new clip group
 */
export function createClipGroup(
  clipIds: string[],
  name?: string,
  color?: string
): ClipGroup {
  const colorIndex = Math.floor(Math.random() * GROUP_COLORS.length);
  
  return {
    id: createGroupId(),
    name: name || `Group ${Date.now() % 1000}`,
    clipIds,
    color: color || GROUP_COLORS[colorIndex] || GROUP_COLORS[0],
    locked: false,
    createdAt: Date.now(),
  };
}

/**
 * Add clips to an existing group
 */
export function addClipsToGroup(
  group: ClipGroup,
  clipIds: string[]
): ClipGroup {
  const newClipIds = [...new Set([...group.clipIds, ...clipIds])];
  return { ...group, clipIds: newClipIds };
}

/**
 * Remove clips from a group
 */
export function removeClipsFromGroup(
  group: ClipGroup,
  clipIds: string[]
): ClipGroup {
  const clipIdSet = new Set(clipIds);
  return {
    ...group,
    clipIds: group.clipIds.filter(id => !clipIdSet.has(id)),
  };
}

/**
 * Find which group a clip belongs to
 */
export function findClipGroup(
  clipId: string,
  groups: ClipGroup[]
): ClipGroup | undefined {
  return groups.find(g => g.clipIds.includes(clipId));
}

/**
 * Get all clips in the same group as the given clip
 */
export function getGroupedClipIds(
  clipId: string,
  groups: ClipGroup[]
): string[] {
  const group = findClipGroup(clipId, groups);
  return group ? group.clipIds : [clipId];
}

/**
 * Check if a clip is in any group
 */
export function isClipInGroup(
  clipId: string,
  groups: ClipGroup[]
): boolean {
  return groups.some(g => g.clipIds.includes(clipId));
}

/**
 * Check if a clip's group is locked
 */
export function isClipLocked(
  clipId: string,
  groups: ClipGroup[]
): boolean {
  const group = findClipGroup(clipId, groups);
  return group?.locked ?? false;
}

/**
 * Toggle group lock
 */
export function toggleGroupLock(group: ClipGroup): ClipGroup {
  return { ...group, locked: !group.locked };
}

/**
 * Rename a group
 */
export function renameGroup(group: ClipGroup, name: string): ClipGroup {
  return { ...group, name };
}

/**
 * Change group color
 */
export function changeGroupColor(group: ClipGroup, color: string): ClipGroup {
  return { ...group, color };
}

/**
 * Dissolve a group (ungroup all clips)
 */
export function dissolveGroup(groups: ClipGroup[], groupId: string): ClipGroup[] {
  return groups.filter(g => g.id !== groupId);
}

/**
 * Merge multiple groups into one
 */
export function mergeGroups(
  groups: ClipGroup[],
  groupIds: string[],
  mergedName?: string
): ClipGroup[] {
  const toMerge = groups.filter(g => groupIds.includes(g.id));
  const remaining = groups.filter(g => !groupIds.includes(g.id));
  
  if (toMerge.length < 2) return groups;
  
  const allClipIds = toMerge.flatMap(g => g.clipIds);
  const mergedGroup = createClipGroup(
    [...new Set(allClipIds)],
    mergedName || toMerge[0]?.name || 'Merged Group',
    toMerge[0]?.color
  );
  
  return [...remaining, mergedGroup];
}

// Track locking utilities

/**
 * Create default track lock state
 */
export function createTrackLockState(trackId: string): TrackLockState {
  return {
    trackId,
    locked: false,
    deleteLocked: false,
    moveLocked: false,
  };
}

/**
 * Check if any operation is locked on a track
 */
export function isTrackLocked(
  trackId: string,
  lockStates: TrackLockState[]
): boolean {
  const state = lockStates.find(s => s.trackId === trackId);
  return state?.locked ?? false;
}

/**
 * Check specific lock type
 */
export function isTrackOperationLocked(
  trackId: string,
  operation: 'delete' | 'move' | 'all',
  lockStates: TrackLockState[]
): boolean {
  const state = lockStates.find(s => s.trackId === trackId);
  if (!state) return false;
  
  if (state.locked) return true;
  
  switch (operation) {
    case 'delete':
      return state.deleteLocked;
    case 'move':
      return state.moveLocked;
    case 'all':
      return state.locked;
    default:
      return false;
  }
}

/**
 * Update track lock state
 */
export function updateTrackLock(
  lockStates: TrackLockState[],
  trackId: string,
  updates: Partial<Omit<TrackLockState, 'trackId'>>
): TrackLockState[] {
  const existing = lockStates.find(s => s.trackId === trackId);
  
  if (existing) {
    return lockStates.map(s =>
      s.trackId === trackId ? { ...s, ...updates } : s
    );
  }
  
  return [...lockStates, { ...createTrackLockState(trackId), ...updates }];
}

/**
 * Toggle full track lock
 */
export function toggleTrackLock(
  lockStates: TrackLockState[],
  trackId: string
): TrackLockState[] {
  const current = isTrackLocked(trackId, lockStates);
  return updateTrackLock(lockStates, trackId, { locked: !current });
}
