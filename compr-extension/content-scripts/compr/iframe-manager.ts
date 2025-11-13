/**
 * Iframe manager for compr.co
 * Creates hidden iframes for marketplace listing automation
 * This avoids background tab throttling since iframe is in active tab
 */

import { createMessage, logger } from '../../lib/messaging';

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_IFRAME') {
    handleCreateIframe(message.payload)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});

/**
 * Create hidden iframe and run listing automation
 */
async function handleCreateIframe(payload: {
  url: string;
  listingData: any;
  platform: string;
}): Promise<any> {
  const { url, listingData, platform } = payload;

  logger.info(`Creating hidden iframe for ${platform} listing`);

  // Create iframe element
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1200px';
  iframe.style.height = '800px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  // Add to DOM
  document.body.appendChild(iframe);

  try {
    // Wait for iframe to load
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 30000);

      iframe.onload = () => {
        clearTimeout(timeout);
        // Wait extra time for SPA to render
        setTimeout(resolve, 8000);
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Iframe failed to load'));
      };
    });

    logger.info('Iframe loaded, starting listing automation');

    // Send CREATE_LISTING message to iframe's content script
    // We need to communicate with the iframe's content script
    // Chrome doesn't allow direct postMessage to iframe content scripts,
    // so we'll use a different approach: inject code into the iframe

    const result = await executeInIframe(iframe, listingData, platform);

    logger.info('Listing automation completed:', result);

    return result;
  } finally {
    // Clean up iframe after a delay (allow time to see result)
    setTimeout(() => {
      logger.info('Removing iframe');
      iframe.remove();
    }, 2000);
  }
}

/**
 * Execute listing creation inside iframe
 * Uses postMessage to communicate with iframe's content script
 */
async function executeInIframe(
  iframe: HTMLIFrameElement,
  listingData: any,
  platform: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Iframe listing timeout - no response from content script'));
    }, 120000); // 2 minute timeout

    // Listen for response from iframe
    const messageHandler = (event: MessageEvent) => {
      // Verify message is from our iframe
      if (event.source !== iframe.contentWindow) {
        return;
      }

      if (event.data.type === 'LISTING_RESULT') {
        clearTimeout(timeout);
        window.removeEventListener('message', messageHandler);
        resolve(event.data.result);
      } else if (event.data.type === 'LISTING_ERROR') {
        clearTimeout(timeout);
        window.removeEventListener('message', messageHandler);
        reject(new Error(event.data.error));
      }
    };

    window.addEventListener('message', messageHandler);

    // Send CREATE_LISTING message to iframe
    iframe.contentWindow?.postMessage(
      {
        type: 'CREATE_LISTING',
        listingData,
        platform,
      },
      '*'
    );
  });
}

logger.info('Compr iframe manager loaded');
