/**
 * Mercari API Client
 * Direct API integration for creating listings without browser automation
 */

import { logger } from '../lib/messaging';
import { ListingData } from '../lib/types';
import { findMercariBrandId, calculateMercariShippingClass } from '../lib/mercari-master-data';

interface MercariAuth {
  bearerToken: string;
  csrfToken: string;
}

interface UploadPhotoResponse {
  data: {
    uploadTempListingPhotos: {
      uploadIds: string[];
      __typename: string;
    };
  };
}

const MERCARI_AUTH_STORAGE_KEY = 'mercari_api_auth';

/**
 * Mercari API Client
 * Handles direct API calls to Mercari's GraphQL endpoint
 */
class MercariAPIClient {
  private apiUrl = 'https://www.mercari.com/v1/api';
  private auth: MercariAuth | null = null;

  /**
   * Extract authentication tokens from Mercari _mwus cookie (base64 encoded JSON)
   */
  async extractAuth(): Promise<MercariAuth> {
    logger.info('Extracting Mercari auth tokens from _mwus cookie');

    try {
      // First, try to load from cached storage
      const stored = await chrome.storage.local.get(MERCARI_AUTH_STORAGE_KEY);
      const cachedAuth = stored[MERCARI_AUTH_STORAGE_KEY] as MercariAuth | undefined;
      if (cachedAuth?.bearerToken && cachedAuth?.csrfToken) {
        logger.info('Using cached Mercari auth tokens');
        this.auth = cachedAuth;
        return this.auth;
      }

      // Get the _mwus cookie using URL instead of domain
      // This is more reliable for cookies with HttpOnly/Secure flags
      const urlVariations = [
        'https://www.mercari.com',
        'https://www.mercari.com/',
        'https://www.mercari.com/sell/',
        'https://mercari.com',
      ];

      let mwusCookie: chrome.cookies.Cookie | null | undefined;

      for (const url of urlVariations) {
        try {
          mwusCookie = await chrome.cookies.get({ url, name: '_mwus' });
          if (mwusCookie) {
            logger.info(`Found _mwus cookie for URL: ${url}`);
            break;
          }
        } catch (e) {
          logger.debug(`Failed to get cookie for ${url}:`, e);
        }
      }

      if (!mwusCookie?.value) {
        // Debug: log all cookies to see what's available
        const allCookies = await chrome.cookies.getAll({ url: 'https://www.mercari.com' });
        logger.error('Available cookies:', allCookies.map(c => `${c.name} (httpOnly: ${c.httpOnly}, secure: ${c.secure})`).join(', '));
        throw new Error('_mwus cookie not found. This cookie may be HttpOnly and inaccessible to extensions. You may need to visit mercari.com first.');
      }

      logger.info('Found _mwus cookie, decoding...');

      // Decode the base64 value
      const decodedJson = atob(mwusCookie.value);
      const authData = JSON.parse(decodedJson);

      logger.debug('Decoded _mwus structure:', Object.keys(authData));

      // Extract the Bearer token (accessToken) and CSRF token (csrfSecret)
      const bearerToken = authData.accessToken;
      const csrfToken = authData.csrfSecret;

      if (!bearerToken || !csrfToken) {
        logger.error('Decoded _mwus data:', authData);
        throw new Error('Missing accessToken or csrfSecret in _mwus cookie');
      }

      logger.info('Successfully extracted tokens from _mwus cookie');

      this.auth = { bearerToken, csrfToken };

      // Cache the tokens for future use
      await chrome.storage.local.set({
        [MERCARI_AUTH_STORAGE_KEY]: this.auth,
      });

      return this.auth;
    } catch (error) {
      logger.error('Failed to extract Mercari auth:', error);
      throw error;
    }
  }

  /**
   * Clear cached auth tokens (call this if auth fails)
   */
  async clearAuth(): Promise<void> {
    this.auth = null;
    await chrome.storage.local.remove(MERCARI_AUTH_STORAGE_KEY);
    logger.info('Cleared cached Mercari auth');
  }

  /**
   * Upload images to Mercari
   * Returns array of upload IDs to use in listing creation
   */
  async uploadImages(imageUrls: string[]): Promise<string[]> {
    if (!this.auth) {
      await this.extractAuth();
    }

    if (!this.auth) {
      throw new Error('Not authenticated with Mercari');
    }

    logger.info(`Uploading ${imageUrls.length} images to Mercari`);

    try {
      // Download images as blobs
      const imageBlobs = await Promise.all(
        imageUrls.map(async (url) => {
          const response = await fetch(url);
          return await response.blob();
        })
      );

      // Upload all images
      const uploadIds: string[] = [];

      for (let i = 0; i < imageBlobs.length; i++) {
        const blob = imageBlobs[i];
        logger.info(`Uploading image ${i + 1}/${imageBlobs.length}`);

        const uploadId = await this.uploadSingleImage(blob, i);
        uploadIds.push(uploadId);
      }

      logger.info('All images uploaded successfully:', uploadIds);
      return uploadIds;
    } catch (error) {
      logger.error('Failed to upload images:', error);
      throw error;
    }
  }

