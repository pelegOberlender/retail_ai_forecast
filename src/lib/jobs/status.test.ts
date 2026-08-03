import assert from "node:assert/strict";
import test from "node:test";
import { retryJob, transitionJob, type JobSnapshot } from "./status";

const queued: JobSnapshot = {
  status: "queued",
  progress: 0,
  currentStep: null,
  retryCount: 0,
  maxRetries: 3,
  structuredError: null,
};

test("a job can move through the successful lifecycle", () => {
  const running = transitionJob(queued, "running", { progress: 28, currentStep: "Parsing rows" });
  const done = transitionJob(running, "succeeded");
  assert.equal(done.progress, 100);
  assert.equal(done.status, "succeeded");
});

test("invalid transitions fail loudly", () => {
  assert.throws(() => transitionJob(queued, "succeeded"), /Invalid job transition/);
});

test("failed jobs can be queued for a bounded retry", () => {
  const running = transitionJob(queued, "running");
  const failed = transitionJob(running, "failed", {
    structuredError: { code: "IMPORT_PARSE_FAILED", message: "Could not parse row", retryable: true },
  });
  const retried = retryJob(failed);
  assert.equal(retried.status, "queued");
  assert.equal(retried.retryCount, 1);
  assert.equal(retried.structuredError, null);
});
