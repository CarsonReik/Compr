import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Queue options
const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600, // Remove after 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
    },
  },
};

// Create queue for crosslisting jobs
export const crosslistingQueue = new Queue('crosslisting', queueOptions);

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
  const job = await crosslistingQueue.add('crosslist', data, {
    jobId: data.jobId,
  });

  return job.id || data.jobId;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await crosslistingQueue.getJob(jobId);

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
 * Health check for Redis connection
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const redis = new Redis(redisConnection);
    await redis.ping();
    await redis.quit();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}
