/**
 * Background service worker for Compr Chrome Extension
 * Handles WebSocket connection, message routing, and coordination
 */

import { httpClient } from './http-client';
import { saleDetector } from './sale-detector';
import { mercariApiClient } from './mercari-api-client';
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

  // Route to API-based creation for Mercari (zero UI approach)
  if (platform === 'mercari') {
    try {
      logger.info('Using API-based creation for Mercari (no windows)');

      // Upload images via API
      const uploadIds = await mercariApiClient.uploadImages(listingData.photo_urls);
      logger.info('Images uploaded, got uploadIds:', uploadIds);

      // Update progress
      await sendProgressUpdate(listingData.id, platform, 'filling_form', 50);

      // Create listing via API
      const result = await mercariApiClient.createListing(listingData, uploadIds);

      // Update progress
      await sendProgressUpdate(listingData.id, platform, 'completed', 100);

      // Send success response back to backend
      await httpClient.sendResult({
        success: true,
        listingId: listingData.id,
        platform,
        platformListingId: result.platformListingId,
        platformUrl: result.platformUrl,
        operationType: 'CREATE',
      });

      logger.info('Mercari listing created via API:', result);
    } catch (error) {
      logger.error('Failed to create Mercari listing via API:', error);

      // Send error to backend
      await httpClient.sendResult({
        success: false,
        listingId: listingData.id,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
        operationType: 'CREATE',
      });

      throw error;
    }
    return;
  }

  // Fall back to browser automation for other platforms
  try {
    // Open platform URL in new window behind current window
    const platformUrl = PLATFORM_URLS[platform]?.createListing;
    if (!platformUrl) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    // Create window with focus initially to make tab "active"
    const window = await chrome.windows.create({
      url: platformUrl,
      type: 'normal',
      focused: true, // Focus initially
      state: 'normal',
    });

    const tab = window.tabs?.[0];
    if (!tab?.id || !window.id) {
      throw new Error('Failed to create tab in window');
    }

    logger.info(`Created listing tab ${tab.id} in window ${window.id}`);

    // Wait for tab to load
    await waitForTabLoad(tab.id);

    // Now blur the window by focusing back to the previous window
    // This keeps the tab "active" but moves focus back to user's window
    const allWindows = await chrome.windows.getAll();
    const previousWindow = allWindows.find(w => w.id !== window.id && w.focused);
    if (previousWindow?.id) {
      await chrome.windows.update(previousWindow.id, { focused: true });
      logger.info('Refocused previous window, listing window now in background');
    }

    // Send CREATE_LISTING message to content script
    const message = createMessage('CREATE_LISTING', { listingData });
    const result = await sendToContentScript(tab.id, message);

    // Check if content script returned an error
    if (result.success === false) {
      throw new Error(result.error || 'Listing creation failed');
    }

    // Send success response back to backend
    await httpClient.sendResult({
      success: true,
      listingId: listingData.id,
      platform,
      platformListingId: result.platformListingId,
      platformUrl: result.platformUrl,
      operationType: 'CREATE',
    });

    // Close window after a delay
    setTimeout(() => {
      if (window.id) {
        chrome.windows.remove(window.id);
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
      operationType: 'CREATE',
    });

    // On error, keep window open for debugging (don't close)
    logger.info('Window kept open for debugging. Check the platform page for validation errors.');

    throw error;
  }
}

/**
 * Handle DELETE_LISTING command from backend
 */
