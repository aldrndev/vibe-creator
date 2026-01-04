import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";
import toast from "react-hot-toast";

export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface Job<T = any> {
  id: string;
  status: JobStatus;
  progress: number;
  output?: T;
  error?: string;
  createdAt: string;
}

interface UseJobPollingOptions<T> {
  onComplete?: (data: T) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export function useJobPolling<T = any>(
  initialJobId: string | null = null,
  options: UseJobPollingOptions<T> = {}
) {
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [job, setJob] = useState<Job<T> | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid dependency cycles in effect
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const poll = useCallback(async (id: string) => {
    try {
      // API returns generic wrapper { success: true, data: Job }
      // We pass Job<T> to api.get so typescript knows data is Job<T>
      const res = await api.get<Job<T>>(`/jobs/${id}`);

      if (!res.success) {
        throw new Error(
          typeof res.error === "string" ? res.error : "Failed to fetch job"
        );
      }

      const currentJob = res.data;
      if (!currentJob) return;

      setJob(currentJob);

      if (currentJob.status === "COMPLETED") {
        setIsPolling(false);
        optionsRef.current.onComplete?.(currentJob.output as T);
      } else if (
        currentJob.status === "FAILED" ||
        currentJob.status === "CANCELLED"
      ) {
        setIsPolling(false);
        const errMsg = currentJob.error || "Job failed";
        setError(errMsg);
        optionsRef.current.onError?.(errMsg);
        toast.error(`Job failed: ${errMsg}`);
      }
    } catch (err: any) {
      console.error("Polling error:", err);
      // Don't stop polling on transient network errors
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      setIsPolling(false);
      setJob(null);
      return;
    }

    setIsPolling(true);
    setError(null);

    // Initial fetch
    poll(jobId);

    const intervalId = setInterval(() => {
      poll(jobId);
    }, options.pollInterval || 2000);

    return () => clearInterval(intervalId);
  }, [jobId, poll, options.pollInterval]);

  const startJob = useCallback((newJobId: string) => {
    setJobId(newJobId);
  }, []);

  const stopPolling = useCallback(() => {
    setJobId(null);
    setIsPolling(false);
  }, []);

  return {
    job,
    isPolling,
    error,
    startJob,
    stopPolling,
  };
}
