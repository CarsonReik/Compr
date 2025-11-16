/**
 * Poshmark API Client
 * Direct API integration for creating listings without browser automation
 */

import { logger } from '../lib/messaging';
import { ListingData } from '../lib/types';

interface PoshmarkAuth {
  userId: string;
  cookies: chrome.cookies.Cookie[];
}

interface PoshmarkPostResponse {
  id: string;
  creator_id: string;
  status: string;
}

const POSHMARK_AUTH_STORAGE_KEY = 'poshmark_api_auth';

/**
 * Poshmark API Client
 * Handles direct API calls to Poshmark's REST endpoint
 */
class PoshmarkAPIClient {
  private baseUrl = 'https://poshmark.com';
  private auth: PoshmarkAuth | null = null;

  /**
   * Extract authentication from Poshmark cookies and user ID
   */
  async extractAuth(): Promise<PoshmarkAuth> {
    logger.info('Extracting Poshmark auth from cookies');

    try {
      // Always get fresh cookies (CSRF token changes frequently)
      // Try both domain variations to get all cookies
      const cookiesDotDomain = await chrome.cookies.getAll({ domain: '.poshmark.com' });
      const cookiesNoDot = await chrome.cookies.getAll({ domain: 'poshmark.com' });
      const cookiesUrl = await chrome.cookies.getAll({ url: 'https://poshmark.com' });

      // Combine and deduplicate cookies
      const allCookies = [...cookiesDotDomain, ...cookiesNoDot, ...cookiesUrl];
      const cookieMap = new Map<string, chrome.cookies.Cookie>();
      allCookies.forEach(cookie => cookieMap.set(cookie.name, cookie));
      const cookies = Array.from(cookieMap.values());

      if (!cookies || cookies.length === 0) {
        throw new Error('No Poshmark cookies found. Please log in to Poshmark first.');
      }

      logger.info(`Found ${cookies.length} Poshmark cookies`);
      logger.debug('Cookie names:', cookies.map(c => c.name).join(', '));

      // Try to get cached user ID to avoid extracting it every time
      const stored = await chrome.storage.local.get(POSHMARK_AUTH_STORAGE_KEY);
      const cachedAuth = stored[POSHMARK_AUTH_STORAGE_KEY] as PoshmarkAuth | undefined;

      let userId: string | undefined = cachedAuth?.userId;

      // If no cached user ID, extract it from cookies
      if (!userId) {
        const extractedUserId = await this.extractUserId(cookies);
        if (!extractedUserId) {
          throw new Error('Could not extract Poshmark user ID');
        }
        userId = extractedUserId;
        logger.info('Extracted user ID from cookies:', userId);
      } else {
        logger.info('Using cached user ID:', userId);
      }

      this.auth = { userId, cookies };

      // Cache only the user ID (not cookies, they change frequently)
      await chrome.storage.local.set({
        [POSHMARK_AUTH_STORAGE_KEY]: { userId, cookies: [] },
      });

      return this.auth;
    } catch (error) {
      logger.error('Failed to extract Poshmark auth:', error);
      throw error;
    }
  }

  /**
   * Extract user ID from Poshmark cookies
   */
  private async extractUserId(cookies: chrome.cookies.Cookie[]): Promise<string | null> {
    try {
      // Method 1: Try to extract from 'ui' cookie (URL-encoded JSON)
      const uiCookie = cookies.find(c => c.name === 'ui');
      if (uiCookie?.value) {
        try {
          const decoded = decodeURIComponent(uiCookie.value);
          const uiData = JSON.parse(decoded);
          if (uiData.uid) {
            logger.info('Extracted user ID from ui cookie:', uiData.uid);
            return uiData.uid;
          }
        } catch (e) {
          logger.debug('Failed to parse ui cookie');
        }
      }

      // Method 2: Try to extract from JWT cookie (base64 encoded)
      const jwtCookie = cookies.find(c => c.name === 'jwt');
      if (jwtCookie?.value) {
        try {
          // JWT format: header.payload.signature
          const parts = jwtCookie.value.split('.');
          if (parts.length === 3) {
            // Decode the payload (second part)
            const payload = JSON.parse(atob(parts[1]));
            if (payload.user_id) {
              logger.info('Extracted user ID from JWT:', payload.user_id);
              return payload.user_id;
            }
          }
        } catch (e) {
          logger.debug('Failed to parse JWT cookie');
        }
      }

      logger.error('Could not find user ID in cookies');
      return null;
    } catch (error) {
      logger.error('Failed to extract user ID:', error);
      return null;
    }
  }

  /**
   * Clear cached auth tokens (call this if auth fails)
   */
  async clearAuth(): Promise<void> {
    this.auth = null;
    await chrome.storage.local.remove(POSHMARK_AUTH_STORAGE_KEY);
    logger.info('Cleared cached Poshmark auth');
  }

