/**
 * Shared constants for Compr Chrome Extension
 */

// WebSocket configuration
export const WS_CONFIG = {
  // Will use environment-based URL
  DEV_URL: 'ws://localhost:3000/api/ws',
  PROD_URL: 'wss://compr.co/api/ws',

  // Reconnection settings
  RECONNECT_INTERVAL: 5000, // 5 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_BACKOFF_MULTIPLIER: 1.5,

  // Heartbeat
  PING_INTERVAL: 30000, // 30 seconds
  PONG_TIMEOUT: 10000, // 10 seconds
};

// Platform URLs
export const PLATFORM_URLS = {
  poshmark: {
    base: 'https://poshmark.com',
    login: 'https://poshmark.com/login',
    createListing: 'https://poshmark.com/create-listing',
    mySales: 'https://poshmark.com/sales',
  },
  mercari: {
    base: 'https://www.mercari.com',
    login: 'https://www.mercari.com/login',
    createListing: 'https://www.mercari.com/sell',
  },
  depop: {
    base: 'https://www.depop.com',
    login: 'https://www.depop.com/login',
    createListing: 'https://www.depop.com/products/create',
  },
};

// Sale detection settings
export const SALE_DETECTION = {
  CHECK_INTERVAL: 10, // minutes
  MIN_CHECK_INTERVAL: 5, // minimum allowed
  MAX_CHECK_INTERVAL: 60, // maximum allowed
  ALARM_NAME: 'saleDetectionAlarm',
};

// Extension metadata
export const EXTENSION_INFO = {
  NAME: 'Compr Crosslisting Extension',
  VERSION: '1.0.0',
  ID: '', // Will be set after Chrome Web Store submission
};

// Timing constants for human-like behavior
export const TIMING = {
  MIN_TYPING_DELAY: 50,
  MAX_TYPING_DELAY: 150,
  MIN_ACTION_DELAY: 500,
  MAX_ACTION_DELAY: 2000,
  PAGE_LOAD_TIMEOUT: 30000,
  FORM_SUBMIT_TIMEOUT: 15000,
};

// Storage keys
export const STORAGE_KEYS = {
  WS_URL: 'wsUrl',
  USER_ID: 'userId',
  AUTH_TOKEN: 'authToken',
  PLATFORM_CONNECTIONS: 'platformConnections',
  SETTINGS: 'settings',
  LAST_SALE_CHECK: 'lastSaleCheck',
};

// Default settings
export const DEFAULT_SETTINGS = {
  autoDelete: true,
  checkInterval: SALE_DETECTION.CHECK_INTERVAL,
  notifications: true,
};

// Message request timeout
export const MESSAGE_TIMEOUT = 60000; // 1 minute
