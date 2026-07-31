import { Queue } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const QUEUE_NAMES = ["cloud-drive-import", "quickbooks-sync", "notifications"];

/**
 * Read-only view over the same queues the app already uses (fresh BullMQ
 * client instances against the same Redis connection — no DI wiring needed).
 * Mounted at /admin/queues behind HTTP Basic Auth in main.ts.
 */
export function createQueueDashboardRouter() {
  const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };
  const queues = QUEUE_NAMES.map((name) => new Queue(name, { connection }));

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter
  });

  return serverAdapter.getRouter();
}
