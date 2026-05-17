import { createDefaultModernProject } from '@vibe-creator/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorAsset } from '@/stores/editor-store';
import {
  buildVideoStudioProjectPayload,
  isLocalVideoStudioSessionId,
  loadVideoStudioProjectSession,
  parseVideoStudioProjectRecord,
  saveVideoStudioProjectSession,
} from './video-studio-project-api';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

const exportApiMock = vi.hoisted(() => ({
  uploadMedia: vi.fn(),
}));

const studioAssetsApiMock = vi.hoisted(() => ({
  attachStudioAssetToProject: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  api: apiMock,
  authFetch: vi.fn(),
}));

vi.mock('@/services/export-api', () => ({
  exportApi: exportApiMock,
}));

vi.mock('@/services/video-studio-assets-api', () => ({
  attachStudioAssetToProject: studioAssetsApiMock.attachStudioAssetToProject,
}));

const videoAsset: EditorAsset = {
  id: 'asset-video',
  name: 'clip.mp4',
  type: 'VIDEO',
  url: 'blob:clip',
  file: new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
  durationMs: 3000,
};

function createProject(projectId = 'project-local') {
  return createDefaultModernProject(projectId, 'Video Draft');
}

function createProjectRecord(projectId: string, project = createProject(projectId)) {
  return {
    id: projectId,
    title: project.title,
    mode: 'TIMELINE',
    storyData: buildVideoStudioProjectPayload(project, [videoAsset], '2026-05-09T07:00:00.000Z'),
  };
}

describe('video studio project api', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.patch.mockReset();
    apiMock.post.mockReset();
    exportApiMock.uploadMedia.mockReset();
    studioAssetsApiMock.attachStudioAssetToProject.mockReset();
    exportApiMock.uploadMedia.mockResolvedValue({
      uploadToken: 'uploaded-video.mp4',
      mimetype: 'video/mp4',
      size: 5,
      mediaType: 'video',
    });
  });

  it('builds a backend payload without browser File objects', () => {
    const payload = buildVideoStudioProjectPayload(
      createProject(),
      [videoAsset],
      '2026-05-09T07:00:00.000Z',
    );

    expect(payload.kind).toBe('video-studio-modern-project');
    expect(payload.assets).toEqual([
      {
        id: 'asset-video',
        name: 'clip.mp4',
        type: 'VIDEO',
        url: 'blob:clip',
        durationMs: 3000,
      },
    ]);
  });

  it('normalizes backend project ID over the persisted document ID', () => {
    const parsed = parseVideoStudioProjectRecord(
      createProjectRecord('server-project', createProject('old-local-id')),
    );

    expect(parsed.id).toBe('server-project');
    expect(parsed.project.id).toBe('server-project');
  });

  it('creates a backend project for local session IDs and patches the final ID into story data', async () => {
    apiMock.post.mockResolvedValueOnce({
      success: true,
      data: { id: 'server-project', title: 'Video Draft', mode: 'TIMELINE', storyData: null },
    });
    apiMock.post.mockResolvedValueOnce({
      success: true,
      data: { id: 'asset-video', sourceUrl: '/api/v1/projects/assets/asset-video/file' },
    });
    apiMock.patch.mockResolvedValueOnce({
      success: true,
      data: createProjectRecord('server-project'),
    });

    const session = await saveVideoStudioProjectSession(createProject(), [videoAsset]);

    expect(isLocalVideoStudioSessionId('project-local')).toBe(true);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/projects',
      expect.objectContaining({ mode: 'TIMELINE', title: 'Video Draft' }),
    );
    expect(apiMock.patch).toHaveBeenCalledWith(
      '/projects/server-project',
      expect.objectContaining({
        storyData: expect.objectContaining({
          project: expect.objectContaining({ id: 'server-project' }),
        }),
      }),
    );
    expect(session.project.id).toBe('server-project');
  });

  it('falls back to create when an existing session was removed from backend', async () => {
    apiMock.patch.mockResolvedValueOnce({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Project not found' },
    });
    apiMock.post.mockResolvedValueOnce({
      success: true,
      data: { id: 'new-server-project', title: 'Video Draft', mode: 'TIMELINE', storyData: null },
    });
    apiMock.post.mockResolvedValueOnce({
      success: true,
      data: { id: 'asset-video', sourceUrl: '/api/v1/projects/assets/asset-video/file' },
    });
    apiMock.patch.mockResolvedValueOnce({
      success: true,
      data: createProjectRecord('new-server-project'),
    });

    const session = await saveVideoStudioProjectSession(createProject('server-missing'), [
      videoAsset,
    ]);

    expect(apiMock.patch).toHaveBeenNthCalledWith(
      1,
      '/projects/server-missing',
      expect.objectContaining({ mode: 'TIMELINE' }),
    );
    expect(session.id).toBe('new-server-project');
  });

  it('loads and validates a Video Studio session', async () => {
    apiMock.get.mockResolvedValueOnce({
      success: true,
      data: createProjectRecord('server-project'),
    });

    const session = await loadVideoStudioProjectSession('server-project');

    expect(apiMock.get).toHaveBeenCalledWith('/projects/server-project');
    expect(session.assets).toHaveLength(1);
    expect(session.project.id).toBe('server-project');
  });

  it('persists studio audio assets through the studio asset attach endpoint', async () => {
    const studioAsset: EditorAsset = {
      id: 'asset-studio',
      name: 'Meme Pop',
      type: 'AUDIO',
      url: '/api/v1/video-studio/assets/meme-pop/preview',
      studioAssetId: 'meme-pop',
      durationMs: 500,
    };
    studioAssetsApiMock.attachStudioAssetToProject.mockResolvedValueOnce({
      ...studioAsset,
      serverAssetId: 'asset-studio',
      serverUrl: '/api/v1/projects/assets/asset-studio/file',
    });
    apiMock.patch.mockResolvedValueOnce({
      success: true,
      data: createProjectRecord('server-project', createProject('server-project')),
    });
    apiMock.patch.mockResolvedValueOnce({
      success: true,
      data: createProjectRecord('server-project', createProject('server-project')),
    });

    await saveVideoStudioProjectSession(createProject('server-project'), [studioAsset]);

    expect(studioAssetsApiMock.attachStudioAssetToProject).toHaveBeenCalledWith(
      'server-project',
      studioAsset,
    );
  });
});
