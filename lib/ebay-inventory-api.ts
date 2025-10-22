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
      quantity?: number; // Optional total quantity
      availabilityDistributions?: Array<{
        merchantLocationKey: string;
        quantity: number;
      }>;
    };
  };
}

interface EbayInventoryLocation {
  location: {
    address: {
      addressLine1?: string;
      city: string;
      stateOrProvince: string;
      postalCode?: string;
      country: string;
    };
  };
  locationTypes: string[];
  name: string;
  merchantLocationStatus: 'ENABLED';
}

interface EbayOffer {
  sku: string;
  marketplaceId: string;
  format: 'FIXED_PRICE';
  availableQuantity: number;
  merchantLocationKey: string; // Required for publishing
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
 * Get category suggestions from eBay based on listing title
 * Returns the most relevant leaf category ID
 */
export async function getCategorySuggestion(
  title: string,
  accessToken: string
): Promise<{ success: boolean; categoryId?: string; error?: string }> {
  try {
    // Use the Commerce Taxonomy API to get category suggestions
    const query = encodeURIComponent(title);
    console.log(`Fetching category suggestions for: "${title}"`);

    const response = await ebayRequest(
      'GET',
      `/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${query}`,
      accessToken
    );

    console.log(`Category suggestion API response status: ${response.status}`);

    if (response.status !== 200) {
      console.error('Error fetching category suggestions:', response.data);
      console.log('Falling back to default category 9355');
      return { success: true, categoryId: '9355' };
    }

    const suggestions = response.data?.categorySuggestions || [];
    console.log(`Received ${suggestions.length} category suggestions`);

    if (suggestions.length === 0) {
      // Default to a known valid category if no suggestions
      // 9355 = Cell Phones & Smartphones (known valid leaf)
      console.log('No suggestions found, using default category 9355');
      return { success: true, categoryId: '9355' };
    }

    // Return the first (most relevant) suggestion
    const categoryId = suggestions[0].category.categoryId;
    console.log(`Using suggested category: ${categoryId} for "${title}"`);
    return { success: true, categoryId };
  } catch (error) {
    console.error('Error getting category suggestion:', error);
    // Fall back to default category
    console.log('Exception occurred, falling back to default category 9355');
    return { success: true, categoryId: '9355' };
  }
}

/**
 * Get the user's fulfillment policies
 * Returns the first available fulfillment policy for use in listings
 */
export async function getFulfillmentPolicy(
  userId: string
): Promise<{ success: boolean; fulfillmentPolicyId?: string; error?: string }> {
  try {
    const accessToken = await getValidEbayToken(userId);

    const response = await ebayRequest(
      'GET',
      '/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US',
      accessToken
    );

    if (response.status !== 200) {
      console.error('Error fetching fulfillment policies:', response.data);
      return {
        success: false,
        error: 'Failed to fetch fulfillment policies. Please set up shipping policies in your eBay account.',
      };
    }

    const policies = response.data?.fulfillmentPolicies || [];
    if (policies.length === 0) {
      return {
        success: false,
        error: 'No fulfillment policies found. Please create a shipping policy in your eBay seller account first.',
      };
    }

    // Use the first available policy
    const policyId = policies[0].fulfillmentPolicyId;
    console.log(`Using fulfillment policy: ${policyId}`);
    return { success: true, fulfillmentPolicyId: policyId };
  } catch (error) {
    console.error('Error getting fulfillment policy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create or get a merchant location for the user
 * This is required before creating inventory items
 */
export async function ensureMerchantLocation(
  userId: string
): Promise<{ success: boolean; merchantLocationKey?: string; error?: string }> {
  try {
    const accessToken = await getValidEbayToken(userId);
    const merchantLocationKey = 'COMPR_DEFAULT';

    // First, try to get the existing location
    const getResponse = await ebayRequest(
      'GET',
      `/sell/inventory/v1/location/${merchantLocationKey}`,
      accessToken
    );

    // If location exists (200 OK), return it
    if (getResponse.status === 200) {
      console.log(`Merchant location ${merchantLocationKey} already exists`);
      return { success: true, merchantLocationKey };
    }

    // Location doesn't exist, create it
    console.log(`Creating merchant location ${merchantLocationKey}...`);

    const locationData: EbayInventoryLocation = {
      location: {
        address: {
          city: 'San Francisco',
          stateOrProvince: 'CA',
          country: 'US',
        },
      },
      locationTypes: ['WAREHOUSE'],
      name: 'Compr Default Location',
      merchantLocationStatus: 'ENABLED',
    };

    const createResponse = await ebayRequest(
      'POST',
      `/sell/inventory/v1/location/${merchantLocationKey}`,
      accessToken,
      locationData
    );

    if (createResponse.status !== 200 && createResponse.status !== 201 && createResponse.status !== 204) {
      console.error('eBay merchant location creation error:', {
        status: createResponse.status,
        errorData: JSON.stringify(createResponse.data, null, 2),
      });
      return {
        success: false,
        error: createResponse.data?.errors?.[0]?.message || `Failed to create location: HTTP ${createResponse.status}`,
      };
    }

    console.log(`Successfully created merchant location ${merchantLocationKey}`);
    return { success: true, merchantLocationKey };
  } catch (error) {
    console.error('Error ensuring merchant location:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create or update an inventory item on eBay
 * This is step 1 of creating a listing - it stores the item details
 */
export async function createInventoryItem(
  userId: string,
  listingData: EbayListingData,
  merchantLocationKey: string
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
          quantity: listingData.quantity, // Total quantity
          availabilityDistributions: [
            {
              merchantLocationKey,
              quantity: listingData.quantity,
            },
          ],
        },
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
  merchantLocationKey: string,
  fulfillmentPolicyId: string,
  categoryId: string = '260348' // Default to "Everything Else > Other" leaf category
): Promise<{ success: boolean; offerId?: string; error?: string }> {
  try {
    const accessToken = await getValidEbayToken(userId);

    const offer: EbayOffer = {
      sku: listingData.sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: listingData.quantity,
      merchantLocationKey, // Required for publishing
      pricingSummary: {
        price: {
          value: listingData.price.toFixed(2),
          currency: 'USD',
        },
      },
      listingDescription: listingData.description,
      listingPolicies: {
        fulfillmentPolicyId, // Required - seller's shipping policy
        // Payment and return policies are optional if seller has defaults
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
 * Complete flow: Ensure merchant location, create inventory item, create offer, and publish
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
  // Get access token once for all API calls
  const accessToken = await getValidEbayToken(userId);

  // Step 0: Ensure merchant location exists
  const locationResult = await ensureMerchantLocation(userId);
  if (!locationResult.success) {
    return { success: false, error: `Failed to setup location: ${locationResult.error}` };
  }

  // Step 0b: Get fulfillment policy
  const policyResult = await getFulfillmentPolicy(userId);
  if (!policyResult.success) {
    return { success: false, error: policyResult.error };
  }

  // Step 0c: Get category suggestion if not provided
  if (!categoryId) {
    console.log('No category provided, getting suggestion from eBay...');
    const categoryResult = await getCategorySuggestion(listingData.title, accessToken);
    if (categoryResult.success && categoryResult.categoryId) {
      categoryId = categoryResult.categoryId;
      console.log(`Using suggested category ID: ${categoryId}`);
    } else {
      console.error('Failed to get category suggestion:', categoryResult.error);
    }
  } else {
    console.log(`Using provided category ID: ${categoryId}`);
  }

  const merchantLocationKey = locationResult.merchantLocationKey!;
  const fulfillmentPolicyId = policyResult.fulfillmentPolicyId!;

  // Step 1: Create inventory item
  const inventoryResult = await createInventoryItem(userId, listingData, merchantLocationKey);
  if (!inventoryResult.success) {
    return { success: false, error: inventoryResult.error };
  }

  // Step 2: Create offer (pass merchantLocationKey and fulfillmentPolicyId)
  const offerResult = await createOffer(userId, listingData, merchantLocationKey, fulfillmentPolicyId, categoryId);
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