  /**
   * Upload a single image using GraphQL multipart request spec
   */
  private async uploadSingleImage(imageBlob: Blob, index: number): Promise<string> {
    if (!this.auth) {
      throw new Error('Not authenticated');
    }

    // Build multipart form data according to GraphQL multipart request spec
    const formData = new FormData();

    // 1. operations: The GraphQL query/mutation
    const operations = {
      operationName: 'uploadTempListingPhotos',
      variables: {
        input: {
          photos: [null], // null placeholder for file
        },
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: '9aa889ac01e549a01c66c7baabc968b0e4a7fa4cd0b6bd32b7599ce10ca09a10',
        },
      },
    };
    formData.append('operations', JSON.stringify(operations));

    // 2. map: Maps file positions to variable paths
    const map = {
      '1': ['variables.input.photos.0'],
    };
    formData.append('map', JSON.stringify(map));

    // 3. The actual file
    formData.append('1', imageBlob, 'image.jpg');

    // Make the request
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${this.auth.bearerToken}`,
        'x-csrf-token': this.auth.csrfToken,
        'x-app-version': '1',
        'x-platform': 'web',
        'x-gql-migration': '1',
        'apollo-require-preflight': 'true',
        // Note: Content-Type is automatically set by browser for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image upload failed: ${response.status} ${errorText}`);
    }

    const result: UploadPhotoResponse = await response.json();

    if (!result.data?.uploadTempListingPhotos?.uploadIds?.[0]) {
      throw new Error('Upload response missing uploadId');
    }

    return result.data.uploadTempListingPhotos.uploadIds[0];
  }

  /**
   * Create a listing on Mercari using the API
   */
  async createListing(listingData: ListingData, uploadIds: string[]): Promise<{
    platformListingId: string;
    platformUrl: string;
  }> {
    if (!this.auth) {
      await this.extractAuth();
    }

    if (!this.auth) {
      throw new Error('Not authenticated with Mercari');
    }

    logger.info('Creating Mercari listing via API:', listingData.title);

    try {
      // Calculate price in cents
      const priceInCents = Math.round(listingData.price * 100);

      // Calculate sales fee (10% of price)
      const salesFee = Math.round(priceInCents * 0.1);

      // Calculate min price for auto price drop (85% of price)
      const minPriceForAutoPriceDrop = Math.round(priceInCents * 0.85);

      // Map condition to Mercari condition ID
      const conditionId = this.mapConditionToMercariId(listingData.condition);

      // Calculate shipping weight in ounces
      const weightOz = (listingData.weight_lb || 0) * 16 + (listingData.weight_oz || 0);

      // Use Mercari-specific fields if available, otherwise use defaults
      let categoryId = 3373; // Default to Women/Tops category
      if (listingData.mercari_category) {
        const parsed = parseInt(listingData.mercari_category);
        if (!isNaN(parsed)) {
          categoryId = parsed;
        }
      }

      // Get Mercari brand ID (either from direct ID field or by mapping brand name)
      let brandId = 19044; // Default fallback to generic brand
      if ((listingData as any).mercari_brand_id) {
        // Use the Mercari-specific brand ID if provided
        brandId = parseInt((listingData as any).mercari_brand_id);
        logger.info(`Using provided Mercari brand ID: ${brandId}`);
      } else if (listingData.brand) {
        // Fall back to mapping brand name to ID
        const mappedId = await findMercariBrandId(listingData.brand);
        if (mappedId) {
          brandId = mappedId;
          logger.info(`Brand name mapping: "${listingData.brand}" -> ${brandId}`);
        } else {
          logger.warn(`Brand "${listingData.brand}" not found in Mercari master data, using default: ${brandId}`);
        }
      } else {
        logger.info(`No brand provided, using default: ${brandId}`);
      }

      // Calculate shipping class based on weight
      const shippingClassIds = calculateMercariShippingClass(weightOz);
      logger.info(`Shipping class for ${weightOz}oz: ${shippingClassIds}`);

      // Build the mutation payload
      const payload = {
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: '265dab5d0d382d3c83dda7d65e9ad111f47c27aa5d92c7d9a4bacd890d5e32c0',
          },
        },
        operationName: 'createListing',
        variables: {
          input: {
            photoIds: uploadIds,
            name: listingData.title,
            price: priceInCents,
            description: listingData.description,
            categoryId,
            conditionId,
            shippingPayerId: 2, // 2 = buyer pays shipping
            zipCode: '90210', // TODO: Get user's zip code
            salesFee,
            shippingClassIds,
            suggestedShippingClassIds: shippingClassIds,
            shippingWeightUnit: 'OUNCE',
            shippingDimensionUnit: 'INCH',
            shippingPackageWeight: weightOz || 16, // Default to 1 lb if not provided
            minPriceForAutoPriceDrop,
            offerConfig: {
              minPriceForSmartOffer: 0,
            },
            isShippingSoyo: false,
            shippingPackageLength: 12,
            shippingPackageHeight: 10,
            shippingPackageWidth: 12,
            brandId,
          },
        },
      };

      logger.debug('Creating listing with payload:', JSON.stringify(payload.variables.input, null, 2));

      // Make the request
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.auth.bearerToken}`,
          'x-csrf-token': this.auth.csrfToken,
          'x-app-version': '1',
          'x-platform': 'web',
          'x-gql-migration': '1',
          'apollo-require-preflight': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Mercari API error response:', errorText);

        // If auth failed, clear cached tokens
        if (response.status === 401 || response.status === 403) {
          await this.clearAuth();
        }

        throw new Error(`Listing creation failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      logger.info('Mercari listing creation response:', result);

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        logger.error('GraphQL errors:', result.errors);
        const errorMessages = result.errors.map((e: any) => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      // Extract listing ID from response
      // The response structure will be something like:
      // { data: { createListing: { id: "m12345678", ... } } }
      const listingId = result.data?.createListing?.id;
      if (!listingId) {
        logger.error('Full response:', JSON.stringify(result, null, 2));
        throw new Error('Response missing listing ID');
      }

      const platformUrl = `https://www.mercari.com/us/item/${listingId}`;

      logger.info('Successfully created Mercari listing:', listingId);

      return {
        platformListingId: listingId,
        platformUrl,
      };
    } catch (error) {
      logger.error('Failed to create Mercari listing:', error);
      throw error;
    }
  }

  /**
   * Map our condition values to Mercari condition IDs
   */
  private mapConditionToMercariId(condition: string): number {
    const mapping: Record<string, number> = {
      new: 1,
      like_new: 2,
      good: 3,
      fair: 4,
      poor: 5,
    };

    return mapping[condition.toLowerCase()] || 3; // Default to "good"
  }

  /**
   * Test if auth tokens are still valid
   */
  async testAuth(): Promise<boolean> {
    try {
      await this.extractAuth();
      return true;
    } catch (error) {
      logger.warn('Mercari auth test failed:', error);
      return false;
    }
  }

  /**
   * Delete a listing on Mercari using the API
   */
  async deleteListing(platformListingId: string): Promise<void> {
    if (!this.auth) {
      await this.extractAuth();
    }

    if (!this.auth) {
      throw new Error('Not authenticated with Mercari');
    }

    logger.info('Deleting Mercari listing via API:', platformListingId);

    try {
      // Build the mutation payload for deletion
      const payload = {
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: '55bd4e7d2bc2936638e1451da3231e484993635d7603431d1a2978e3d59656f8',
          },
        },
        operationName: 'UpdateItemStatusMutation',
        variables: {
          input: {
            status: 'cancel',
            id: platformListingId,
          },
        },
      };

      logger.debug('Deleting listing with payload:', JSON.stringify(payload.variables, null, 2));

      // Make the request
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${this.auth.bearerToken}`,
          'x-csrf-token': this.auth.csrfToken,
          'x-app-version': '1',
          'x-platform': 'web',
          'apollo-require-preflight': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Mercari API error response:', errorText);

        // If auth failed, clear cached tokens
        if (response.status === 401 || response.status === 403) {
          await this.clearAuth();
        }

        throw new Error(`Listing deletion failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      logger.info('Mercari listing deletion response:', result);

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        logger.error('GraphQL errors:', result.errors);
        const errorMessages = result.errors.map((e: any) => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      logger.info('Successfully deleted Mercari listing:', platformListingId);
    } catch (error) {
      logger.error('Failed to delete Mercari listing:', error);
      throw error;
    }
  }

  /**
   * Debug helper: Log all Mercari cookies to console
   */
  async debugCookies(): Promise<void> {
    const cookies = await chrome.cookies.getAll({ domain: '.mercari.com' });
    logger.info('=== ALL MERCARI COOKIES ===');
    cookies.forEach(cookie => {
      logger.info(`Cookie: ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
    });
    logger.info('=== END COOKIES ===');
  }
}

export const mercariApiClient = new MercariAPIClient();

// Expose debug function for console testing
(globalThis as any).debugMercariCookies = async () => {
  await mercariApiClient.debugCookies();
};
