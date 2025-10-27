/**
 * Platform-specific listing validation
 * Ensures all required fields are filled before crosslisting
 */

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

export interface ListingData {
  title?: string;
  description?: string;
  price?: number;
  photo_urls?: string[];
  brand?: string;
  size?: string;
  color?: string;
  category?: string;
  original_price?: number;
  // Platform-specific fields
  ebay_category_id?: string;
  poshmark_category?: string;
  poshmark_color?: string[];
}

/**
 * Validate required fields for eBay listing
 */
export function validateEbayListing(listing: ListingData): ValidationResult {
  const missingFields: string[] = [];

  if (!listing.title || listing.title.trim().length === 0) {
    missingFields.push('Title');
  }
  if (!listing.description || listing.description.trim().length === 0) {
    missingFields.push('Description');
  }
  if (!listing.price || listing.price <= 0) {
    missingFields.push('Price');
  }
  if (!listing.photo_urls || listing.photo_urls.length === 0) {
    missingFields.push('Photos');
  }
  // eBay category is optional - will auto-detect if not provided

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate required fields for Poshmark listing
 */
export function validatePoshmarkListing(listing: ListingData): ValidationResult {
  const missingFields: string[] = [];

  if (!listing.title || listing.title.trim().length === 0) {
    missingFields.push('Title');
  }
  if (!listing.description || listing.description.trim().length === 0) {
    missingFields.push('Description');
  }
  if (!listing.price || listing.price <= 0) {
    missingFields.push('Price');
  }
  if (!listing.original_price || listing.original_price <= 0) {
    missingFields.push('Original Price');
  }
  if (!listing.photo_urls || listing.photo_urls.length === 0) {
    missingFields.push('Photos');
  }
  if (!listing.brand || listing.brand.trim().length === 0) {
    missingFields.push('Brand');
  }
  if (!listing.poshmark_category || listing.poshmark_category.trim().length === 0) {
    missingFields.push('Poshmark Category');
  }
  if (!listing.size || listing.size.trim().length === 0) {
    missingFields.push('Size');
  }
  // Color is optional for Poshmark

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate required fields for Mercari listing
 */
export function validateMercariListing(listing: ListingData): ValidationResult {
  const missingFields: string[] = [];

  if (!listing.title || listing.title.trim().length === 0) {
    missingFields.push('Title');
  }
  if (!listing.description || listing.description.trim().length === 0) {
    missingFields.push('Description');
  }
  if (!listing.price || listing.price <= 0) {
    missingFields.push('Price');
  }
  if (!listing.photo_urls || listing.photo_urls.length === 0) {
    missingFields.push('Photos');
  }
  if (!listing.category || listing.category.trim().length === 0) {
    missingFields.push('Category');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate required fields for Depop listing
 */
export function validateDepopListing(listing: ListingData): ValidationResult {
  const missingFields: string[] = [];

  if (!listing.title || listing.title.trim().length === 0) {
    missingFields.push('Title');
  }
  if (!listing.description || listing.description.trim().length === 0) {
    missingFields.push('Description');
  }
  if (!listing.price || listing.price <= 0) {
    missingFields.push('Price');
  }
  if (!listing.photo_urls || listing.photo_urls.length === 0) {
    missingFields.push('Photos');
  }
  if (!listing.category || listing.category.trim().length === 0) {
    missingFields.push('Category');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate listing for specific platform
 */
export function validateListingForPlatform(
  platform: string,
  listing: ListingData
): ValidationResult {
  switch (platform.toLowerCase()) {
    case 'ebay':
      return validateEbayListing(listing);
    case 'poshmark':
      return validatePoshmarkListing(listing);
    case 'mercari':
      return validateMercariListing(listing);
    case 'depop':
      return validateDepopListing(listing);
    case 'etsy':
      // Etsy not yet implemented
      return { isValid: false, missingFields: ['Etsy integration not yet available'] };
    default:
      return { isValid: false, missingFields: ['Unknown platform'] };
  }
}

/**
 * Get user-friendly error message for missing fields
 */
export function getValidationErrorMessage(
  platform: string,
  missingFields: string[]
): string {
  if (missingFields.length === 0) return '';

  if (missingFields.length === 1) {
    return `Missing required field for ${platform}: ${missingFields[0]}`;
  }

  const lastField = missingFields[missingFields.length - 1];
  const otherFields = missingFields.slice(0, -1).join(', ');
  return `Missing required fields for ${platform}: ${otherFields} and ${lastField}`;
}
