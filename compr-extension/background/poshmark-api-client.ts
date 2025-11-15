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
      // First, try to load from cached storage
      const stored = await chrome.storage.local.get(POSHMARK_AUTH_STORAGE_KEY);
      const cachedAuth = stored[POSHMARK_AUTH_STORAGE_KEY] as PoshmarkAuth | undefined;
      if (cachedAuth?.userId && cachedAuth?.cookies?.length > 0) {
        logger.info('Using cached Poshmark auth');
        this.auth = cachedAuth;
        return this.auth;
      }

      // Get all Poshmark cookies
      const cookies = await chrome.cookies.getAll({ domain: '.poshmark.com' });

      if (!cookies || cookies.length === 0) {
        throw new Error('No Poshmark cookies found. Please log in to Poshmark first.');
      }

      logger.info(`Found ${cookies.length} Poshmark cookies`);

      // Extract user ID from a page visit
      // We need to make a request to get the user ID from the page or API
      const userId = await this.extractUserId(cookies);

      if (!userId) {
        throw new Error('Could not extract Poshmark user ID');
      }

      logger.info('Successfully extracted Poshmark auth, user ID:', userId);

      this.auth = { userId, cookies };

      // Cache the auth for future use
      await chrome.storage.local.set({
        [POSHMARK_AUTH_STORAGE_KEY]: this.auth,
      });

      return this.auth;
    } catch (error) {
      logger.error('Failed to extract Poshmark auth:', error);
      throw error;
    }
  }

  /**
   * Extract user ID from Poshmark by checking the user's profile
   */
  private async extractUserId(cookies: chrome.cookies.Cookie[]): Promise<string | null> {
    try {
      // Make a request to Poshmark to get user info
      // The user ID should be in the page or in API responses
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      const response = await fetch(`${this.baseUrl}/api/v1/users/self`, {
        headers: {
          'Cookie': cookieHeader,
        },
      });

      if (!response.ok) {
        logger.warn('Failed to get user info from /api/v1/users/self');
        return null;
      }

      const data = await response.json();
      return data?.id || data?.user_id || null;
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
  async uploadImages(imageUrls: string[], postId: string): Promise<any[]> {
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

        const uploadedPicture = await this.uploadSingleImage(blob, postId, i);
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
  private async uploadSingleImage(imageBlob: Blob, postId: string, index: number): Promise<any> {
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
      // Step 1: Create a draft post
      const draftPost = await this.createDraftPost(listingData);
      const postId = draftPost.id;

      logger.info('Draft post created:', postId);

      // Step 2: Upload images
      const uploadedPictures = await this.uploadImages(listingData.photo_urls, postId);

      // Step 3: Update the post with all data including images
      await this.updatePost(postId, listingData, uploadedPictures);

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
   * Create a draft post on Poshmark
   */
  private async createDraftPost(listingData: ListingData): Promise<PoshmarkPostResponse> {
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
          val: listingData.price.toString(),
          currency_code: 'USD',
          currency_symbol: '$',
        },
        original_price_amount: {
          val: listingData.original_price?.toString() || (listingData.price * 2.5).toString(),
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

    return result;
  }

  /**
   * Update the post with images and finalize
   */
  private async updatePost(
    postId: string,
    listingData: ListingData,
    uploadedPictures: any[]
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
          val: listingData.price.toString(),
          currency_code: 'USD',
          currency_symbol: '$',
        },
        original_price_amount: {
          val: listingData.original_price?.toString() || (listingData.price * 2.5).toString(),
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
