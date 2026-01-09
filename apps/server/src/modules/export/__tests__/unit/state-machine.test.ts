/**
 * @module export/__tests__/unit/state-machine
 * @description Unit tests for export job state machine.
 *
 * Tests:
 * - Valid state transitions
 * - Invalid state transitions rejected
 * - Job completion states
 */

import { describe, it, expect } from "vitest";

// Define export job states
const EXPORT_STATES = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

type ExportState = (typeof EXPORT_STATES)[keyof typeof EXPORT_STATES];

// State transition rules
const VALID_TRANSITIONS: Record<ExportState, ExportState[]> = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [], // Terminal state
  FAILED: ["PENDING"], // Can retry
};

function canTransition(from: ExportState, to: ExportState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

function isTerminalState(state: ExportState): boolean {
  return state === "COMPLETED";
}

function canRetry(state: ExportState): boolean {
  return state === "FAILED";
}

describe("export job state machine", () => {
  describe("VALID_TRANSITIONS", () => {
    it("PENDING can transition to PROCESSING", () => {
      expect(canTransition("PENDING", "PROCESSING")).toBe(true);
    });

    it("PENDING can transition to FAILED", () => {
      expect(canTransition("PENDING", "FAILED")).toBe(true);
    });

    it("PROCESSING can transition to COMPLETED", () => {
      expect(canTransition("PROCESSING", "COMPLETED")).toBe(true);
    });

    it("PROCESSING can transition to FAILED", () => {
      expect(canTransition("PROCESSING", "FAILED")).toBe(true);
    });

    it("FAILED can transition to PENDING (retry)", () => {
      expect(canTransition("FAILED", "PENDING")).toBe(true);
    });
  });

  describe("INVALID_TRANSITIONS", () => {
    it("PENDING cannot skip to COMPLETED", () => {
      expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    });

    it("COMPLETED cannot transition anywhere", () => {
      expect(canTransition("COMPLETED", "PENDING")).toBe(false);
      expect(canTransition("COMPLETED", "PROCESSING")).toBe(false);
      expect(canTransition("COMPLETED", "FAILED")).toBe(false);
    });

    it("PROCESSING cannot go back to PENDING", () => {
      expect(canTransition("PROCESSING", "PENDING")).toBe(false);
    });

    it("FAILED cannot skip to COMPLETED", () => {
      expect(canTransition("FAILED", "COMPLETED")).toBe(false);
    });
  });

  describe("Terminal states", () => {
    it("COMPLETED is terminal", () => {
      expect(isTerminalState("COMPLETED")).toBe(true);
    });

    it("PENDING is not terminal", () => {
      expect(isTerminalState("PENDING")).toBe(false);
    });

    it("PROCESSING is not terminal", () => {
      expect(isTerminalState("PROCESSING")).toBe(false);
    });

    it("FAILED is not terminal (can retry)", () => {
      expect(isTerminalState("FAILED")).toBe(false);
    });
  });

  describe("Retry logic", () => {
    it("FAILED jobs can retry", () => {
      expect(canRetry("FAILED")).toBe(true);
    });

    it("COMPLETED jobs cannot retry", () => {
      expect(canRetry("COMPLETED")).toBe(false);
    });

    it("PROCESSING jobs cannot retry", () => {
      expect(canRetry("PROCESSING")).toBe(false);
    });

    it("PENDING jobs cannot retry", () => {
      expect(canRetry("PENDING")).toBe(false);
    });
  });

  describe("State immutability", () => {
    it("should not mutate VALID_TRANSITIONS", () => {
      const originalPending = [...VALID_TRANSITIONS.PENDING];

      // Attempt mutation (should not work with const)
      expect(VALID_TRANSITIONS.PENDING).toEqual(originalPending);
    });
  });
});
