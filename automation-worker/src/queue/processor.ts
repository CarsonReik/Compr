import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { CrosslistingJobData } from './queue';
import { PoshmarkWorker } from '../workers/poshmark-worker';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Initialize platform workers
const poshmarkWorker = new PoshmarkWorker();

/**
 * Update job status in database
 */
async function updateJobStatus(
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'pending_verification',
  updates: {
    platform_listing_id?: string;
    platform_url?: string;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
  }
) {
  try {
    const { error } = await supabase
      .from('crosslisting_jobs')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);

    if (error) {
      logger.error(`Failed to update job status in database: ${jobId}`, error);
    }
  } catch (error) {
    logger.error(`Error updating job status: ${jobId}`, error);
  }
}

/**
 * Update platform_listings table
 */
async function createPlatformListing(
  userId: string,
  listingId: string,
  platform: string,
  platformListingId: string,
  platformUrl: string
) {
  try {
    const { error } = await supabase
      .from('platform_listings')
      .upsert({
        listing_id: listingId,
        user_id: userId,
        platform,
        platform_listing_id: platformListingId,
        platform_url: platformUrl,
        status: 'active',
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'listing_id,platform',
      });

    if (error) {
      logger.error('Failed to create platform_listing record', error);
    }
  } catch (error) {
    logger.error('Error creating platform_listing', error);
  }
}

/**
 * Process a single crosslisting job
 */
async function processCrosslistingJob(job: Job<CrosslistingJobData>) {
  const { jobId, userId, listingId, platform, listingData, encryptedCredentials } = job.data;

  logger.jobStart(jobId, platform, listingId);

  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing', {
      started_at: new Date().toISOString(),
    });

    // Fetch saved session cookies from database (if any)
    const { data: connectionData, error: fetchError } = await supabase
      .from('platform_connections')
      .select('session_cookies')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.warn('Failed to fetch saved cookies', { error: fetchError });
    }

    const savedCookies = connectionData?.session_cookies || null;

    let result;

    // Route to appropriate platform worker
    switch (platform) {
      case 'poshmark':
        result = await poshmarkWorker.createListing(
          encryptedCredentials,
          listingData,
          jobId,
          userId,
          savedCookies
        );
        break;

      case 'mercari':
        // TODO: Implement Mercari worker
        throw new Error('Mercari worker not yet implemented');

      case 'depop':
        // TODO: Implement Depop worker
        throw new Error('Depop worker not yet implemented');

      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    if (result.success && result.platformListingId && result.platformUrl) {
      // Success - update database
      await updateJobStatus(jobId, 'completed', {
        platform_listing_id: result.platformListingId,
        platform_url: result.platformUrl,
        completed_at: new Date().toISOString(),
      });

      // Create platform_listings record
      await createPlatformListing(
        userId,
        listingId,
        platform,
        result.platformListingId,
        result.platformUrl
      );

      logger.jobSuccess(jobId, platform, listingId, result.platformListingId, result.platformUrl);

      return result;
    } else if (result.error === 'VERIFICATION_REQUIRED') {
      // Verification code is needed - mark as pending
      logger.warn('Job requires verification code', { jobId, platform });

      await updateJobStatus(jobId, 'pending_verification', {
        error_message: 'Please log into Poshmark manually from your browser to verify this device. After verification, your future crosslistings will work automatically.',
        completed_at: new Date().toISOString(),
      });

      // Don't throw error - this is an expected state
      return result;
    } else {
      // Failed
      throw new Error(result.error || 'Unknown error occurred');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.jobError(jobId, platform, listingId, errorMessage);

    // Update status to failed
    await updateJobStatus(jobId, 'failed', {
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    });

    throw error; // Re-throw so BullMQ can handle retries
  }
}

/**
 * Create and start the worker
 */
export function createWorker() {
  const worker = new Worker<CrosslistingJobData>(
    'crosslisting',
    processCrosslistingJob,
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 60000, // Per minute
      },
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    logger.info(`Job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    if (job) {
      logger.error(`Job failed: ${job.id}`, err);
    }
  });

  worker.on('error', (err) => {
    logger.error('Worker error', err);
  });

  logger.info('Worker started and listening for jobs');

  return worker;
}

/**
 * Graceful shutdown
 */
export async function shutdownWorker(worker: Worker) {
  logger.info('Shutting down worker...');

  await worker.close();
  await poshmarkWorker.shutdown();

  logger.info('Worker shut down successfully');
}
