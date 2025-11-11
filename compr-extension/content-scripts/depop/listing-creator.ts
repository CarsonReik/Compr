/**
 * Depop listing creator content script
 * Injected into depop.com pages to automate listing creation
 */

import { ListingData, ExtensionMessage, ListingResult, Depop } from '../../lib/types';
import { logger } from '../../lib/messaging';
import { TIMING } from '../../lib/constants';

/**
 * Utility functions for human-like interactions
 */
class DepopAutomation {
  /**
   * Random delay between min and max
   */
  public delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Type text with human-like delay
   */
  public async typeText(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    element.focus();
    element.value = '';

    for (const char of text) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(TIMING.MIN_TYPING_DELAY, TIMING.MAX_TYPING_DELAY);
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  }

  /**
   * Click element with delay
   */
  public async clickElement(element: HTMLElement): Promise<void> {
    await this.delay(TIMING.MIN_ACTION_DELAY, TIMING.MAX_ACTION_DELAY);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.delay(200, 500);
    element.click();
  }

  /**
   * Wait for element to appear
   * Uses MutationObserver to avoid setTimeout throttling in background tabs
   */
  public async waitForElement(
    selector: string,
    timeout: number = 10000
  ): Promise<HTMLElement> {
    // First check if element already exists (most common case)
    const existing = document.querySelector(selector) as HTMLElement;
    if (existing) {
      return existing;
    }

    // Use MutationObserver to watch for element appearing
    // MutationObserver is NOT throttled in background tabs
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element not found: ${selector}`));
      }, timeout);

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(element);
        }
      });

      // Observe the entire document for new elements
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  /**
   * Download image from URL as Blob
   */
  private async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return await response.blob();
  }

  /**
   * Upload images to Depop (1-4 images supported)
   */
  public async uploadImages(photoUrls: string[]): Promise<void> {
    if (!photoUrls || photoUrls.length === 0) {
      logger.warn('No photo URLs provided, skipping image upload');
      return;
    }

    logger.info(`Uploading ${photoUrls.length} images to Depop`, photoUrls);

    // Depop allows 1-4 photos
    const photos = photoUrls.slice(0, 4);
    let successCount = 0;

    for (let i = 0; i < photos.length; i++) {
      logger.debug(`Uploading image ${i + 1}/${photos.length}: ${photos[i]}`);

      try {
        // Find the upload input with data-testid="upload-input__input"
        const fileInput = await this.waitForElement('input[data-testid="upload-input__input"]') as HTMLInputElement;
        logger.info('Found file input:', fileInput);

        // Download image from URL
        logger.info(`Downloading image from: ${photos[i]}`);
        const imageBlob = await this.downloadImage(photos[i]);
        logger.info(`Downloaded blob: size=${imageBlob.size}, type=${imageBlob.type}`);

        // Create File object
        const fileName = `image-${i + 1}.jpg`;
        const file = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' });
        logger.info(`Created file: name=${file.name}, size=${file.size}, type=${file.type}`);

        // Create DataTransfer to set files
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        logger.info(`DataTransfer files: ${dataTransfer.files.length}`);

        // Set files on input and trigger events
        fileInput.files = dataTransfer.files;

        // Trigger multiple events to ensure Depop's JS picks it up
        const events = ['input', 'change'];
        for (const eventType of events) {
          fileInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        }

        logger.info(`Triggered events for image ${i + 1}, waiting for upload...`);

        // Wait for upload to complete
        await this.delay(2000, 3000);

        successCount++;
        logger.info(`Successfully uploaded image ${i + 1}/${photos.length}`);
      } catch (error) {
        logger.error(`Failed to upload image ${i + 1}:`, error);
        // Continue with remaining images instead of stopping
      }
    }

    if (successCount === 0) {
      throw new Error('Failed to upload any images');
    }

    logger.info(`${successCount}/${photos.length} images uploaded successfully`);
  }

  /**
   * Fill in title field (65 char max for Depop)
   * Note: Title field appears to be optional in Depop, so we skip it
   */
  public async fillTitle(title: string): Promise<void> {
    logger.debug('Skipping title field - Depop uses description only');
    // Depop doesn't have a separate title field, only description
  }

  /**
   * Fill in description field (1000 char max for Depop)
   */
  public async fillDescription(description: string): Promise<void> {
    logger.debug('Filling description');

    // Truncate to 1000 chars if needed
    const truncatedDesc = description.length > 1000 ? description.substring(0, 1000) : description;

    // Find description textarea by ID and name
    const descInput = await this.waitForElement('textarea#description[name="description"]') as HTMLTextAreaElement;
    await this.typeText(descInput, truncatedDesc);
  }

  /**
   * Select category (required in Depop)
   */
  public async selectCategory(category: string | null, subcategory: string | null): Promise<void> {
    logger.debug('Selecting category:', category, 'subcategory:', subcategory);

    try {
      // Click the category input to open dropdown
      const categoryInput = await this.waitForElement('input#group-input[role="combobox"]');
      await this.clickElement(categoryInput);
      await this.delay(1000, 1500);

      // If category is provided, try to select it from the menu
      if (category) {
        // Find category options in the dropdown menu (role="option" inside id="group-menu")
        const categoryOptions = document.querySelectorAll('ul#group-menu li[role="option"]');
        logger.info(`Found ${categoryOptions.length} category options`);

        for (const option of Array.from(categoryOptions)) {
          const optionText = option.textContent?.trim() || '';
          if (optionText.toLowerCase().includes(category.toLowerCase())) {
            logger.info(`Selecting category: ${optionText}`);
            await this.clickElement(option as HTMLElement);
            await this.delay(1000, 1500);
            break;
          }
        }
      } else {
        // Select first category if none specified
        const firstOption = document.querySelector('ul#group-menu li[role="option"]');
        if (firstOption) {
          await this.clickElement(firstOption as HTMLElement);
          await this.delay(1000, 1500);
        }
      }

      // After selecting category, subcategory dropdown appears
      if (subcategory) {
        await this.delay(1000, 1500);

        // Click the subcategory (productType) input to open dropdown
        const subcategoryInput = await this.waitForElement('input#productType-input[role="combobox"]', 5000);
        await this.clickElement(subcategoryInput);
        await this.delay(1000, 1500);

        // Find subcategory options
        const subcategoryOptions = document.querySelectorAll('ul#productType-menu li[role="option"]');
        logger.info(`Found ${subcategoryOptions.length} subcategory options`);

        for (const option of Array.from(subcategoryOptions)) {
          const optionText = option.textContent?.trim() || '';
          if (optionText.toLowerCase().includes(subcategory.toLowerCase())) {
            logger.info(`Selecting subcategory: ${optionText}`);
            await this.clickElement(option as HTMLElement);
            await this.delay(500, 1000);
            break;
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to select category:', error);
      throw error; // Category is required
    }
  }

  /**
   * Fill in brand field (required in Depop)
   */
  public async fillBrand(brand: string | null): Promise<void> {
    logger.debug('Filling brand:', brand);

    try {
      // Click the brand input to open dropdown
      const brandInput = await this.waitForElement('input#brand-input[role="combobox"]') as HTMLInputElement;

      // Type the brand name to filter options
      if (brand) {
        await this.typeText(brandInput, brand);
        await this.delay(500, 1000);

        // Try to select first matching option from dropdown
        const brandOptions = document.querySelectorAll('ul#brand-menu li[role="option"]');
        if (brandOptions.length > 0) {
          logger.info('Selecting first brand option');
          await this.clickElement(brandOptions[0] as HTMLElement);
        }
      } else {
        // If no brand specified, type "No brand" or select a generic option
        await this.typeText(brandInput, 'No brand');
        await this.delay(500, 1000);

        const brandOptions = document.querySelectorAll('ul#brand-menu li[role="option"]');
        if (brandOptions.length > 0) {
          await this.clickElement(brandOptions[0] as HTMLElement);
        }
      }
    } catch (error) {
      logger.warn('Failed to fill brand:', error);
      throw error; // Brand is required in Depop
    }
  }

  /**
   * Select size (optional, appears after category/subcategory is selected)
   */
  public async selectSize(size: string | null): Promise<void> {
    if (!size) {
      logger.debug('No size specified, skipping');
      return;
    }

    logger.debug('Selecting size:', size);

    try {
      // Click the size/variants input to open dropdown
      const sizeInput = await this.waitForElement('input#variants-input[role="combobox"]', 5000);
      await this.clickElement(sizeInput);
      await this.delay(500, 1000);

      // Find size options in the dropdown
      const sizeOptions = document.querySelectorAll('ul#variants-menu li[role="option"]');
      logger.info(`Found ${sizeOptions.length} size options`);

      for (const option of Array.from(sizeOptions)) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes(size.toLowerCase())) {
          logger.info(`Selecting size: ${optionText}`);
          await this.clickElement(option as HTMLElement);
          return;
        }
      }

      // If no match, select first option
      if (sizeOptions.length > 0) {
        logger.warn(`Size "${size}" not found, selecting first option`);
        await this.clickElement(sizeOptions[0] as HTMLElement);
      }
    } catch (error) {
      logger.info('Size field not found or failed to select - skipping (optional)');
    }
  }

  /**
   * Select color (optional, up to 2 colors)
   */
  public async selectColor(color: string | null): Promise<void> {
    if (!color) {
      logger.debug('No color specified, skipping');
      return;
    }

    logger.debug('Selecting color:', color);

    try {
      // Click the color input to open dropdown
      const colorInput = await this.waitForElement('input#colour-input[role="combobox"]', 5000);
      await this.clickElement(colorInput);
      await this.delay(500, 1000);

      // Find color options in the dropdown
      const colorOptions = document.querySelectorAll('ul#colour-menu li[role="option"]');
      logger.info(`Found ${colorOptions.length} color options`);

      for (const option of Array.from(colorOptions)) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes(color.toLowerCase())) {
          logger.info(`Selecting color: ${optionText}`);
          await this.clickElement(option as HTMLElement);
          return;
        }
      }

      // If no match, skip
      logger.warn(`Color "${color}" not found in options`);
    } catch (error) {
      logger.info('Color field not found or failed to select - skipping (optional)');
    }
  }

  /**
   * Select condition (required)
   */
  public async selectCondition(condition: string): Promise<void> {
    logger.debug('Selecting condition:', condition);

    const depopCondition = Depop.CONDITIONS[condition] || Depop.CONDITIONS.good;

    try {
      // Click the condition input to open dropdown
      const conditionInput = await this.waitForElement('input#condition-input[role="combobox"]');
      await this.clickElement(conditionInput);
      await this.delay(500, 1000);

      // Find condition options in the dropdown
      const conditionOptions = document.querySelectorAll('ul#condition-menu li[role="option"]');
      logger.info(`Found ${conditionOptions.length} condition options`);

      for (const option of Array.from(conditionOptions)) {
        const optionText = option.textContent?.trim() || '';

        // Match against the label from our CONDITIONS mapping
        if (optionText.toLowerCase() === depopCondition.label.toLowerCase()) {
          logger.info(`Selecting condition: ${optionText}`);
          await this.clickElement(option as HTMLElement);
          return;
        }
      }

      // If no exact match, try partial match
      for (const option of Array.from(conditionOptions)) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes(depopCondition.label.toLowerCase())) {
          logger.info(`Selecting condition (partial match): ${optionText}`);
          await this.clickElement(option as HTMLElement);
          return;
        }
      }

      // If still no match, select "Used - Good" as default
      for (const option of Array.from(conditionOptions)) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes('good')) {
          logger.warn(`Using default condition: Good`);
          await this.clickElement(option as HTMLElement);
          return;
        }
      }
    } catch (error) {
      logger.warn('Failed to select condition:', error);
      throw error; // Condition is required
    }
  }

  /**
   * Fill in price field (required)
   */
  public async fillPrice(price: number): Promise<void> {
    logger.debug('Filling price:', price);

    try {
      // Find price input by data-testid
      const priceInput = await this.waitForElement('input[data-testid="priceAmount__input"]') as HTMLInputElement;

      // Clear the default "0.00" value and set new price
      priceInput.focus();
      await this.delay(100, 200);

      // Select all and replace
      priceInput.select();
      priceInput.value = price.toFixed(2); // Depop uses decimal format (e.g., "25.00")

      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      priceInput.dispatchEvent(new Event('change', { bubbles: true }));
      await this.delay(300, 500);
      priceInput.blur();

      logger.info('Price set to:', priceInput.value);
    } catch (error) {
      logger.warn('Failed to fill price:', error);
      throw error; // Price is required
    }
  }

  /**
   * Select shipping parcel size (required)
   * Maps weight to Depop's parcel size options
   */
  public async selectShipping(weightLb?: number, weightOz?: number): Promise<void> {
    logger.debug('Selecting shipping parcel size, weight:', weightLb, 'lb', weightOz, 'oz');

    try {
      // Convert weight to total ounces
      const totalOz = (weightLb || 0) * 16 + (weightOz || 0);
      const totalLb = totalOz / 16;

      // Map weight to Depop's parcel size options:
      // - Extra extra small: Under 4oz
      // - Extra small: Under 8oz
      // - Small: Under 12oz
      // - Medium: Under 1lb (16oz)
      // - Large: Under 2lb (32oz)
      // - Extra large: Under 10lb (160oz)

      let parcelSize = 'Medium'; // Default
      if (totalOz < 4) {
        parcelSize = 'Extra extra small';
      } else if (totalOz < 8) {
        parcelSize = 'Extra small';
      } else if (totalOz < 12) {
        parcelSize = 'Small';
      } else if (totalLb < 1) {
        parcelSize = 'Medium';
      } else if (totalLb < 2) {
        parcelSize = 'Large';
      } else {
        parcelSize = 'Extra large';
      }

      logger.info(`Selecting parcel size: ${parcelSize} (${totalLb.toFixed(2)} lb)`);

      // Click the shipping methods input to open dropdown
      const shippingInput = await this.waitForElement('input#shippingMethods-input[role="combobox"]');
      await this.clickElement(shippingInput);
      await this.delay(500, 1000);

      // Find and select the appropriate parcel size option
      const shippingOptions = document.querySelectorAll('ul#shippingMethods-menu li[role="option"]');
      logger.info(`Found ${shippingOptions.length} shipping options`);

      for (const option of Array.from(shippingOptions)) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes(parcelSize.toLowerCase())) {
          logger.info(`Selecting shipping option: ${parcelSize}`);
          await this.clickElement(option as HTMLElement);
          return;
        }
      }

      // If no match, select Medium as default
      for (const option of Array.from(shippingOptions)) {
        const optionText = option.textContent?.toLowerCase() || '';
        if (optionText.includes('medium')) {
          logger.warn('Using default parcel size: Medium');
          await this.clickElement(option as HTMLElement);
          return;
        }
      }
    } catch (error) {
      logger.warn('Failed to select shipping:', error);
      throw error; // Shipping parcel size is required
    }
  }

  /**
   * Submit the listing
   */
  public async submitListing(): Promise<{ platformListingId: string; platformUrl: string }> {
    logger.debug('Submitting listing');

    try {
      // Find the "Post" button (type="submit")
      const submitButton = await this.waitForElement('button[type="submit"]', 10000);

      logger.info('Found Post button, clicking...');
      await this.clickElement(submitButton);

      // Wait for navigation or success
      await this.delay(3000, 5000);

      // Extract listing URL and ID from current page
      const currentUrl = window.location.href;
      logger.info('Current URL after submission:', currentUrl);

      // Depop listing URLs are typically: https://www.depop.com/products/{listing-id}
      const urlMatch = currentUrl.match(/\/products\/([a-zA-Z0-9_-]+)/);
      const platformListingId = urlMatch ? urlMatch[1] : 'success';

      logger.info('Listing submitted successfully:', {
        platformListingId,
        platformUrl: currentUrl,
      });

      return {
        platformListingId,
        platformUrl: currentUrl,
      };
    } catch (error) {
      logger.error('Failed to submit listing:', error);
      throw error;
    }
  }

  /**
   * Create a complete listing
   */
  public async createListing(listingData: ListingData): Promise<ListingResult> {
    try {
      logger.info('Starting Depop listing creation for:', listingData.title);
      logger.info('Listing data received:', JSON.stringify(listingData));
      logger.info('Photo URLs:', listingData.photo_urls);

      // Step 1: Upload images
      await this.uploadImages(listingData.photo_urls);

      // Step 2: Fill in basic fields
      await this.fillTitle(listingData.title);
      await this.fillDescription(listingData.description);

      // Step 3: Select category
      await this.selectCategory(
        listingData.depop_category || listingData.category,
        listingData.depop_subcategory || null
      );

      // Step 4: Fill optional fields
      await this.fillBrand(listingData.brand);
      await this.selectSize(listingData.size);
      await this.selectColor(listingData.color);

      // Step 5: Select condition
      await this.selectCondition(listingData.condition);

      // Step 6: Fill price
      await this.fillPrice(listingData.price);

      // Step 7: Select shipping (parcel size based on weight)
      await this.selectShipping(listingData.weight_lb, listingData.weight_oz);

      // Wait a moment for form to be ready
      logger.info('Waiting for form to be ready for submission...');
      await this.delay(2000, 3000);

      // Step 8: Submit
      const result = await this.submitListing();

      return {
        success: true,
        listingId: listingData.id,
        platform: 'depop',
        platformListingId: result.platformListingId,
        platformUrl: result.platformUrl,
      };
    } catch (error) {
      logger.error('Failed to create Depop listing:', error);

      return {
        success: false,
        listingId: listingData.id,
        platform: 'depop',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Initialize automation instance
const automation = new DepopAutomation();

/**
 * Check if user is logged in to Depop
 * Uses multiple verification methods for accuracy
 */
function isLoggedIn(): boolean {
  console.log('[Depop] Checking login status...');

  // NEGATIVE INDICATORS - if any of these exist, user is NOT logged in
  // Check for login/signup links
  const loginLink = document.querySelector('a[href*="/login"]');
  const signupLink = document.querySelector('a[href*="/signup"]');

  // Check for buttons with login/signup text using textContent
  const buttons = Array.from(document.querySelectorAll('button, a'));
  const hasLoginButton = buttons.some(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('log in') || text.includes('login') || text.includes('sign in');
  });
  const hasSignupButton = buttons.some(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('sign up') || text.includes('signup') || text.includes('register');
  });

  // Check for login form inputs
  const loginForm = document.querySelector('form[action*="login"], input[name="username"], input[name="email"][type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  if (loginLink || signupLink || hasLoginButton || hasSignupButton || (loginForm && passwordInput)) {
    console.log('[Depop] Found login indicators - NOT logged in');
    return false;
  }

  // Check if on login/signup pages
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/login') || path.includes('/signup') || path.includes('/register')) {
    console.log('[Depop] On login page - NOT logged in');
    return false;
  }

  // POSITIVE INDICATORS - authenticated-only elements
  // 1. Check for user menu (most reliable)
  const userMenu = document.querySelector('[data-testid="user-menu"], [class*="UserMenu"], [aria-label*="user menu"]');
  if (userMenu) {
    console.log('[Depop] Found user menu - logged in');
    return true;
  }

  // 2. Check for profile/account link with username in nav
  const profileLink = document.querySelector('nav a[href^="/u/"], header a[href^="/u/"]');
  if (profileLink && profileLink.textContent && profileLink.textContent.trim().length > 0) {
    console.log('[Depop] Found profile link in nav - logged in');
    return true;
  }

  // 3. Check for messages/inbox link (only visible when logged in)
  const messagesLink = document.querySelector('a[href*="/messages"]');
  if (messagesLink) {
    console.log('[Depop] Found messages link - logged in');
    return true;
  }

  // 4. Check for account/settings menu items (authenticated only)
  const accountLink = document.querySelector('a[href*="/settings"], a[href*="/account"]');
  if (accountLink) {
    console.log('[Depop] Found account/settings link - logged in');
    return true;
  }

  console.log('[Depop] No clear indicators - NOT logged in');
  return false;
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  logger.debug('Depop content script received message:', message.type);

  if (message.type === 'CREATE_LISTING') {
    const { listingData } = message.payload;

    automation
      .createListing(listingData)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          listingId: listingData.id,
          platform: 'depop',
          error: error.message,
        });
      });

    return true; // Async response
  }

  if (message.type === 'CHECK_LOGIN') {
    const loggedIn = isLoggedIn();
    logger.info('Depop login status:', loggedIn);
    sendResponse({ loggedIn });
    return true;
  }
});

logger.info('Depop content script loaded');
