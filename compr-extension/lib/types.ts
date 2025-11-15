/**
 * Shared TypeScript types for Compr Chrome Extension
 */

export type Platform = 'poshmark' | 'mercari' | 'depop';

export type MessageType =
  | 'CREATE_LISTING'
  | 'CREATE_IFRAME'
  | 'DELETE_LISTING'
  | 'CHECK_STATUS'
  | 'CHECK_LOGIN'
  | 'GET_MERCARI_AUTH'
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
  photos: string[]; // Alias for photo_urls
  original_price?: number | null;
  // Shipping fields
  weight_lb?: number;
  weight_oz?: number;
  // Poshmark-specific fields
  poshmark_color?: string[];
  poshmark_new_with_tags?: boolean;
  poshmark_category?: string | null;
  poshmark_department?: string | null;
  poshmark_category_features?: string[];
  colors?: string[];
  // Mercari-specific fields
  mercari_category?: string | null;
  mercari_brand_id?: string | null;
  mercari_shipping_carrier?: string | null;
  mercari_shipping_type?: string | null;
  // Depop-specific fields
  depop_category?: string | null;
  depop_subcategory?: string | null;
  depop_shipping_price?: number | null;
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
  operationType?: 'CREATE' | 'DELETE';
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
 * Mercari-specific types
 */
export namespace Mercari {
  export interface Category {
    tier1: string;
    tier2: string;
    tier3?: string;
  }

  export interface Condition {
    value: string;
    label: string;
  }

  export const CONDITIONS: Record<string, Condition> = {
    new: { value: 'new', label: 'New' },
    like_new: { value: 'like_new', label: 'Like New' },
    good: { value: 'good', label: 'Good' },
    fair: { value: 'fair', label: 'Fair' },
    poor: { value: 'poor', label: 'Poor' },
  };
}

/**
 * Depop-specific types
 */
export namespace Depop {
  export interface Condition {
    value: string;
    label: string;
  }

  export const CONDITIONS: Record<string, Condition> = {
    new: { value: 'brand_new', label: 'Brand new' },
    like_new: { value: 'like_new', label: 'Like new' },
    good: { value: 'used_excellent', label: 'Used - Excellent' },
    fair: { value: 'used_good', label: 'Used - Good' },
    poor: { value: 'used_fair', label: 'Used - Fair' },
  };

  // Depop parcel size options based on weight
  export const PARCEL_SIZES = {
    'extra_extra_small': { maxOz: 4, label: 'Extra extra small', price: 4.99 },
    'extra_small': { maxOz: 8, label: 'Extra small', price: 5.99 },
    'small': { maxOz: 12, label: 'Small', price: 6.49 },
    'medium': { maxLb: 1, label: 'Medium', price: 7.99 },
    'large': { maxLb: 2, label: 'Large', price: 11.99 },
    'extra_large': { maxLb: 10, label: 'Extra large', price: 13.99 },
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
