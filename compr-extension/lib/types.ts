/**
 * Shared TypeScript types for Compr Chrome Extension
 */

export type Platform = 'poshmark' | 'mercari' | 'depop';

export type MessageType =
  | 'CREATE_LISTING'
  | 'DELETE_LISTING'
  | 'CHECK_STATUS'
  | 'SALE_DETECTED'
  | 'CONNECTION_STATUS'
  | 'LISTING_PROGRESS'
  | 'ERROR'
  | 'SUCCESS'
  | 'ping'
  | 'pong';

/**
 * Message protocol for WebSocket communication
 */
export interface ExtensionMessage<T = any> {
  type: MessageType;
  payload: T;
  requestId: string;
  timestamp: number;
}

/**
 * Listing data structure matching backend
 */
export interface ListingData {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity?: number;
  category: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string;
  photo_urls: string[];
  original_price?: number | null;
  // Poshmark-specific fields
  poshmark_color?: string[];
  poshmark_new_with_tags?: boolean;
  poshmark_category?: string | null;
}

/**
 * Create listing payload
 */
export interface CreateListingPayload {
  platform: Platform;
  listingData: ListingData;
  userId: string;
}

/**
 * Listing creation progress updates
 */
export interface ListingProgress {
  listingId: string;
  platform: Platform;
  status: 'uploading_images' | 'filling_form' | 'submitting' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

/**
 * Listing creation result
 */
export interface ListingResult {
  success: boolean;
  listingId: string;
  platform: Platform;
  platformListingId?: string;
  platformUrl?: string;
  error?: string;
}

/**
 * Delete listing payload
 */
export interface DeleteListingPayload {
  platform: Platform;
  platformListingId: string;
  reason: 'sold' | 'manual' | 'error';
}

/**
 * Sale detection result
 */
export interface SoldItem {
  platform: Platform;
  platformListingId: string;
  listingId: string;
  soldAt: string;
  soldPrice?: number;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  userId?: string;
  platforms: {
    platform: Platform;
    loggedIn: boolean;
    lastChecked: number;
  }[];
}

/**
 * Platform connection info stored in extension
 */
export interface PlatformConnection {
  platform: Platform;
  loggedIn: boolean;
  username?: string;
  lastChecked: number;
}

/**
 * Extension storage schema
 */
export interface ExtensionStorage {
  wsUrl: string;
  userId: string | null;
  authToken: string | null;
  platformConnections: PlatformConnection[];
  settings: {
    autoDelete: boolean;
    checkInterval: number; // minutes
    notifications: boolean;
  };
}

/**
 * Poshmark-specific types
 */
export namespace Poshmark {
  export interface Category {
    department: string;
    category: string;
    subcategory?: string;
  }

  export interface Condition {
    value: string;
    label: string;
  }

  export const CONDITIONS: Record<string, Condition> = {
    new: { value: 'nwt', label: 'NWT (New With Tags)' },
    like_new: { value: 'nwot', label: 'NWOT (New Without Tags)' },
    good: { value: 'good', label: 'Good - Used' },
    fair: { value: 'fair', label: 'Fair - Used' },
    poor: { value: 'poor', label: 'Poor - Used' },
  };
}

/**
 * Error types
 */
export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

export class NetworkError extends ExtensionError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ExtensionError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class PlatformError extends ExtensionError {
  constructor(
    message: string,
    public platform: Platform,
    details?: any
  ) {
    super(message, 'PLATFORM_ERROR', details);
    this.name = 'PlatformError';
  }
}
