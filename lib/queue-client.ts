import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Parse Redis URL or use individual config
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Parse redis://host:port format
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    };
  }

  // Fallback to individual env vars
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };
}

// Shared Redis connection config
const redisConnection = getRedisConfig();

// Create queue instance (singleton)
let queueInstance: Queue | null = null;

export function getCrosslistingQueue(): Queue {
  if (!queueInstance) {
    queueInstance = new Queue('crosslisting', {
      connection: redisConnection,
    });
  }
  return queueInstance;
}

// Job data interface
export interface CrosslistingJobData {
  jobId: string;
  userId: string;
  listingId: string;
  platform: 'poshmark' | 'mercari' | 'depop';
  listingData: {
    title: string;
    description: string;
    price: number;
    category: string | null;
    brand: string | null;
    size: string | null;
    color: string | null;
    condition: string;
    photo_urls: string[];
  };
  encryptedCredentials: string;
}

/**
 * Add a crosslisting job to the queue
 */
export async function addCrosslistingJob(data: CrosslistingJobData): Promise<string> {
  const queue = getCrosslistingQueue();

  const job = await queue.add('crosslist', data, {
    jobId: data.jobId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });

  return job.id || data.jobId;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const queue = getCrosslistingQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    state,
    progress,
    failedReason,
    data: job.data,
  };
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const redis = new Redis(redisConnection);
    await redis.ping();
    await redis.quit();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

/**
 * Close queue connection (cleanup)
 */
export async function closeQueue() {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
}
