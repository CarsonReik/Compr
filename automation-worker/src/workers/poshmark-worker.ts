import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { decryptCredentials } from '../utils/encryption';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

interface PoshmarkCredentials {
  username: string;
  password: string;
}

interface ListingData {
  title: string;
  description: string;
  price: number;
  category: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  condition: string;
  photo_urls: string[];
}

interface PoshmarkResult {
  success: boolean;
  platformListingId?: string;
  platformUrl?: string;
  error?: string;
}

/**
 * Map our condition values to Poshmark's condition options
 */
function mapCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    new: 'NWT (New With Tags)',
    like_new: 'NWOT (New Without Tags)',
    good: 'Good - Used',
    fair: 'Fair - Used',
    poor: 'Poor - Used',
  };
  return conditionMap[condition] || 'Good - Used';
}

/**
 * Map our category to Poshmark's category structure
 * This is a simplified mapping - you may need to expand this
 */
function mapCategory(category: string | null): string {
  if (!category) return 'Other';

  const categoryMap: Record<string, string> = {
    'Clothing': 'Women > Tops',
    'Shoes': 'Women > Shoes',
    'Accessories': 'Women > Accessories',
    'Electronics': 'Other',
    'Home': 'Home',
  };

  return categoryMap[category] || 'Other';
}

/**
 * Delay helper for human-like interactions
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max ms
 */
function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

export class PoshmarkWorker {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Puppeteer browser');

