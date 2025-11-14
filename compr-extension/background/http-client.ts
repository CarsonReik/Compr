/**
 * HTTP client for communicating with Compr backend
 * Uses polling instead of WebSocket for simplicity
 */

import { STORAGE_KEYS } from '../lib/constants';
import { ExtensionMessage, CreateListingPayload } from '../lib/types';
import { logger } from '../lib/messaging';
import { handleWebSocketMessage } from './service-worker';

export class HttpClient {
  private baseUrl: string;
  private userId: string | null = null;
  private authToken: string | null = null;
  private pollingInterval: number | null = null;
  private isPolling = false;

  constructor() {
    // Determine base URL based on environment
    // For development: use localhost
    // For production: use compr.co
    // Set NODE_ENV or use chrome.runtime.getManifest().version to determine environment
    const isDevelopment = chrome.runtime.getManifest().version.includes('dev') ||
                          chrome.runtime.getManifest().version === '1.0.0';

    this.baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://compr.co';
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.AUTH_TOKEN,
    ]);

    this.userId = result[STORAGE_KEYS.USER_ID] || null;
    this.authToken = result[STORAGE_KEYS.AUTH_TOKEN] || null;

    logger.debug('HTTP client settings loaded', {
      hasUserId: !!this.userId,
      hasAuthToken: !!this.authToken,
    });
  }

  /**
   * Update authentication
   */
  public async updateAuth(userId: string, authToken: string): Promise<void> {
    this.userId = userId;
    this.authToken = authToken;

    await chrome.storage.local.set({
      [STORAGE_KEYS.USER_ID]: userId,
      [STORAGE_KEYS.AUTH_TOKEN]: authToken,
    });

    // Restart polling with new credentials
    await this.connect();
  }

  /**
   * Connect to backend (initial handshake)
   */
  public async connect(): Promise<void> {
    // Load settings first if not already loaded
    if (!this.userId || !this.authToken) {
      await this.loadSettings();
    }

    if (!this.userId || !this.authToken) {
      logger.warn('Cannot connect: missing userId or authToken');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/extension/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          authToken: this.authToken,
          platformStatuses: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Connect failed: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('Connected to backend:', data);

      // Process any pending jobs
      if (data.pendingJobs && data.pendingJobs.length > 0) {
        for (const job of data.pendingJobs) {
          await this.handleCreateListing(job);
        }
      }

      // Start polling for new jobs
      this.startPolling();
    } catch (error) {
      logger.error('Failed to connect to backend:', error);
    }
  }

  /**
   * Start polling for new jobs
   */
  private startPolling(): void {
    if (this.isPolling) {
      logger.debug('Already polling');
      return;
    }

    this.isPolling = true;
    logger.info('Starting job polling');

    // Poll every 5 seconds
    this.pollingInterval = setInterval(() => {
      this.poll();
    }, 5000) as unknown as number;
  }

  /**
   * Stop polling
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    logger.info('Stopped polling');
  }

  /**
   * Poll for new jobs
   */
  private async poll(): Promise<void> {
    if (!this.userId || !this.authToken) {
      return;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/extension/poll?userId=${this.userId}&authToken=${this.authToken}`
      );

      if (!response.ok) {
        logger.warn('Poll failed:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data.hasNewJobs && data.jobs) {
        logger.info(`Found ${data.jobs.length} new jobs`);

        for (const job of data.jobs) {
          if (job.operation === 'DELETE') {
            await this.handleDeleteListing(job);
          } else {
            await this.handleCreateListing(job);
          }
        }
      }
    } catch (error) {
      logger.error('Polling error:', error);
    }
  }

  /**
   * Handle CREATE_LISTING job
   */
  private async handleCreateListing(job: any): Promise<void> {
    const { jobId, platform, listingData } = job;

    logger.info(`Processing job ${jobId}: Create listing on ${platform}`);

    // Call the handler directly (we're in the same context)
    await handleWebSocketMessage({
      type: 'CREATE_LISTING',
      payload: {
        platform,
        listingData,
        userId: this.userId,
      },
      requestId: jobId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle DELETE_LISTING job
   */
  private async handleDeleteListing(job: any): Promise<void> {
    const { jobId, platform, platformListingId } = job;

    logger.info(`Processing job ${jobId}: Delete listing ${platformListingId} from ${platform}`);

    // Call the handler directly (we're in the same context)
    await handleWebSocketMessage({
      type: 'DELETE_LISTING',
      payload: {
        platform,
        platformListingId,
        reason: 'user_requested',
      },
      requestId: jobId,
      timestamp: Date.now(),
    });
  }

  /**
   * Mark job as in_progress
   */
  public async markJobInProgress(jobId: string): Promise<void> {
    if (!this.userId || !this.authToken) {
      logger.warn('Cannot mark job in progress: missing credentials');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/extension/job-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          authToken: this.authToken,
          jobId,
          status: 'processing',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark job in progress: ${response.statusText}`);
      }

      logger.info('Job marked as in_progress:', jobId);
    } catch (error) {
      logger.error('Failed to mark job in progress:', error);
      throw error;
    }
  }

  /**
   * Send result back to backend
   */
  public async sendResult(result: any): Promise<void> {
    if (!this.userId || !this.authToken) {
      logger.warn('Cannot send result: missing credentials');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/extension/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          authToken: this.authToken,
          result,
        }),
      });

      if (!response.ok) {
        throw new Error(`Callback failed: ${response.statusText}`);
      }

      logger.info('Result sent successfully');
    } catch (error) {
      logger.error('Failed to send result:', error);
    }
  }

  /**
   * Get connection status
   */
  public get connected(): boolean {
    return this.isPolling && !!this.userId && !!this.authToken;
  }
}

// Export singleton
export const httpClient = new HttpClient();
