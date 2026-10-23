export interface Config {
  scenario: 'hot' | 'ramp' | 'scarce'; mode: 'public' | 'purchase'; users: number; capacity: number;
  rampUp: number; hold: number; rampDown: number; maxRequests: number; timeout: number; maxRetries: number; intervalMs: number; salesLead: number;
}
export interface Audit {
  status: string; checks?: Record<string, boolean>; tickets?: number; remainingSeats?: number | null;
  references?: number; idempotencyRecords?: number; note?: string; reason?: string;
}
export interface Metrics {
  requests: number; purchaseAttempts: number; retries: number; counts: Record<string, number>;
  latency: { p50: number | null; p95: number | null; max: number | null }; purchaseP95: number | null;
  throughput: number | null; uniqueReceipts: number;
  series: { time: number; requests: number; new: number; errors: number; p95: number | null }[];
}
export interface Run {
  runId: string; state: string; verdict: string; createdAt: string; finishedAt?: string;
  scenario: Config['scenario']; config: Config; preparedUsers: number; table?: string; eventId?: string;
  source: { appCommit: string | null; appDirty: boolean | null; adapter: string; adapterHash: string };
  metrics: Metrics; verification: Audit; supplemental: Audit; preparationSeconds?: number;
  issues: { code: string; message: string }[]; k6Version?: string;
}
