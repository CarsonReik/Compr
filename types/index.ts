// Platform types
export type Platform = 'ebay' | 'mercari';

// eBay sold listing type
export interface EbaySoldListing {
  title: string;
  price: number;
  soldDate: string;
  condition?: string;
  url: string;
}

// eBay API response types
export interface EbayPriceData {
  platform: 'ebay';
  itemCount: number;
  average: number;
  median: number;
  min: number;
  max: number;
  listings: EbaySoldListing[];
  fees: number;
  netProfit: number;
}

// Mercari sold listing type (for later)
export interface MercariSoldListing {
  title: string;
  price: number;
  soldDate: string;
  condition?: string;
  url: string;
}

// Mercari price data (for later)
export interface MercariPriceData {
  platform: 'mercari';
  itemCount: number;
  average: number;
  median: number;
  min: number;
  max: number;
  listings: MercariSoldListing[];
  fees: number;
  netProfit: number;
}

// Rate limit info
export interface RateLimitInfo {
  remaining: number;
  resetAt: number;
}

// Token info
export interface TokenInfo {
  remaining: number;
}

// Combined comparison result
export interface ComparisonResult {
  query: string;
  ebay?: EbayPriceData;
  mercari?: MercariPriceData;
  recommendation?: {
    platform: Platform;
    profitDifference: number;
  };
  rateLimit?: RateLimitInfo;
  tokenInfo?: TokenInfo;
}

// API error response
export interface ApiError {
  error: string;
  details?: string;
}
