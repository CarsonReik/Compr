// eBay Inventory API Integration
// Handles creating and managing listings on eBay using the Inventory API

import https from 'https';
import { getValidEbayToken } from './ebay-token-refresh';

const EBAY_SANDBOX = process.env.EBAY_ENVIRONMENT?.toLowerCase() === 'sandbox';
const EBAY_HOST = EBAY_SANDBOX ? 'api.sandbox.ebay.com' : 'api.ebay.com';

/**
 * Make an HTTP request to eBay API using native https module
 * This gives us full control over headers without automatic additions
 */
function ebayRequest(
  method: string,
  path: string,
  accessToken: string,
  body?: any
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const bodyString = body ? JSON.stringify(body) : '';

    // Build headers object with ONLY the headers we want
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Host': EBAY_HOST,
      'Content-Language': 'en-US', // Set to a valid value eBay accepts
      'Accept-Language': 'en-US', // Set to a valid value eBay accepts
    };

    if (bodyString) {
      headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const options = {
      hostname: EBAY_HOST,
      path,
      method,
      headers,
    };

    console.log('Making native HTTPS request:', {
      method,
      path,
      headers: options.headers,
    });

    const req = https.request(options, (res) => {
      console.log('Response headers from eBay:', res.headers);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 0, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 0, data: {} });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (bodyString) {
      req.write(bodyString);
    }

    req.end();
  });
}

export interface EbayListingData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: 'NEW' | 'LIKE_NEW' | 'VERY_GOOD' | 'GOOD' | 'ACCEPTABLE' | 'FOR_PARTS_OR_NOT_WORKING';
  category?: string;
  brand?: string;
  sku: string;
  upc?: string;
  photoUrls: string[];
  // eBay-specific fields from platform_metadata
  returnPolicy?: string; // '30_days', '60_days', 'no_returns'
  shippingService?: string; // 'economy', 'standard', 'expedited'
  weight?: number; // Weight in ounces
}

interface EbayInventoryItem {
  sku: string;
  product: {
    title: string;
    description: string;
    aspects?: {
      Brand?: string[];
      Condition?: string[];
    };
    imageUrls: string[];
    upc?: string[];
  };
  condition: string;
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
  location: {
    country: string;
  };
}

interface EbayOffer {
  sku: string;
  marketplaceId: string;
  format: 'FIXED_PRICE';
  availableQuantity: number;
  pricingSummary: {
    price: {
      value: string;
      currency: 'USD';
    };
  };
  listingDescription: string;
  listingPolicies: {
    fulfillmentPolicyId?: string;
    paymentPolicyId?: string;
    returnPolicyId?: string;
  };
  categoryId: string;
}

/**
 * Map our condition values to eBay's condition enums
 */
function mapConditionToEbay(condition: string): string {
  const conditionMap: Record<string, string> = {
    new: 'NEW',
    like_new: 'LIKE_NEW',
    good: 'GOOD',
    fair: 'ACCEPTABLE',
    poor: 'FOR_PARTS_OR_NOT_WORKING',
  };
  return conditionMap[condition.toLowerCase()] || 'USED_EXCELLENT';
}

/**
 * Create or update an inventory item on eBay
 * This is step 1 of creating a listing - it stores the item details
 */
