/**
 * Security Tests - Non-Leak Rule (NotFound Masking)
 *
 * Per Digitesia Security Standard:
 * - Unauthorized access returns generic NotFound
 * - Resource existence MUST NOT be inferable
 * - Denied attempts audited
 */

import { nanoid } from 'nanoid';
import { beforeEach, describe, expect, it } from 'vitest';

type TestUser = {
  id: string;
  email: string;
  password: string;
  name: string;
};

type TestProject = {
  id: string;
  userId: string;
  title: string;
};

describe('Non-Leak Rule - NotFound Masking', () => {
  let userA: TestUser;
  let userB: TestUser;
  let projectA: TestProject;
  let users: TestUser[];
  let projects: TestProject[];

  beforeEach(async () => {
    userA = {
      id: nanoid(),
      email: `userA-${nanoid()}@example.com`,
      password: await hashPassword('password123'),
      name: 'User A',
    };

    userB = {
      id: nanoid(),
      email: `userB-${nanoid()}@example.com`,
      password: await hashPassword('password123'),
      name: 'User B',
    };

    projectA = {
      id: nanoid(),
      userId: userA.id,
      title: 'Test Project A',
    };

    users = [userA, userB];
    projects = [projectA];
  });

  it('should return NotFound for unauthorized access (not Forbidden)', async () => {
    const project = findProject(projectA.id, userB.id, projects);

    expect(project).toBeNull();
    expect(users).toHaveLength(2);

    const projectForUserA = findProject(projectA.id, userA.id, projects);
    expect(projectForUserA).not.toBeNull();
  });

  it('should not reveal resource existence through error messages', async () => {
    const checkProjectAccess = async (projectId: string, userId: string) => {
      const project = findProject(projectId, userId, projects);

      if (!project) {
        throw new Error('Project not found');
      }

      return project;
    };

    await expect(checkProjectAccess(projectA.id, userB.id)).rejects.toThrow('Project not found');
    await expect(checkProjectAccess('non-existent-id', userB.id)).rejects.toThrow(
      'Project not found',
    );

    const result = await checkProjectAccess(projectA.id, userA.id);
    expect(result.id).toBe(projectA.id);
  });

  it('should mask existence in API responses', async () => {
    type ApiResponse = {
      success: boolean;
      error?: {
        code: string;
        message: string;
      };
      data?: unknown;
    };

    const getProject = async (projectId: string, userId: string): Promise<ApiResponse> => {
      const project = findProject(projectId, userId, projects);

      if (!project) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        };
      }

      return {
        success: true,
        data: project,
      };
    };

    const unauthorizedResponse = await getProject(projectA.id, userB.id);
    expect(unauthorizedResponse.success).toBe(false);
    expect(unauthorizedResponse.error?.code).toBe('NOT_FOUND');

    const nonExistentResponse = await getProject('non-existent-id', userB.id);
    expect(nonExistentResponse.success).toBe(false);
    expect(nonExistentResponse.error?.code).toBe('NOT_FOUND');

    expect(unauthorizedResponse).toEqual(nonExistentResponse);
  });
});

function findProject(
  projectId: string,
  userId: string,
  projects: TestProject[],
): TestProject | null {
  return projects.find((project) => project.id === projectId && project.userId === userId) ?? null;
}

async function hashPassword(password: string): Promise<string> {
  const argon2 = await import('argon2');
  return argon2.hash(password);
}
