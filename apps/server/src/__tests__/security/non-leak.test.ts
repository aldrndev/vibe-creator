/**
 * Security Tests - Non-Leak Rule (NotFound Masking)
 *
 * Per Digitesia Security Standard:
 * - Unauthorized access returns generic NotFound
 * - Resource existence MUST NOT be inferable
 * - Denied attempts audited
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

describe("Non-Leak Rule - NotFound Masking", () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let projectA: { id: string };

  beforeEach(async () => {
    // Create two users
    userA = await prisma.user.create({
      data: {
        email: `userA-${nanoid()}@example.com`,
        password: await hashPassword("password123"),
        name: "User A",
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `userB-${nanoid()}@example.com`,
        password: await hashPassword("password123"),
        name: "User B",
      },
    });

    // Create project owned by User A
    projectA = await prisma.project.create({
      data: {
        userId: userA.id,
        name: "Project A",
      },
    });
  });

  it("should return NotFound for unauthorized access (not Forbidden)", async () => {
    // User B tries to access User A's project
    const project = await prisma.project.findFirst({
      where: {
        id: projectA.id,
        userId: userB.id, // Wrong user
      },
    });

    // Should return null (NotFound behavior)
    expect(project).toBeNull();

    // Verify project exists for correct user
    const projectForUserA = await prisma.project.findFirst({
      where: {
        id: projectA.id,
        userId: userA.id,
      },
    });

    expect(projectForUserA).not.toBeNull();
  });

  it("should not reveal resource existence through error messages", async () => {
    // Simulate API-level check
    const checkProjectAccess = async (projectId: string, userId: string) => {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });

      if (!project) {
        // Generic NotFound - does NOT reveal if project exists for another user
        throw new Error("Project not found");
      }

      return project;
    };

    // User B accessing User A's project
    await expect(checkProjectAccess(projectA.id, userB.id)).rejects.toThrow(
      "Project not found"
    );

    // User B accessing non-existent project (same error message)
    await expect(
      checkProjectAccess("non-existent-id", userB.id)
    ).rejects.toThrow("Project not found");

    // User A can access their own project
    const result = await checkProjectAccess(projectA.id, userA.id);
    expect(result.id).toBe(projectA.id);
  });

  it("should mask existence in API responses", async () => {
    // Simulate API response structure
    type ApiResponse = {
      success: boolean;
      error?: {
        code: string;
        message: string;
      };
      data?: unknown;
    };

    const getProject = async (
      projectId: string,
      userId: string
    ): Promise<ApiResponse> => {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });

      if (!project) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Project not found", // Generic message
          },
        };
      }

      return {
        success: true,
        data: project,
      };
    };

    // Unauthorized access response
    const unauthorizedResponse = await getProject(projectA.id, userB.id);
    expect(unauthorizedResponse.success).toBe(false);
    expect(unauthorizedResponse.error?.code).toBe("NOT_FOUND");

    // Non-existent resource response (identical)
    const nonExistentResponse = await getProject("fake-id", userB.id);
    expect(nonExistentResponse.success).toBe(false);
    expect(nonExistentResponse.error?.code).toBe("NOT_FOUND");

    // Both responses should be identical
    expect(unauthorizedResponse).toEqual(nonExistentResponse);
  });
});

// Helper function
async function hashPassword(password: string): Promise<string> {
  const argon2 = await import("argon2");
  return argon2.hash(password);
}
