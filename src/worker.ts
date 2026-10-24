// BullMQ worker — background jobs (receipts, PDF generation, dunning reminders).
// Built to dist/worker.js by `npm run worker:build`; run as its own container.
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
const prefix = process.env.BULLMQ_PREFIX || 'contractor-crm';

export const jobsQueue = new Queue('jobs', { connection, prefix });

const worker = new Worker(
  'jobs',
  async (job) => {
    switch (job.name) {
      case 'ping':
        return { pong: true };
      // TODO: 'send-receipt', 'generate-invoice-pdf', 'dunning-reminder', 'sync-inventory'
      default:
        throw new Error(`unknown job: ${job.name}`);
    }
  },
  { connection, prefix, concurrency: 5 },
);

worker.on('completed', (job) => console.log(`[worker] completed ${job.id} (${job.name})`));
worker.on('failed', (job, err) => console.error(`[worker] failed ${job?.id}:`, err?.message));
console.log('[worker] started; listening on queue "jobs"');