export async function createInventoryItem(
  userId: string,
  listingData: EbayListingData
): Promise<{ success: boolean; sku: string; error?: string }> {
  try {
    const accessToken = await getValidEbayToken(userId);

    const inventoryItem: EbayInventoryItem = {
      sku: listingData.sku,
      product: {
        title: listingData.title.substring(0, 80), // eBay max 80 chars
        description: listingData.description,
        imageUrls: listingData.photoUrls.slice(0, 12), // eBay max 12 images
        ...(listingData.brand && {
          aspects: {
            Brand: [listingData.brand],
          },
        }),
        ...(listingData.upc && { upc: [listingData.upc] }),
      },
      condition: mapConditionToEbay(listingData.condition),
      availability: {
        shipToLocationAvailability: {
          quantity: listingData.quantity,
        },
      },
      // Location information required by eBay
      location: {
        country: 'US', // Default to US for now
      },
    };

    console.log('Creating/updating inventory item with data:', JSON.stringify(inventoryItem, null, 2));

    try {
      const response = await ebayRequest(
        'PUT',
        `/sell/inventory/v1/inventory_item/${listingData.sku}`,
        accessToken,
        inventoryItem
      );

      if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
        console.error('eBay inventory item creation error:', {
          status: response.status,
          errorData: JSON.stringify(response.data, null, 2),
        });
        return {
          success: false,
          sku: listingData.sku,
          error: response.data?.errors?.[0]?.message || response.data?.error || `HTTP ${response.status}`,
        };
      }

      // 204 No Content or 200 OK means success
      return { success: true, sku: listingData.sku };
    } catch (error: any) {
      console.error('Error creating inventory item:', error.message);
      return {
        success: false,
        sku: listingData.sku,
        error: error.message || 'Network error',
      };
    }
  } catch (error) {
    console.error('Error creating eBay inventory item:', error);
    return {
      success: false,
      sku: listingData.sku,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create an offer for an inventory item
 * This is step 2 - it creates the actual listing/offer to sell the item
 */
export async function createOffer(
  userId: string,
  listingData: EbayListingData,
  categoryId: string = '267' // Default to "Other" category
): Promise<{ success: boolean; offerId?: string; error?: string }> {
  try {
    const accessToken = await getValidEbayToken(userId);

    // For sandbox/testing, we'll use default policies
    // In production, sellers would set up their own policies in eBay settings
    const offer: EbayOffer = {
      sku: listingData.sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: listingData.quantity,
      pricingSummary: {
        price: {
          value: listingData.price.toFixed(2),
          currency: 'USD',
        },
      },
      listingDescription: listingData.description,
      listingPolicies: {
        // These would need to be configured by the seller
        // For now we'll let eBay use defaults
      },
      categoryId,
    };

    const response = await ebayRequest(
      'POST',
      `/sell/inventory/v1/offer`,
      accessToken,
      offer
    );

    if (response.status !== 200 && response.status !== 201) {
      // Check if the error is "Offer entity already exists" (errorId 25002)
      if (response.data?.errors?.[0]?.errorId === 25002) {
        // Extract the existing offerId from the error response
        const existingOfferId = response.data.errors[0].parameters?.find(
          (p: any) => p.name === 'offerId'
        )?.value;

        if (existingOfferId) {
          console.log(`Offer already exists for SKU ${listingData.sku}, updating existing offerId: ${existingOfferId}`);

          // Update the existing offer with PUT to ensure it references the updated inventory item
          const updateResponse = await ebayRequest(
            'PUT',
            `/sell/inventory/v1/offer/${existingOfferId}`,
            accessToken,
            offer
          );

          if (updateResponse.status !== 200 && updateResponse.status !== 204) {
            console.error('eBay offer update error:', {
              status: updateResponse.status,
              errorData: JSON.stringify(updateResponse.data, null, 2),
            });
            return {
              success: false,
              error: updateResponse.data?.errors?.[0]?.message || `Failed to update existing offer: HTTP ${updateResponse.status}`,
            };
          }

          console.log(`Successfully updated offer ${existingOfferId}`);
          return { success: true, offerId: existingOfferId };
        }
      }

      console.error('eBay offer creation error:', {
        status: response.status,
        errorData: JSON.stringify(response.data, null, 2),
      });
      return {
        success: false,
        error: response.data?.errors?.[0]?.message || response.data?.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, offerId: response.data.offerId };
  } catch (error) {
    console.error('Error creating eBay offer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Publish an offer to make it live on eBay
 * This is step 3 - it makes the listing visible to buyers
 */
export async function publishOffer(
  userId: string,
  offerId: string
): Promise<{ success: boolean; listingId?: string; error?: string }> {
  try {
    const accessToken = await getValidEbayToken(userId);

    const response = await ebayRequest(
      'POST',
      `/sell/inventory/v1/offer/${offerId}/publish`,
      accessToken,
      {}
    );

    if (response.status !== 200 && response.status !== 201) {
      console.error('eBay offer publish error:', {
        status: response.status,
        errorData: JSON.stringify(response.data, null, 2),
      });
      return {
        success: false,
        error: response.data?.errors?.[0]?.message || response.data?.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      listingId: response.data.listingId,
    };
  } catch (error) {
    console.error('Error publishing eBay offer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete flow: Create inventory item, create offer, and publish
 */
export async function createEbayListing(
  userId: string,
  listingData: EbayListingData,
  categoryId?: string
): Promise<{
  success: boolean;
  listingId?: string;
  offerId?: string;
  error?: string;
  newSku?: string;
}> {
  // Step 1: Create inventory item
  const inventoryResult = await createInventoryItem(userId, listingData);
  if (!inventoryResult.success) {
    return { success: false, error: inventoryResult.error };
  }

  // Step 2: Create offer
  const offerResult = await createOffer(userId, listingData, categoryId);
  if (!offerResult.success) {
    return { success: false, error: offerResult.error };
  }

  // Step 3: Publish offer
  const publishResult = await publishOffer(userId, offerResult.offerId!);
  if (!publishResult.success) {
    // Check if it's the country error - if so, retry with a new SKU (only once)
    if (publishResult.error?.includes('Item.Country') && !listingData.sku.match(/\d{10}$/)) {
      console.log('Country error detected, retrying with new SKU...');
      // Use a shorter timestamp-based SKU that fits eBay's 50-char alphanumeric limit
      const timestamp = Date.now().toString().slice(-10); // Last 10 digits
      const baseSku = listingData.sku.replace(/[^A-Za-z0-9]/g, '').slice(0, 39); // Clean and limit base
      const newSku = `${baseSku}${timestamp}`;
      const retryData = { ...listingData, sku: newSku };

      const retryResult = await createEbayListing(userId, retryData, categoryId);
      if (retryResult.success) {
        return { ...retryResult, newSku };
      }
    }
    return { success: false, error: publishResult.error };
  }

  return {
    success: true,
    listingId: publishResult.listingId,
    offerId: offerResult.offerId,
  };
}

/**
 * Get eBay listing URL from listing ID
 */
export function getEbayListingUrl(listingId: string): string {
  if (EBAY_SANDBOX) {
    return `https://www.sandbox.ebay.com/itm/${listingId}`;
  }
  return `https://www.ebay.com/itm/${listingId}`;
}
