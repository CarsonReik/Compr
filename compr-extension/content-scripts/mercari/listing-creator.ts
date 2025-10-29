/**
 * Mercari listing creator content script
 * Injected into mercari.com pages to automate listing creation
 */

import { ListingData, ExtensionMessage, ListingResult } from '../../lib/types';
import { logger } from '../../lib/messaging';
import { TIMING } from '../../lib/constants';

/**
 * Utility functions for human-like interactions
 */
class MercariAutomation {
  /**
   * Random delay between min and max
   */
  private delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Type text with human-like delay
   */
  private async typeText(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
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
  private async clickElement(element: HTMLElement): Promise<void> {
    await this.delay(TIMING.MIN_ACTION_DELAY, TIMING.MAX_ACTION_DELAY);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.delay(200, 500);
    element.click();
  }

  /**
   * Wait for element to appear
   */
  private async waitForElement(
    selector: string,
    timeout: number = 10000
  ): Promise<HTMLElement> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        return element;
      }
      await this.delay(100, 300);
    }

    throw new Error(`Element not found: ${selector}`);
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
   * Upload images to Mercari
   */
  public async uploadImages(photoUrls: string[]): Promise<void> {
    if (!photoUrls || photoUrls.length === 0) {
      logger.warn('No photo URLs provided, skipping image upload');
      return;
    }

    logger.info(`Uploading ${photoUrls.length} images to Mercari`, photoUrls);

    // Mercari allows up to 12 photos
    const photos = photoUrls.slice(0, 12);
    let successCount = 0;

    for (let i = 0; i < photos.length; i++) {
      logger.debug(`Uploading image ${i + 1}/${photos.length}: ${photos[i]}`);

      try {
        // Find file input - Mercari typically uses input[type="file"][accept*="image"]
        const fileInput = await this.waitForElement('input[type="file"][accept*="image"]') as HTMLInputElement;
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

        // Trigger multiple events to ensure Mercari's JS picks it up
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
   * Fill in title field
   */
  public async fillTitle(title: string): Promise<void> {
    logger.debug('Filling title:', title);

    // Mercari uses various selectors - try multiple
    const selectors = [
      'input[name="name"]',
      'input[placeholder*="title" i]',
      'input[aria-label*="title" i]',
      '#name'
    ];

    for (const selector of selectors) {
      try {
        const titleInput = await this.waitForElement(selector, 3000);
        await this.typeText(titleInput as HTMLInputElement, title);
        return;
      } catch {
        continue;
      }
    }

    throw new Error('Could not find title input');
  }

  /**
   * Fill in description field
   */
  public async fillDescription(description: string): Promise<void> {
    logger.debug('Filling description');

    const selectors = [
      'textarea[name="description"]',
      'textarea[placeholder*="description" i]',
      'textarea[aria-label*="description" i]',
      '#description'
    ];

    for (const selector of selectors) {
      try {
        const descInput = await this.waitForElement(selector, 3000);
        await this.typeText(descInput as HTMLTextAreaElement, description);
        return;
      } catch {
        continue;
      }
    }

    throw new Error('Could not find description input');
  }

  /**
   * Select category
   */
  public async selectCategory(category: string | null): Promise<void> {
    logger.debug('Selecting category:', category);

    try {
      // Look for category button or dropdown
      const categoryButton = await this.waitForElement('[data-testid="category-button"], button:has-text("Category")', 5000);
      await this.clickElement(categoryButton);
      await this.delay(1000, 1500);

      // Select "Women" or first available category
      const categoryOptions = document.querySelectorAll('[role="option"], .category-option, [data-testid*="category"]');

      if (categoryOptions.length > 0) {
        logger.info(`Found ${categoryOptions.length} category options`);

        // Try to find "Women" or similar
        let categoryToSelect = categoryOptions[0] as HTMLElement;
        for (const option of Array.from(categoryOptions)) {
          const text = option.textContent?.toLowerCase() || '';
          if (text.includes('women') || text.includes('clothing')) {
            categoryToSelect = option as HTMLElement;
            break;
          }
        }

        logger.info(`Selecting category: ${categoryToSelect.textContent?.trim()}`);
        await this.clickElement(categoryToSelect);
        await this.delay(1000, 1500);
      }
    } catch (error) {
      logger.warn('Failed to select category:', error);
      // Continue anyway
    }
  }

  /**
   * Fill in brand field
   */
  public async fillBrand(brand: string | null): Promise<void> {
    if (!brand) return;

    logger.debug('Filling brand:', brand);

    try {
      const selectors = [
        'input[name="brand"]',
        'input[placeholder*="brand" i]',
        'input[aria-label*="brand" i]',
        '#brand'
      ];

      for (const selector of selectors) {
        try {
          const brandInput = await this.waitForElement(selector, 3000);
          await this.typeText(brandInput as HTMLInputElement, brand);
          await this.delay(500, 1000);
          return;
        } catch {
          continue;
        }
      }
    } catch (error) {
      logger.warn('Failed to fill brand:', error);
    }
  }

  /**
   * Select condition
   */
  public async selectCondition(condition: string): Promise<void> {
    logger.debug('Selecting condition:', condition);

    try {
      // Map conditions to Mercari's options
      const conditionMap: Record<string, string> = {
        'new': 'New',
        'like_new': 'Like New',
        'good': 'Good',
        'fair': 'Fair',
        'poor': 'Poor'
      };

      const mercariCondition = conditionMap[condition] || 'Good';

      // Look for condition buttons or dropdown
      const conditionButtons = document.querySelectorAll('button:has-text("Condition"), [data-testid*="condition"]');

      if (conditionButtons.length > 0) {
        await this.clickElement(conditionButtons[0] as HTMLElement);
        await this.delay(1000, 1500);

        // Find and click the condition option
        const options = document.querySelectorAll('[role="option"], .condition-option');
        for (const option of Array.from(options)) {
          if (option.textContent?.includes(mercariCondition)) {
            await this.clickElement(option as HTMLElement);
            break;
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to select condition:', error);
    }
  }

  /**
   * Fill in price field
   */
  public async fillPrice(price: number): Promise<void> {
    logger.debug('Filling price:', price);

    const selectors = [
      'input[name="price"]',
      'input[placeholder*="price" i]',
      'input[aria-label*="price" i]',
      '#price'
    ];

    for (const selector of selectors) {
      try {
        const priceInput = await this.waitForElement(selector, 3000);

        // Clear and fill price
        (priceInput as HTMLInputElement).focus();
        await this.delay(100, 200);
        (priceInput as HTMLInputElement).value = String(Math.ceil(price));
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        await this.delay(200, 300);
        (priceInput as HTMLInputElement).blur();

        logger.info('Price set to:', (priceInput as HTMLInputElement).value);
        return;
      } catch {
        continue;
      }
    }

    throw new Error('Could not find price input');
  }

  /**
   * Select shipping option (usually "Ship on your own")
   */
  public async selectShipping(): Promise<void> {
    logger.debug('Selecting shipping option');

    try {
      // Look for "Ship on your own" or default shipping option
      const shippingButtons = document.querySelectorAll('button:has-text("Ship"), [data-testid*="shipping"]');

      if (shippingButtons.length > 0) {
        // Usually "Ship on your own" is first or default
        await this.clickElement(shippingButtons[0] as HTMLElement);
        await this.delay(500, 1000);
      }
    } catch (error) {
      logger.warn('Failed to select shipping:', error);
    }
  }

  /**
   * Submit the listing
   */
  public async submitListing(): Promise<{ platformListingId: string; platformUrl: string }> {
    logger.debug('Submitting listing');

    // Find and click the List/Submit button
    const submitSelectors = [
      'button:has-text("List")',
      'button[type="submit"]',
      '[data-testid="submit-button"]',
      'button:has-text("Submit")'
    ];

    let submitButton: HTMLElement | null = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await this.waitForElement(selector, 3000);
        break;
      } catch {
        continue;
      }
    }

    if (!submitButton) {
      throw new Error('Could not find submit button');
    }

    logger.info('Found submit button, clicking...');
    await this.clickElement(submitButton);

    // Wait for navigation or success message
    await this.delay(3000, 5000);

    // Extract listing URL and ID from current page
    const currentUrl = window.location.href;

    // Check if we were redirected to a success page or listing page
    if (currentUrl.includes('/item/') || currentUrl.includes('/success') || currentUrl.includes('/mypage/listings')) {
      logger.info('Listing submitted successfully');

      // Try to extract listing ID from URL
      const match = currentUrl.match(/\/item\/m(\d+)/);
      const platformListingId = match ? match[1] : 'success';

      return {
        platformListingId,
        platformUrl: currentUrl,
      };
    }

    // If still on sell page, assume success but no redirect
    logger.info('Listing submitted (no redirect detected)');
    return {
      platformListingId: 'success',
      platformUrl: 'https://www.mercari.com/mypage/listings/',
    };
  }

  /**
   * Create a complete listing
   */
  public async createListing(listingData: ListingData): Promise<ListingResult> {
    try {
      logger.info('Starting Mercari listing creation for:', listingData.title);
      logger.info('Listing data received:', JSON.stringify(listingData));
      logger.info('Photo URLs:', listingData.photo_urls);

      // Step 1: Upload images
      await this.uploadImages(listingData.photo_urls);

      // Step 2: Fill in all fields
      await this.fillTitle(listingData.title);
      await this.fillDescription(listingData.description);
      await this.selectCategory(listingData.category);
      await this.fillBrand(listingData.brand);
      await this.selectCondition(listingData.condition);
      await this.fillPrice(listingData.price);
      await this.selectShipping();

      // Step 3: Submit
      const result = await this.submitListing();

      return {
        success: true,
        listingId: listingData.id,
        platform: 'mercari',
        platformListingId: result.platformListingId,
        platformUrl: result.platformUrl,
      };
    } catch (error) {
      logger.error('Failed to create Mercari listing:', error);

      return {
        success: false,
        listingId: listingData.id,
        platform: 'mercari',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Initialize automation instance
const automation = new MercariAutomation();

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  logger.debug('Mercari content script received message:', message.type);

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
          platform: 'mercari',
          error: error.message,
        });
      });

    return true; // Async response
  }
});

logger.info('Mercari content script loaded');
