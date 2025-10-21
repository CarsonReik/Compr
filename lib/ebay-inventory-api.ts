// eBay Inventory API Integration
// Handles creating and managing listings on eBay using the Inventory API

import axios, { AxiosInstance } from 'axios';
import { getValidEbayToken } from './ebay-token-refresh';

const EBAY_SANDBOX = process.env.EBAY_ENVIRONMENT?.toLowerCase() === 'sandbox';
const EBAY_API_BASE = EBAY_SANDBOX
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

// Create a custom axios instance for eBay API that strips problematic headers
const ebayAxios: AxiosInstance = axios.create({
  baseURL: EBAY_API_BASE,
  transformRequest: [
    (data, headers) => {
      // Remove language headers that eBay rejects
      if (headers) {
        delete headers['Accept-Language'];
        delete headers['accept-language'];
        delete headers['Content-Language'];
        delete headers['content-language'];
      }
      // Return the data as-is (will be stringified by axios)
      return JSON.stringify(data);
    },
  ],
});

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
    };

    try {
      const response = await ebayAxios.put(
        `/sell/inventory/v1/inventory_item/${listingData.sku}`,
        inventoryItem,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          validateStatus: () => true, // Don't throw on any status
        }
      );

      if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
        console.error('eBay inventory item creation error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(response.data, null, 2),
        });
        return {
          success: false,
          sku: listingData.sku,
          error: response.data?.errors?.[0]?.message || response.data?.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // 204 No Content or 200 OK means success
      return { success: true, sku: listingData.sku };
    } catch (axiosError: any) {
      console.error('Axios error creating inventory item:', axiosError.message);
      return {
        success: false,
        sku: listingData.sku,
        error: axiosError.message || 'Network error',
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

    const response = await ebayAxios.post(
      `/sell/inventory/v1/offer`,
      offer,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      console.error('eBay offer creation error:', {
        status: response.status,
        statusText: response.statusText,
        errorData: JSON.stringify(response.data, null, 2),
      });
      return {
        success: false,
        error: response.data?.errors?.[0]?.message || response.data?.error || `HTTP ${response.status}: ${response.statusText}`,
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

    const response = await ebayAxios.post(
      `/sell/inventory/v1/offer/${offerId}/publish`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        validateStatus: () => true,
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      console.error('eBay offer publish error:', {
        status: response.status,
        statusText: response.statusText,
        errorData: JSON.stringify(response.data, null, 2),
      });
      return {
        success: false,
        error: response.data?.errors?.[0]?.message || response.data?.error || `HTTP ${response.status}: ${response.statusText}`,
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
