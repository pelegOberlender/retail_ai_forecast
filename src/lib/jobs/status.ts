import { z } from "zod";

export const jobTypeSchema = z.enum([
  "catalog_parse",
  "product_analysis",
  "embedding",
  "trend_research",
  "recommendation_generation",
]);

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export type JobType = z.infer<typeof jobTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const structuredJobErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type StructuredJobError = z.infer<typeof structuredJobErrorSchema>;

export type JobSnapshot = {
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  retryCount: number;
  maxRetries: number;
  structuredError: StructuredJobError | null;
};

const allowedTransitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: ["queued", "cancelled"],
  cancelled: [],
};

export function clampJobProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

export function transitionJob(
  job: JobSnapshot,
  nextStatus: JobStatus,
  updates: Partial<Pick<JobSnapshot, "progress" | "currentStep" | "structuredError">> = {}
): JobSnapshot {
  if (!allowedTransitions[job.status].includes(nextStatus)) {
    throw new Error(`Invalid job transition: ${job.status} -> ${nextStatus}`);
  }

  const progress =
    nextStatus === "succeeded" ? 100 : clampJobProgress(updates.progress ?? job.progress);

  return {
    ...job,
    ...updates,
    status: nextStatus,
    progress,
    structuredError: nextStatus === "failed" ? updates.structuredError ?? job.structuredError : null,
  };
}

export function retryJob(job: JobSnapshot): JobSnapshot {
  if (job.status !== "failed") throw new Error("Only failed jobs can be retried.");
  if (job.retryCount >= job.maxRetries) throw new Error("Job retry limit reached.");

  return {
    ...transitionJob(job, "queued", { progress: 0, currentStep: "Queued for retry" }),
    retryCount: job.retryCount + 1,
  };
}
