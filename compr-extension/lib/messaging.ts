/**
 * Messaging utilities for extension communication
 */

import { ExtensionMessage, MessageType } from './types';

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a typed message
 */
export function createMessage<T>(
  type: MessageType,
  payload: T,
  requestId?: string
): ExtensionMessage<T> {
  return {
    type,
    payload,
    requestId: requestId || generateRequestId(),
    timestamp: Date.now(),
  };
}

/**
 * Validate incoming message
 */
export function isValidMessage(data: any): data is ExtensionMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'payload' in data &&
    'requestId' in data &&
    'timestamp' in data
  );
}

/**
 * Send message to background script from content script
 */
export async function sendToBackground<T = any>(
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send message to content script from background
 */
export async function sendToContentScript<T = any>(
  tabId: number,
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Broadcast message to all tabs with content script
 */
export async function broadcastToAllTabs(message: ExtensionMessage): Promise<void> {
  const tabs = await chrome.tabs.query({});

  const promises = tabs.map((tab) => {
    if (tab.id) {
      return sendToContentScript(tab.id, message).catch(() => {
        // Ignore errors for tabs without content script
      });
    }
  });

  await Promise.all(promises);
}

/**
 * Logger utility for debugging
 */
export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Compr Extension]', ...args);
    }
  },

  info: (...args: any[]) => {
    console.info('[Compr Extension]', ...args);
  },

  warn: (...args: any[]) => {
    console.warn('[Compr Extension]', ...args);
  },

  error: (...args: any[]) => {
    console.error('[Compr Extension]', ...args);
  },
};
