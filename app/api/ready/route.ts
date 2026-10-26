import { NextResponse } from 'next/server';
import IORedis from 'ioredis';
import { prisma } from '@/server/db';
export const dynamic = 'force-dynamic';
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
export async function GET() {
  const checks: Record<string, boolean> = { db: false, redis: false };
  try { await withTimeout(prisma.$queryRaw`SELECT 1`, 1500); checks.db = true; } catch {}
  let redis: IORedis | undefined;
  try {
    redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: 1, lazyConnect: true, connectTimeout: 1500 });
    await withTimeout(redis.connect().then(() => redis!.ping()), 1500); checks.redis = true;
  } catch {} finally { redis?.disconnect(); }
  const ok = checks.db && checks.redis;
  return NextResponse.json({ status: ok ? 'ready' : 'degraded', checks }, { status: ok ? 200 : 503 });
}