async function handleDeleteListing(payload: DeleteListingPayload): Promise<void> {
  const { platform, platformListingId, reason } = payload;

  logger.info(`Deleting listing ${platformListingId} on ${platform} (reason: ${reason})`);

  // Route to API-based deletion for Mercari (zero UI approach)
  if (platform === 'mercari') {
    try {
      logger.info('Using API-based deletion for Mercari (no windows)');

      // Delete listing via API
      await mercariApiClient.deleteListing(platformListingId);

      // Send success response back to backend
      await httpClient.sendResult({
        success: true,
        listingId: '', // We don't have the original listing ID in this payload
        platform,
        platformListingId,
        platformUrl: `https://www.mercari.com/us/item/${platformListingId}`,
        operationType: 'DELETE',
      });

      logger.info('Mercari listing deleted via API:', platformListingId);
    } catch (error) {
      logger.error('Failed to delete Mercari listing via API:', error);

      // Send error to backend
      await httpClient.sendResult({
        success: false,
        listingId: '',
        platform,
        platformListingId,
        error: error instanceof Error ? error.message : 'Unknown error',
        operationType: 'DELETE',
      });

      throw error;
    }
    return;
  }

  // Fall back to browser automation for other platforms
  try {
    // Build the edit URL for the platform
    let editUrl: string;

    switch (platform) {
      case 'poshmark':
        // TODO: Implement Poshmark deletion
        logger.warn('Poshmark deletion not yet implemented');
        return;
      case 'depop':
        // TODO: Implement Depop deletion
        logger.warn('Depop deletion not yet implemented');
        return;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    // Open the edit page in a window behind the current window
    const window = await chrome.windows.create({
      url: editUrl,
      type: 'normal',
      focused: false,
      state: 'normal',
    });

    const tab = window.tabs?.[0];
    if (!tab || typeof tab?.id !== 'number') {
      throw new Error('Failed to create tab in minimized window');
    }

    // TypeScript doesn't narrow the type well here, so we use non-null assertion
    const tabId = tab!.id!;

    logger.info(`Opened ${platform} edit page in tab ${tabId} in minimized window ${window.id}`);

    // Wait for tab to load
    await waitForTabLoad(tabId);

    // Send DELETE_LISTING message to content script
    const message = createMessage('DELETE_LISTING', { platformListingId, reason });
    const result = await sendToContentScript(tabId, message);

    // Close window after a delay
    setTimeout(() => {
      if (window.id) {
        chrome.windows.remove(window.id);
      }
    }, 2000);

    logger.info('Listing deleted successfully:', result);

    // Send success response back to backend
    await httpClient.sendResult({
      success: true,
      listingId: '', // We don't have the original listing ID in this payload
      platform,
      platformListingId,
      platformUrl: editUrl,
      operationType: 'DELETE',
    });
  } catch (error) {
    logger.error('Failed to delete listing:', error);

    // Send error to backend
    await httpClient.sendResult({
      success: false,
      listingId: '',
      platform,
      platformListingId,
      error: error instanceof Error ? error.message : 'Unknown error',
      operationType: 'DELETE',
    });

    throw error;
  }
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
 * Handle session verification request
 * Checks DOM elements to verify login status
 */
async function handleVerifySession(payload: {
  platform: Platform;
}): Promise<{ success: boolean; error?: string }> {
  const { platform } = payload;

  logger.info(`Verifying session for ${platform}`);

  try {
    // Get platform URL
    const platformUrl = PLATFORM_URLS[platform]?.base;
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
    logger.info(`Sending CHECK_LOGIN message to ${platform} tab ${tabId}`);

    try {
      const result = await sendToContentScript(tabId, checkMessage);
      logger.info(`${platform} content script response:`, result);

      // Keep tab open longer for debugging (10 seconds)
      if (tabs.length === 0) {
        setTimeout(() => {
          logger.info(`Closing ${platform} verification tab ${tabId}`);
          chrome.tabs.remove(tabId);
        }, 10000);
      }

      // Trust DOM check as source of truth
      const domLoggedIn = result.loggedIn;
      logger.info(`${platform} verification result - DOM check: ${domLoggedIn}`);

      if (domLoggedIn) {
        // DOM says logged in - accept it
        logger.info(`Session verified for ${platform}`);
        return { success: true };
      } else {
        // DOM says NOT logged in - reject it
        logger.warn(`Not logged in to ${platform}`);
        return {
          success: false,
          error: `Not logged in to ${platform}. Please log in and try again.`,
        };
      }
    } catch (error) {
      logger.error(`${platform} content script error:`, error);
      // Close tab if we created it
      if (tabs.length === 0) {
        setTimeout(() => {
          chrome.tabs.remove(tabId);
        }, 2000);
      }

      // Content script didn't respond - likely extension not loaded or content script failed
      return {
        success: false,
        error: `Extension verification failed. Please reload the extension at chrome://extensions and try again.`,
      };
    }
  } catch (error) {
    logger.error('Session verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during verification';

    return {
      success: false,
      error: `Verification error: ${errorMessage}. Try reloading the extension.`,
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

// Test function for console debugging
(globalThis as any).testDeleteListing = async (platformListingId: string) => {
  logger.info('TEST: Triggering deletion for', platformListingId);
  await handleWebSocketMessage({
    type: 'DELETE_LISTING',
    payload: {
      platform: 'mercari',
      platformListingId,
      reason: 'test_deletion',
    },
    requestId: 'test-' + Date.now(),
    timestamp: Date.now(),
  });
};

logger.info('Background service worker initialized');