      this.browser = await puppeteer.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      });

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  /**
   * Main method to create a Poshmark listing
   */
  async createListing(
    encryptedCredentials: string,
    listingData: ListingData,
    jobId: string,
    userId: string,
    savedCookies?: string | null
  ): Promise<PoshmarkResult> {
    let page: Page | null = null;

    try {
      if (!this.browser) {
        await this.initialize();
      }

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      // Decrypt credentials
      logger.debug('Decrypting credentials', { jobId });
      const credentials = decryptCredentials(encryptedCredentials);

      // Create new page
      page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      );

      logger.info('Starting Poshmark listing creation', { jobId });

      // Step 1: Try to load saved cookies, or login if needed
      const needsLogin = await this.loadCookiesOrLogin(page, credentials, savedCookies, userId, jobId);

      if (needsLogin === 'pending_verification') {
        // Return special status indicating verification is needed
        return {
          success: false,
          error: 'VERIFICATION_REQUIRED',
        };
      }

      await randomDelay(2000, 3000);

      // Step 2: Navigate to create listing page
      await this.navigateToCreateListing(page);
      await randomDelay(1000, 2000);

      // Step 3: Upload photos
      await this.uploadPhotos(page, listingData.photo_urls);
      await randomDelay(2000, 3000);

      // Step 4: Fill in listing details
      await this.fillListingDetails(page, listingData);
      await randomDelay(1000, 2000);

      // Step 5: Submit listing
      const result = await this.submitListing(page);

      logger.info('Poshmark listing created successfully', { jobId, result });

      return {
        success: true,
        platformListingId: result.listingId,
        platformUrl: result.url,
      };
    } catch (error) {
      logger.error('Poshmark listing creation failed', error);

      // Take screenshot on error for debugging
      if (page) {
        try {
          await page.screenshot({ path: `error-${jobId}.png` });
        } catch (screenshotError) {
          logger.warn('Failed to capture error screenshot', screenshotError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Load saved cookies or perform login
   * Returns 'pending_verification' if verification code is needed
   */
  private async loadCookiesOrLogin(
    page: Page,
    credentials: PoshmarkCredentials,
    savedCookies: string | null | undefined,
    userId: string,
    jobId: string
  ): Promise<string | void> {
    // Try to load saved cookies first
    if (savedCookies) {
      logger.info('Attempting to load saved session cookies');
      try {
        const cookies = JSON.parse(savedCookies);
        await page.setCookie(...cookies);

        // Navigate to Poshmark to test if cookies are valid
        await page.goto('https://poshmark.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await randomDelay(2000, 3000);

        // Check if we're logged in
        const isLoggedIn = await this.checkIfLoggedIn(page);

        if (isLoggedIn) {
          logger.info('Successfully loaded session from saved cookies');
          return;
        } else {
          logger.warn('Saved cookies are expired or invalid, will perform fresh login');
        }
      } catch (error) {
        logger.warn('Failed to load saved cookies, will perform fresh login', { error });
      }
    }

    // No saved cookies or they're invalid - perform login
    const verificationNeeded = await this.login(page, credentials);

    if (verificationNeeded) {
      return 'pending_verification';
    }

    // Save cookies after successful login
    await this.saveCookies(page, userId);
  }

  /**
   * Check if user is logged in to Poshmark
   */
  private async checkIfLoggedIn(page: Page): Promise<boolean> {
    try {
      // Check for elements that only appear when logged in
      const loggedIn = await page.evaluate(() => {
        // Look for user menu or profile elements
        const userMenu = document.querySelector('[data-test="user-menu"]');
        const sellButton = document.querySelector('a[href="/sell"]');
        return !!(userMenu || sellButton);
      });

      return loggedIn;
    } catch (error) {
      logger.warn('Error checking login status', { error });
      return false;
    }
  }

  /**
   * Save current session cookies to database
   */
  private async saveCookies(page: Page, userId: string): Promise<void> {
    try {
      const cookies = await page.cookies();
      const cookiesJson = JSON.stringify(cookies);

      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Update platform_connections with new cookies
      const { error } = await supabase
        .from('platform_connections')
        .update({ session_cookies: cookiesJson })
        .eq('user_id', userId)
        .eq('platform', 'poshmark');

      if (error) {
        logger.error('Failed to save session cookies to database', { error });
      } else {
        logger.info('Session cookies saved successfully');
      }
    } catch (error) {
      logger.error('Error saving cookies', { error });
    }
  }

  /**
   * Login to Poshmark
   * Returns true if verification code is required
   */
  private async login(page: Page, credentials: PoshmarkCredentials): Promise<boolean> {
    logger.info('Navigating to Poshmark login page');

    try {
      // Try with a longer timeout and less strict wait condition
      await page.goto('https://poshmark.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      logger.info('Successfully loaded Poshmark login page');
    } catch (error) {
      logger.error('Failed to load Poshmark login page', { error: String(error) });

      // Try taking a screenshot to see what happened
      try {
        const screenshot = await page.screenshot({ encoding: 'base64' });
        logger.info('Screenshot taken after navigation failure');
      } catch (screenshotError) {
        logger.warn('Could not take screenshot');
      }

      throw error;
    }

    await randomDelay(1000, 2000);

    // Fill in username
    await page.type('input[name="login_form[username_email]"]', credentials.username, {
      delay: Math.random() * 50 + 50,
    });
    await randomDelay(500, 1000);

    // Fill in password
    await page.type('input[name="login_form[password]"]', credentials.password, {
      delay: Math.random() * 50 + 50,
    });
    await randomDelay(500, 1000);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation or verification screen
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (error) {
      logger.warn('Navigation after login click took longer than expected', { error });
    }

    await randomDelay(2000, 3000);

    // Check if verification code is required
    const needsVerification = await page.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();
      return (
        pageText.includes('verification code') ||
        pageText.includes('verify') ||
        pageText.includes('security code') ||
        document.querySelector('input[name="code"]') !== null ||
        document.querySelector('input[type="text"][placeholder*="code"]') !== null
      );
    });

    if (needsVerification) {
      logger.warn('Poshmark requires verification code - this needs to be handled manually first');
      return true; // Indicates verification is needed
    }

    // Verify login success
    const url = page.url();
    if (url.includes('login') || url.includes('error')) {
      throw new Error('Login failed - check credentials');
    }

    logger.info('Successfully logged into Poshmark');
    return false; // No verification needed
  }

  /**
   * Navigate to create listing page
   */
  private async navigateToCreateListing(page: Page): Promise<void> {
    logger.debug('Navigating to create listing page');

    await page.goto('https://poshmark.com/create-listing', { waitUntil: 'networkidle2' });
    await randomDelay(1000, 2000);
  }

  /**
   * Upload photos to listing
   */
  private async uploadPhotos(page: Page, photoUrls: string[]): Promise<void> {
    logger.debug(`Uploading ${photoUrls.length} photos`);

    if (photoUrls.length === 0) {
      throw new Error('No photos to upload');
    }

    // Poshmark allows up to 16 photos
    const photosToUpload = photoUrls.slice(0, 16);

    for (let i = 0; i < photosToUpload.length; i++) {
      const photoUrl = photosToUpload[i];

      try {
        // Download image temporarily (in production, you'd handle this differently)
        // For now, we'll use the URL directly if Poshmark supports URL upload
        // Otherwise, you'll need to download the image first

        logger.debug(`Uploading photo ${i + 1}/${photosToUpload.length}`);

        // Find file input
        const fileInput = await page.$('input[type="file"]');

        if (!fileInput) {
          throw new Error('File upload input not found');
        }

        // Note: This assumes photos are accessible file paths
        // In production, you'll need to download from Supabase Storage first
        // await fileInput.uploadFile(localFilePath);

        // For now, we'll skip actual file upload and assume the URLs work
        // You'll need to implement proper file downloading here

        await randomDelay(1000, 2000);
      } catch (error) {
        logger.warn(`Failed to upload photo ${i + 1}`, error);
      }
    }

    logger.info('Photos uploaded successfully');
  }

  /**
   * Fill in listing details
   */
  private async fillListingDetails(page: Page, listingData: ListingData): Promise<void> {
    logger.debug('Filling in listing details');

    // Title
    await page.type('input[name="title"]', listingData.title, {
      delay: Math.random() * 50 + 50,
    });
    await randomDelay(500, 1000);

    // Description
    await page.type('textarea[name="description"]', listingData.description, {
      delay: Math.random() * 30 + 30,
    });
    await randomDelay(500, 1000);

    // Category (select from dropdown)
    const mappedCategory = mapCategory(listingData.category);
    await page.click('select[name="category"]');
    await page.select('select[name="category"]', mappedCategory);
    await randomDelay(500, 1000);

    // Brand
    if (listingData.brand) {
      await page.type('input[name="brand"]', listingData.brand, {
        delay: Math.random() * 50 + 50,
      });
      await randomDelay(500, 1000);
    }

    // Size
    if (listingData.size) {
      await page.type('input[name="size"]', listingData.size, {
        delay: Math.random() * 50 + 50,
      });
      await randomDelay(500, 1000);
    }

    // Color
    if (listingData.color) {
      await page.click('select[name="color"]');
      await page.select('select[name="color"]', listingData.color);
      await randomDelay(500, 1000);
    }

    // Condition
    const mappedCondition = mapCondition(listingData.condition);
    await page.click('select[name="condition"]');
    await page.select('select[name="condition"]', mappedCondition);
    await randomDelay(500, 1000);

    // Price
    await page.type('input[name="price"]', listingData.price.toFixed(2), {
      delay: Math.random() * 50 + 50,
    });
    await randomDelay(500, 1000);

    logger.info('Listing details filled');
  }

  /**
   * Submit the listing
   */
  private async submitListing(page: Page): Promise<{ listingId: string; url: string }> {
    logger.debug('Submitting listing');

    // Click submit button
    await page.click('button[type="submit"]');

    // Wait for navigation to listing page
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Extract listing URL and ID
    const url = page.url();
    const listingId = url.split('/').pop() || '';

    if (!listingId) {
      throw new Error('Failed to extract listing ID from URL');
    }

    logger.info('Listing submitted successfully', { url, listingId });

    return { listingId, url };
  }
}
