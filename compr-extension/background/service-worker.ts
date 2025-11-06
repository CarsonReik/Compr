/**
 * Background service worker for Compr Chrome Extension
 * Handles WebSocket connection, message routing, and coordination
 */

import { httpClient } from './http-client';
import { saleDetector } from './sale-detector';
import {
  ExtensionMessage,
  ListingProgress,
  CreateListingPayload,
  DeleteListingPayload,
  Platform,
} from '../lib/types';
import { createMessage, logger, sendToContentScript } from '../lib/messaging';
import { SALE_DETECTION, PLATFORM_URLS } from '../lib/constants';

/**
 * Service worker initialization
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First install - set up default settings
    await chrome.storage.local.set({
      settings: {
        autoDelete: true,
        checkInterval: SALE_DETECTION.CHECK_INTERVAL,
        notifications: true,
      },
      platformConnections: [],
    });

    // Open welcome page
    await chrome.tabs.create({
      url: 'https://compr.co/extension-installed',
    });
  }

  // Initialize sale detection
  await saleDetector.initialize();
});

/**
 * Handle extension startup (when browser starts)
 */
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Extension started');

  // Connect to backend via HTTP
  await httpClient.connect();

  // Initialize sale detection
  await saleDetector.initialize();
});

/**
 * Handle alarm events (for sale detection)
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SALE_DETECTION.ALARM_NAME) {
    logger.info('Sale detection alarm triggered');
    await saleDetector.startCheck();
  }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Received message:', message.type, message);

  // Handle different message types
  switch (message.type) {
    case 'WS_MESSAGE_RECEIVED':
      handleWebSocketMessage(message.message)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Async response
      break;

    case 'CONNECTION_STATUS':
      sendResponse({ connected: httpClient.connected });
      break;

    case 'CONNECT_BACKEND':
      handleConnectBackend(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'VERIFY_SESSION':
      handleVerifySession(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'MANUAL_SALE_CHECK':
      saleDetector
        .manualCheck()
        .then(() => sendResponse({ success: true }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Async response

    case 'GET_PLATFORM_STATUS':
      checkPlatformStatus(message.payload.platform)
        .then((status) => sendResponse(status))
        .catch((error) => sendResponse({ error: error.message }));
      return true; // Async response

    default:
      logger.warn('Unknown message type:', message.type);
  }
});

/**
 * Handle messages from WebSocket
 */
export async function handleWebSocketMessage(message: ExtensionMessage): Promise<void> {
  logger.info('Handling WebSocket message:', message.type);

  try {
    switch (message.type) {
      case 'CREATE_LISTING':
        await handleCreateListing(message.payload as CreateListingPayload, message.requestId);
        break;

      case 'DELETE_LISTING':
        await handleDeleteListing(message.payload as DeleteListingPayload);
        break;

      case 'CHECK_STATUS':
        await handleCheckStatus();
        break;

      default:
        logger.warn('Unhandled WebSocket message type:', message.type);
    }
  } catch (error) {
    logger.error('Error handling message:', error);

    // Error is handled within individual handlers
  }
}

/**
 * Handle CREATE_LISTING command from backend
 */
