/**
 * Content script for compr.co pages
 * Acts as a bridge between the website and the extension
 */

import { logger } from '../../lib/messaging';

// Listen for messages from the Compr website
window.addEventListener('message', async (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) {
    return;
  }

  const message = event.data;

  // Handle CONNECT_EXTENSION message from website
  if (message.type === 'CONNECT_EXTENSION') {
    const { userId, authToken } = message.payload;

    logger.info('Received connection request from website', { userId });

    try {
      // Forward to background service worker
      const response = await chrome.runtime.sendMessage({
        type: 'CONNECT_BACKEND',
        payload: {
          userId,
          authToken,
        },
      });

      // Send response back to website
      window.postMessage(
        {
          type: 'EXTENSION_CONNECTED',
          payload: {
            success: response.success,
          },
        },
        window.location.origin
      );

      logger.info('Extension connected successfully');
    } catch (error) {
      logger.error('Failed to connect extension:', error);

      window.postMessage(
        {
          type: 'EXTENSION_CONNECTED',
          payload: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        window.location.origin
      );
    }
  }

  // Handle VERIFY_SESSION message from website
  if (message.type === 'VERIFY_SESSION') {
    const { platform } = message.payload;

    logger.info('Received session verification request', { platform });

    try {
      // Forward to background service worker
      const response = await chrome.runtime.sendMessage({
        type: 'VERIFY_SESSION',
        payload: {
          platform,
        },
      });

      // Send response back to website
      window.postMessage(
        {
          type: 'SESSION_VERIFIED',
          payload: {
            success: response.success,
            error: response.error,
          },
        },
        window.location.origin
      );

      logger.info('Session verification completed', { success: response.success });
    } catch (error) {
      logger.error('Failed to verify session:', error);

      window.postMessage(
        {
          type: 'SESSION_VERIFIED',
          payload: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        window.location.origin
      );
    }
  }
});

// Notify website that extension is ready
window.postMessage(
  {
    type: 'EXTENSION_READY',
    payload: {},
  },
  window.location.origin
);

logger.info('Compr bridge content script loaded');
