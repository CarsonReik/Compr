import * as dotenv from 'dotenv';
import { createWorker, shutdownWorker } from './queue/processor';
import { checkRedisConnection } from './queue/queue';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'REDIS_HOST',
    'REDIS_PORT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate encryption key length
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && Buffer.from(encryptionKey, 'hex').length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
}

async function main() {
  try {
    logger.info('Starting Compr Automation Worker');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Validate environment
    validateEnvironment();
    logger.info('Environment variables validated');

    // Check Redis connection
    const redisConnected = await checkRedisConnection();
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis');
    }
    logger.info('Redis connection established');

    // Create and start worker
    const worker = createWorker();

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received');
      await shutdownWorker(worker);
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received');
      await shutdownWorker(worker);
      process.exit(0);
    });

    logger.info('Compr Automation Worker started successfully');
    logger.info('Waiting for crosslisting jobs...');
  } catch (error) {
    logger.error('Failed to start worker', error);
    process.exit(1);
  }
}

// Start the worker
main();