async function handleCreateListing(payload: CreateListingPayload, jobId: string): Promise<void> {
  const { platform, listingData, userId } = payload;

  logger.info(`Creating listing on ${platform}:`, listingData.title);

  // Mark job as in_progress immediately to prevent duplicate processing
  try {
    await httpClient.markJobInProgress(jobId);
  } catch (error) {
    logger.warn('Failed to mark job as in_progress:', error);
  }

  // Send initial progress update
  await sendProgressUpdate(listingData.id, platform, 'uploading_images', 0);

  try {
    // Open platform URL in new tab
    const platformUrl = PLATFORM_URLS[platform]?.createListing;
    if (!platformUrl) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    const tab = await chrome.tabs.create({
      url: platformUrl,
      active: false, // Open in background
    });

    if (!tab.id) {
      throw new Error('Failed to create tab');
    }

    // Wait for tab to load
    await waitForTabLoad(tab.id);

    // Send CREATE_LISTING message to content script
    const message = createMessage('CREATE_LISTING', { listingData });
    const result = await sendToContentScript(tab.id, message);

    // Send success response back to backend
    await httpClient.sendResult({
      success: true,
      listingId: listingData.id,
      platform,
      platformListingId: result.platformListingId,
      platformUrl: result.platformUrl,
    });

    // Close tab after a delay
    setTimeout(() => {
      if (tab.id) {
        chrome.tabs.remove(tab.id);
      }
    }, 2000);

    logger.info('Listing created successfully:', result);
  } catch (error) {
    logger.error('Failed to create listing:', error);

    // Send error to backend
    await httpClient.sendResult({
      success: false,
      listingId: listingData.id,
      platform,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Handle DELETE_LISTING command from backend
 */
async function handleDeleteListing(payload: DeleteListingPayload): Promise<void> {
  const { platform, platformListingId, reason } = payload;

  logger.info(`Deleting listing ${platformListingId} on ${platform} (reason: ${reason})`);

  // TODO: Implement deletion logic
  // Similar to create listing, but sends DELETE command to content script

  logger.warn('Delete listing not yet implemented');
}

/**
 * Handle CHECK_STATUS command
 */
async function handleCheckStatus(): Promise<void> {
  // Check login status on all platforms
  const platforms: Platform[] = ['poshmark', 'mercari', 'depop'];

  const statuses = await Promise.all(
    platforms.map((platform) => checkPlatformStatus(platform))
  );

  // Status is checked via polling, no need to send explicitly
}

/**
 * Check if user is logged into a platform
 */
async function checkPlatformStatus(
  platform: Platform
): Promise<{ platform: Platform; loggedIn: boolean; lastChecked: number }> {
  // TODO: Implement actual platform login detection
  // For now, return placeholder

  return {
    platform,
    loggedIn: false, // TODO: Actually check
    lastChecked: Date.now(),
  };
}

/**
 * Send progress update for listing creation
 */
async function sendProgressUpdate(
  listingId: string,
  platform: Platform,
  status: ListingProgress['status'],
  progress: number,
  message?: string
): Promise<void> {
  // Progress updates can be sent via callback or stored locally
  logger.debug('Progress update:', { listingId, platform, status, progress });
}

/**
 * Wait for tab to finish loading
 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Tab load timeout'));
    }, 30000);

    chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        // Wait for SPA content to fully render (increased from 2s to 8s for React/Vue apps)
        setTimeout(resolve, 8000);
      }
    });
  });
}

/**
 * Handle backend connection request
 */
async function handleConnectBackend(payload: {
  userId: string;
  authToken: string;
}): Promise<void> {
  const { userId, authToken } = payload;

  if (!userId || !authToken) {
    throw new Error('Missing userId or authToken');
  }

  await httpClient.updateAuth(userId, authToken);
  logger.info('Backend connection updated with new credentials');
}

/**
 * Check for authentication cookies for a given platform
 * Returns confidence level based on cookie presence and validity
 */
async function checkAuthenticationCookies(platform: Platform): Promise<{
  hasAuthCookies: boolean;
  confidence: 'high' | 'medium' | 'low';
}> {
  try {
    const cookieDomains: Record<Platform, string> = {
      poshmark: '.poshmark.com',
      mercari: '.mercari.com',
      depop: '.depop.com',
    };

    const domain = cookieDomains[platform];
    const cookies = await chrome.cookies.getAll({ domain });

    // Look for common authentication cookie patterns
    const authCookieNames = [
      'session', 'sess', 'auth', 'token', 'jwt',
      '_session', 'user_session', 'auth_token',
      'PHPSESSID', 'connect.sid', '__Secure-',
    ];

    const hasAuthCookie = cookies.some(cookie =>
      authCookieNames.some(name =>
        cookie.name.toLowerCase().includes(name.toLowerCase())
      )
    );

    if (hasAuthCookie && cookies.length > 2) {
      // Multiple cookies including auth cookie = high confidence
      return { hasAuthCookies: true, confidence: 'high' };
    } else if (hasAuthCookie) {
      // Has auth cookie but not many other cookies = medium confidence
      return { hasAuthCookies: true, confidence: 'medium' };
    } else {
      // No auth cookies found = low confidence
      return { hasAuthCookies: false, confidence: 'low' };
    }
  } catch (error) {
    logger.error('Cookie check error:', error);
    return { hasAuthCookies: false, confidence: 'low' };
  }
}

/**
 * Handle session verification request
 * Uses multiple methods: cookies + DOM checks for reliable verification
 */
async function handleVerifySession(payload: {
  platform: Platform;
}): Promise<{ success: boolean; error?: string; confidence?: string }> {
  const { platform } = payload;

  logger.info(`Verifying session for ${platform}`);

  try {
    // Step 1: Check for authentication cookies first (fast check)
    const cookieCheck = await checkAuthenticationCookies(platform);
    logger.info(`Cookie check for ${platform}:`, cookieCheck);

    // Get platform URL
    const platformUrls: Record<Platform, string> = {
      poshmark: 'https://poshmark.com',
      mercari: 'https://www.mercari.com',
      depop: 'https://www.depop.com',
    };

    const platformUrl = platformUrls[platform];
    if (!platformUrl) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    // Query for existing tabs on this platform
    const tabs = await chrome.tabs.query({ url: `${platformUrl}/*` });

    let tabId: number;

    if (tabs.length > 0 && tabs[0].id) {
      // Use existing tab
      tabId = tabs[0].id;
      logger.info(`Using existing ${platform} tab`);
    } else {
      // Create a new tab
      const tab = await chrome.tabs.create({
        url: platformUrl,
        active: false,
      });

      if (!tab.id) {
        throw new Error('Failed to create tab');
      }

      tabId = tab.id;

      // Wait for tab to load
      await waitForTabLoad(tabId);
    }

    // Step 2: Check DOM elements via content script
    const checkMessage = createMessage('CHECK_LOGIN', {});

    try {
      const result = await sendToContentScript(tabId, checkMessage);

      // Close tab if we created it
      if (tabs.length === 0) {
        setTimeout(() => {
          chrome.tabs.remove(tabId);
        }, 1000);
      }

      // Combine cookie check and DOM check for final decision
      const domLoggedIn = result.loggedIn;
      const cookieLoggedIn = cookieCheck.hasAuthCookies;

      // Determine final confidence level
      let finalConfidence: 'high' | 'medium' | 'low';
      let isLoggedIn: boolean;

      if (domLoggedIn && cookieLoggedIn && cookieCheck.confidence === 'high') {
        // Both checks passed with high confidence cookies
        finalConfidence = 'high';
        isLoggedIn = true;
      } else if (domLoggedIn && cookieLoggedIn) {
        // Both checks passed but medium cookie confidence
        finalConfidence = 'medium';
        isLoggedIn = true;
      } else if (domLoggedIn && !cookieLoggedIn) {
        // DOM says logged in but no auth cookies (suspicious)
        finalConfidence = 'low';
        isLoggedIn = false; // Don't trust DOM-only verification
      } else if (!domLoggedIn && cookieLoggedIn) {
        // Has cookies but DOM check failed (page not loaded yet?)
        finalConfidence = 'low';
        isLoggedIn = false;
      } else {
        // Both checks failed
        finalConfidence = 'low';
        isLoggedIn = false;
      }

      if (isLoggedIn && finalConfidence !== 'low') {
        logger.info(`Session verified for ${platform} with ${finalConfidence} confidence`);
        return { success: true, confidence: finalConfidence };
      } else {
        logger.warn(`Not logged in to ${platform} (confidence: ${finalConfidence})`);
        return {
          success: false,
          error: `Not logged in to ${platform}. Please log in and try again.`,
          confidence: finalConfidence,
        };
      }
    } catch (error) {
      // Close tab if we created it
      if (tabs.length === 0) {
        chrome.tabs.remove(tabId);
      }
      throw error;
    }
  } catch (error) {
    logger.error('Session verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during verification',
      confidence: 'low',
    };
  }
}

/**
 * Keep service worker alive
 * Chrome kills service workers after 30 seconds of inactivity
 */
setInterval(() => {
  // Ping to keep alive
  if (httpClient.connected) {
    logger.debug('Service worker keepalive');
  }
}, 20000); // Every 20 seconds

// Initialize HTTP client connection on startup
httpClient.connect();

logger.info('Background service worker initialized');