  /**
   * Upload images to Poshmark
   * Returns the uploaded picture objects
   */
  async uploadImages(imageUrls: string[], postId: string, csrfToken: string): Promise<any[]> {
    if (!this.auth) {
      await this.extractAuth();
    }

    if (!this.auth) {
      throw new Error('Not authenticated with Poshmark');
    }

    logger.info(`Uploading ${imageUrls.length} images to Poshmark for post ${postId}`);

    try {
      // Download images as blobs
      const uploadedPictures: any[] = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        logger.info(`Uploading image ${i + 1}/${imageUrls.length}`);

        const response = await fetch(url);
        const blob = await response.blob();

        const uploadedPicture = await this.uploadSingleImage(blob, postId, i, csrfToken);
        uploadedPictures.push(uploadedPicture);
      }

      logger.info('All images uploaded successfully');
      return uploadedPictures;
    } catch (error) {
      logger.error('Failed to upload images:', error);
      throw error;
    }
  }

  /**
   * Upload a single image to Poshmark
   */
  private async uploadSingleImage(imageBlob: Blob, postId: string, index: number, csrfToken: string): Promise<any> {
    if (!this.auth) {
      throw new Error('Not authenticated');
    }

    // Build multipart form data
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.jpg');

    // Build cookie header
    const cookieHeader = this.auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Make the request to upload image
    const response = await fetch(`${this.baseUrl}/api/posts/${postId}/media/scratch`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'x-xsrf-token': csrfToken,
        'origin': this.baseUrl,
        'referer': `${this.baseUrl}/create-listing`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    logger.info(`Image ${index + 1} uploaded:`, result);

    return result;
  }

  /**
   * Create a listing on Poshmark using the API
   */
  async createListing(listingData: ListingData): Promise<{
    platformListingId: string;
    platformUrl: string;
  }> {
    if (!this.auth) {
      await this.extractAuth();
    }

    if (!this.auth) {
      throw new Error('Not authenticated with Poshmark');
    }

    logger.info('Creating Poshmark listing via API:', listingData.title);

    try {
      // Step 1: Get CSRF token (only once for all requests)
      const csrfToken = await this.getCsrfToken();
      logger.info('Got CSRF token');

      // Step 2: Create a draft post
      const draftPost = await this.createDraftPost(listingData, csrfToken);
      const postId = draftPost.id;

      logger.info('Draft post created:', postId);

      // Step 3: Upload images
      const uploadedPictures = await this.uploadImages(listingData.photo_urls, postId, csrfToken);

      // Step 4: Update the post with all data including images
      await this.updatePost(postId, listingData, uploadedPictures, csrfToken);

      const platformUrl = `https://poshmark.com/listing/${postId}`;

      logger.info('Successfully created Poshmark listing:', postId);

      return {
        platformListingId: postId,
        platformUrl,
      };
    } catch (error) {
      logger.error('Failed to create Poshmark listing:', error);
      throw error;
    }
  }

  /**
   * Get CSRF token by fetching the create-listing page
   */
  private async getCsrfToken(): Promise<string> {
    if (!this.auth) {
      throw new Error('Not authenticated');
    }

    try {
      // Build cookie header
      const cookieHeader = this.auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');

      // Fetch the create-listing page to get CSRF token
      const response = await fetch(`${this.baseUrl}/create-listing`, {
        headers: {
          'Cookie': cookieHeader,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch create-listing page');
      }

      const html = await response.text();

      // Look for CSRF token in meta tag or script
      // Pattern: <meta name="csrf-token" content="..." /> or similar
      const metaMatch = html.match(/<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']csrf-token["']/i);

      if (metaMatch && metaMatch[1]) {
        logger.info('Extracted CSRF token from meta tag');
        return metaMatch[1];
      }

      // Alternative: look for it in JavaScript variables
      const scriptMatch = html.match(/csrfToken["']?\s*[:=]\s*["']([^"']+)["']/i) ||
                         html.match(/csrf["']?\s*[:=]\s*["']([^"']+)["']/i);

      if (scriptMatch && scriptMatch[1]) {
        logger.info('Extracted CSRF token from script');
        return scriptMatch[1];
      }

      throw new Error('Could not find CSRF token in page');
    } catch (error) {
      logger.error('Failed to get CSRF token:', error);
      throw error;
    }
  }

  /**
   * Create a draft post on Poshmark
   */
  private async createDraftPost(listingData: ListingData, csrfToken: string): Promise<PoshmarkPostResponse> {
    if (!this.auth) {
      throw new Error('Not authenticated');
    }

    // Build the post payload based on the structure you provided
    const payload = {
      post: {
        catalog: {
          department: listingData.poshmark_department || '583c7d134024035188906153', // Default to Women
          category: listingData.category || '518e4884402403bc7f6c6157', // Default category
          category_features: listingData.poshmark_category_features || [],
        },
        colors: listingData.colors || [],
        inventory: {
          size_quantity_revision: 0,
          size_quantities: [
            {
              size_obj: {
                id: listingData.size || 'OS',
                display: listingData.size || 'One Size',
              },
              quantity_available: 1,
              quantity_sold: 0,
              size_set_tags: ['standard'],
            },
          ],
        },
        price_amount: {
          val: Math.floor(listingData.price).toString(), // Poshmark requires whole dollar amounts
          currency_code: 'USD',
          currency_symbol: '$',
        },
        original_price_amount: {
          val: listingData.original_price ? Math.floor(listingData.original_price).toString() : Math.floor(listingData.price * 2.5).toString(),
          currency_code: 'USD',
          currency_symbol: '$',
        },
        title: listingData.title,
        description: listingData.description,
        brand: listingData.brand || 'other',
        condition: this.mapConditionToPoshmark(listingData.condition),
        cover_shot: {}, // Will be set after image upload
        pictures: [],
        seller_private_info: {},
        seller_shipping_discount: {
          id: '5ff7647a5d29bbebfa25f9d0', // Default shipping discount
        },
        videos: [],
      },
    };

    // Build cookie header
    const cookieHeader = this.auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Make the request to create draft post
    const response = await fetch(`${this.baseUrl}/vm-rest/users/${this.auth.userId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'x-xsrf-token': csrfToken,
        'accept': 'application/json',
        'origin': this.baseUrl,
        'referer': `${this.baseUrl}/create-listing`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Poshmark API error response:', errorText);

      // If auth failed, clear cached tokens
      if (response.status === 401 || response.status === 403) {
        await this.clearAuth();
      }

      throw new Error(`Draft post creation failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    logger.info('Poshmark draft post creation response:', result);

    // Check if there's an error in the response
    if (result.error) {
      logger.error('Poshmark API returned error:', result.error);
      throw new Error(`Draft post creation failed: ${JSON.stringify(result.error)}`);
    }

    return result;
  }

  /**
   * Update the post with images and finalize
   */
  private async updatePost(
    postId: string,
    listingData: ListingData,
    uploadedPictures: any[],
    csrfToken: string
  ): Promise<void> {
    if (!this.auth) {
      throw new Error('Not authenticated');
    }

    // Build the update payload with pictures
    const payload = {
      post: {
        catalog: {
          department: listingData.poshmark_department || '583c7d134024035188906153',
          category: listingData.category || '518e4884402403bc7f6c6157',
          category_features: listingData.poshmark_category_features || [],
        },
        colors: listingData.colors || [],
        inventory: {
          size_quantity_revision: 0,
          size_quantities: [
            {
              size_obj: {
                id: listingData.size || 'OS',
                display: listingData.size || 'One Size',
              },
              quantity_available: 1,
              quantity_sold: 0,
              size_set_tags: ['standard'],
            },
          ],
        },
        price_amount: {
          val: Math.floor(listingData.price).toString(), // Poshmark requires whole dollar amounts
          currency_code: 'USD',
          currency_symbol: '$',
        },
        original_price_amount: {
          val: listingData.original_price ? Math.floor(listingData.original_price).toString() : Math.floor(listingData.price * 2.5).toString(),
          currency_code: 'USD',
          currency_symbol: '$',
        },
        title: listingData.title,
        description: listingData.description,
        brand: listingData.brand || 'other',
        condition: this.mapConditionToPoshmark(listingData.condition),
        cover_shot: uploadedPictures[0] || {},
        pictures: uploadedPictures,
        seller_private_info: {},
        seller_shipping_discount: {
          id: '5ff7647a5d29bbebfa25f9d0',
        },
        videos: [],
      },
    };

    // Build cookie header
    const cookieHeader = this.auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Make the request to update post
    const response = await fetch(`${this.baseUrl}/vm-rest/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'x-xsrf-token': csrfToken,
        'accept': 'application/json',
        'origin': this.baseUrl,
        'referer': `${this.baseUrl}/create-listing`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Post update failed: ${response.status} ${errorText}`);
    }

    logger.info('Post updated successfully with images');
  }

  /**
   * Map our condition values to Poshmark condition strings
   */
  private mapConditionToPoshmark(condition: string): string {
    const mapping: Record<string, string> = {
      new: 'nwt',
      like_new: 'nwt',
      good: 'good',
      fair: 'fair',
      poor: 'poor',
    };

    return mapping[condition.toLowerCase()] || 'good';
  }

  /**
   * Test if auth tokens are still valid
   */
  async testAuth(): Promise<boolean> {
    try {
      await this.extractAuth();
      return true;
    } catch (error) {
      logger.warn('Poshmark auth test failed:', error);
      return false;
    }
  }
}

export const poshmarkApiClient = new PoshmarkAPIClient();
