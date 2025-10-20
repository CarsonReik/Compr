// Platform types
export type Platform = 'ebay' | 'mercari' | 'poshmark' | 'depop' | 'etsy';

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
  outliersRemoved?: number;
  totalListings?: number;
}

// Mercari sold listing type (for later)
export interface MercariSoldListing {
  title: string;
  price: number;
  soldDate: string;
  condition?: string;
  url: string;
}

// Mercari price data
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
  outliersRemoved?: number;
  totalListings?: number;
}

// Poshmark listing type
export interface PoshmarkListing {
  title: string;
  price: number;
  soldDate: string;
  condition?: string;
  url: string;
}

// Poshmark price data
export interface PoshmarkPriceData {
  platform: 'poshmark';
  itemCount: number;
  average: number;
  median: number;
  min: number;
  max: number;
  listings: PoshmarkListing[];
  fees: number;
  netProfit: number;
  outliersRemoved?: number;
  totalListings?: number;
}

// Depop listing type
export interface DepopListing {
  title: string;
  price: number;
  soldDate: string;
  condition?: string;
  url: string;
}

// Depop price data
export interface DepopPriceData {
  platform: 'depop';
  itemCount: number;
  average: number;
  median: number;
  min: number;
  max: number;
  listings: DepopListing[];
  fees: number;
  netProfit: number;
  outliersRemoved?: number;
  totalListings?: number;
}

// Etsy listing type
export interface EtsyListing {
  title: string;
  price: number;
  soldDate: string;
  condition?: string;
  url: string;
}

// Etsy price data
export interface EtsyPriceData {
  platform: 'etsy';
  itemCount: number;
  average: number;
  median: number;
  min: number;
  max: number;
  listings: EtsyListing[];
  fees: number;
  netProfit: number;
  outliersRemoved?: number;
  totalListings?: number;
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
  poshmark?: PoshmarkPriceData;
  depop?: DepopPriceData;
  etsy?: EtsyPriceData;
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

// Listing interface (for creating/editing listings)
export interface Listing {
  id?: string;
  user_id?: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  material?: string;
  weight_oz?: number;
  tags?: string[];
  sku?: string;
  upc?: string;
  original_price?: number;
  floor_price?: number;
  platform_metadata?: PlatformMetadata;
  photo_urls?: string[];
  status?: 'draft' | 'active' | 'sold' | 'archived';
  created_at?: string;
  updated_at?: string;
}

// Platform-specific metadata
export interface PlatformMetadata {
  etsy?: {
    who_made?: 'i_did' | 'someone_else' | 'collective';
    when_made?: 'made_to_order' | '2020_2025' | '2010_2019' | '2000_2009' | 'before_2000' | '1990s' | '1980s' | '1970s' | '1960s' | '1950s' | '1940s' | '1930s' | '1920s' | '1910s' | '1900s' | '1800s' | '1700s' | 'before_1700';
    is_supply?: boolean;
    processing_time?: '1_2_weeks' | '3_4_weeks' | '5_6_weeks';
  };
  mercari?: {
    floor_price?: number;
  };
}
