import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME_DIR } from "./chrome.js";

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface SceneParams {
  prompt: string;
  preserve_prompt?: boolean;
  type: "video" | "image";
  max_credits: number;
  duration?: 4 | 6 | 8 | 10;
  resolution?: "360p" | "720p";
  generate_audio?: boolean;
  prepare_only?: boolean;
  attachment_method?: "mention" | "scroll";
  model?: string;
  aspect_ratio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  variants?: number;
  first_frame?: string;
  last_frame?: string;
  reference_images?: string[];
  identity_reference_indices?: number[];
  import_assets?: string[];
  reference_project_url?: string;
  chain_from?: string;
  reference_from?: string;
  edit_asset?: string;
  agent_scenes?: string[];
  continue_from?: string;
  attach?: string[];
  continue_mode?: "exact" | "likeness";
  retries?: number;
  download_quality?: "original" | "upscaled";
  output_dir: string;
  file_stem: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  params: SceneParams;
  files: string[];
  attempts: number;
  credits?: number;
  progress?: string;
  note?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
  submittedAt?: string;
  attachedAssetNames?: string[];
  attachmentMethodUsed?: "mention" | "scroll" | "scroll-fallback";
  submittedPrompt?: string;
  stageTimings?: {name:string;startedAt:string;finishedAt?:string}[];
  outputNames?: string[];
  beforeMedia?: string[];
  failedOutputNames?: string[];
  checkpoint?: () => void;
}

export type JobRunner = (job: Job) => Promise<string[]>;

// Flow is driven like a careful person would: one generation at a time, with a
// randomised pause between them.
const PAUSE_MIN_MS = Math.max(0, Number(process.env.FLOW_MCP_PAUSE_MIN_S ?? 0)) * 1000;
const PAUSE_MAX_MS = Math.max(PAUSE_MIN_MS, Number(process.env.FLOW_MCP_PAUSE_MAX_S ?? 0) * 1000);

export class JobQueue {
  private jobs = new Map<string, Job>();
  private working = false;
  private externalWork = false;
  private lastFinished = 0;
  pausedReason: string | null = null;

  constructor(private runner: JobRunner) {
    const file = join(HOME_DIR, "jobs.json");
    if (existsSync(file)) {
      for (const job of JSON.parse(readFileSync(file, "utf8")) as Job[]) {
        if (["queued", "running"].includes(job.status)) { job.status = "failed"; job.error = "Worker restarted. Recover this saved request before creating another."; }
        job.checkpoint = () => this.persist();
        this.jobs.set(job.id, job);
      }
    }
  }

  private persist(): void {
    mkdirSync(HOME_DIR, { recursive: true });
    const file = join(HOME_DIR, "jobs.json");
    writeFileSync(file + ".tmp", JSON.stringify(this.list()), { mode: 0o600 });
    renameSync(file + ".tmp", file);
  }

  add(params: SceneParams): Job {
    const job: Job = {
      id: randomUUID().slice(0, 8),
      status: "queued",
      params,
      files: [],
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, job);
    job.checkpoint = () => this.persist();
    this.persist();
    void this.work();
    return job;
  }

  get busy(): boolean {
    return this.externalWork || this.list().some((j) => j.status === "running");
  }

  // Downloads/upscales share the same browser as generation. Hold it for the
  // whole operation; newly queued generations wait until it is released.
  async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.working || this.externalWork) throw new Error('The account is busy. Wait for the current creation, then retry Upscale.');
    this.externalWork = true;
    try { return await action(); }
    finally { this.externalWork = false; void this.work(); }
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  list(): Job[] {
    return [...this.jobs.values()];
  }

  // Puts a failed or cancelled job back in line with the same settings and file name.
  retry(id: string): Job | undefined {
    const job = this.jobs.get(id);
    if (job && (job.status === "failed" || job.status === "cancelled")) {
      job.status = "queued";
      job.error = undefined;
      job.finishedAt = undefined;
      this.persist();
      void this.work();
    }
    return job;
  }

  cancel(id: string): Job | undefined {
    const job = this.jobs.get(id);
    if (job && job.status === "queued") {
      job.status = "cancelled";
      job.finishedAt = new Date().toISOString();
      this.persist();
    }
    return job;
  }

  private async work(): Promise<void> {
    if (this.working || this.externalWork) return;
    this.working = true;
    try {
      for (;;) {
        const job = this.list().find((j) => j.status === "queued");
        if (!job) return;
        if (this.lastFinished) {
          const pause = PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
          const remaining = this.lastFinished + pause - Date.now();
          if (remaining > 0) {
            this.pausedReason = `pacing: next generation in ${Math.ceil(remaining / 1000)}s`;
            await new Promise((r) => setTimeout(r, remaining));
            this.pausedReason = null;
          }
        }
        if (job.status !== "queued") continue;
        job.status = "running";
        job.attempts++;
        this.persist();
        try {
          job.files = await this.runner(job);
          job.status = "done";
          job.error = undefined;
        } catch (err) {
          job.error = err instanceof Error ? err.message : String(err);
          // Failed tiles are already retried inside Flow (its own Retry button); only an agent that produced nothing
          // is re-queued here. Timeouts are never retried automatically: they may still have spent credits.
          const retryable = /agent finished without creating/i.test(job.error);
          job.status = retryable && job.attempts <= (job.params.retries ?? 1) ? "queued" : "failed";
        }
        job.finishedAt = new Date().toISOString();
        this.persist();
        this.lastFinished = Date.now();
      }
    } finally {
      this.working = false;
    }
  }
}
