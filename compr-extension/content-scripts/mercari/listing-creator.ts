/**
 * Mercari listing creator content script
 * Injected into mercari.com pages to automate listing creation
 */

import { ListingData, ExtensionMessage, ListingResult, Mercari } from '../../lib/types';
import { logger } from '../../lib/messaging';
import { TIMING } from '../../lib/constants';
import { suggestMercariCategory, parseCategoryPath, formatCategoryPath } from '../../lib/mercari-categories';

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

    // Click on the photo upload box to trigger file input
    const uploadBox = await this.waitForElement('[data-testid="PhotoUploadBox"]');
    logger.info('Found photo upload box');

    for (let i = 0; i < photos.length; i++) {
      logger.debug(`Uploading image ${i + 1}/${photos.length}: ${photos[i]}`);

      try {
        // Find the hidden file input
        const fileInput = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;

        if (!fileInput) {
          throw new Error('Could not find file input');
        }

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

    const titleInput = await this.waitForElement('input[data-testid="Title"]') as HTMLInputElement;
    await this.typeText(titleInput, title);
  }

  /**
   * Fill in description field
   */
  public async fillDescription(description: string): Promise<void> {
    logger.debug('Filling description');

    const descInput = await this.waitForElement('textarea[data-testid="Description"]') as HTMLTextAreaElement;
    await this.typeText(descInput, description);
  }

  /**
   * Select category using smart mapping
   */
  public async selectCategory(
    categoryPath: Mercari.Category,
    title: string,
    description: string
  ): Promise<void> {
    logger.info('Selecting Mercari category:', formatCategoryPath(categoryPath));

    try {
      // Click Edit button to open category selector
      const editButton = await this.waitForElement('button.CategorySection__SelectButton-sc-d0fb8a6d-0', 5000);
      await this.clickElement(editButton);
      await this.delay(1000, 1500);

      // TIER 1: Select main category
      const tier1Buttons = document.querySelectorAll('.CategoryDialog__ButtonWrapper-sc-13509435-1');

      if (tier1Buttons.length > 0) {
        logger.info(`Found ${tier1Buttons.length} tier 1 (main) category options`);

        // Try to find matching tier 1 category
        let tier1ToSelect: HTMLElement | null = null;
        for (const button of Array.from(tier1Buttons)) {
          const text = button.textContent?.trim() || '';
          if (text.toLowerCase() === categoryPath.tier1.toLowerCase()) {
            tier1ToSelect = button as HTMLElement;
            break;
          }
        }

        // Fallback: try partial match
        if (!tier1ToSelect) {
          for (const button of Array.from(tier1Buttons)) {
            const text = button.textContent?.toLowerCase() || '';
            if (text.includes(categoryPath.tier1.toLowerCase())) {
              tier1ToSelect = button as HTMLElement;
              break;
            }
          }
        }

        // Last resort: use Women as default
        if (!tier1ToSelect) {
          logger.warn(`Tier 1 category "${categoryPath.tier1}" not found, using Women as default`);
          for (const button of Array.from(tier1Buttons)) {
            const text = button.textContent?.toLowerCase() || '';
            if (text.includes('women')) {
              tier1ToSelect = button as HTMLElement;
              break;
            }
          }
        }

        if (tier1ToSelect) {
          logger.info(`Selecting tier 1: ${tier1ToSelect.textContent?.trim()}`);
          await this.clickElement(tier1ToSelect);
          await this.delay(1500, 2000);
        } else {
          throw new Error('Could not find any tier 1 category');
        }
      }

      // TIER 2: Select subcategory
      const tier2Buttons = document.querySelectorAll('.CategoryDialog__ButtonWrapper-sc-13509435-1');

      if (tier2Buttons.length > 0) {
        logger.info(`Found ${tier2Buttons.length} tier 2 (subcategory) options`);

        // Try to find matching tier 2 category
        let tier2ToSelect: HTMLElement | null = null;
        for (const button of Array.from(tier2Buttons)) {
          const text = button.textContent?.trim() || '';
          if (text.toLowerCase() === categoryPath.tier2.toLowerCase()) {
            tier2ToSelect = button as HTMLElement;
            break;
          }
        }

        // Fallback: try partial match
        if (!tier2ToSelect) {
          for (const button of Array.from(tier2Buttons)) {
            const text = button.textContent?.toLowerCase() || '';
            if (text.includes(categoryPath.tier2.toLowerCase())) {
              tier2ToSelect = button as HTMLElement;
              break;
            }
          }
        }

        // Last resort: use "Other" or last option
        if (!tier2ToSelect) {
          logger.warn(`Tier 2 category "${categoryPath.tier2}" not found, looking for "Other"`);
          for (const button of Array.from(tier2Buttons)) {
            const text = button.textContent?.toLowerCase().trim() || '';
            if (text === 'other') {
              tier2ToSelect = button as HTMLElement;
              break;
            }
          }
          // If no "Other", use last option
          if (!tier2ToSelect) {
            tier2ToSelect = tier2Buttons[tier2Buttons.length - 1] as HTMLElement;
          }
        }

        if (tier2ToSelect) {
          const tier2Text = tier2ToSelect.textContent?.trim();
          logger.info(`Selecting tier 2: ${tier2Text}`);
          await this.clickElement(tier2ToSelect);
          await this.delay(1500, 2000);

          // Special handling: if we selected "Other", there's always "All Other" as tier 3
          const isOtherSelected = tier2Text?.toLowerCase() === 'other';
          if (isOtherSelected && !categoryPath.tier3) {
            // For "Other" subcategory, we need to select "All Other" tier 3
            logger.info('Selected "Other" subcategory, looking for "All Other" tier 3...');
            const tier3Buttons = document.querySelectorAll('.CategoryDialog__ButtonWrapper-sc-13509435-1');

            if (tier3Buttons.length > 0) {
              for (const button of Array.from(tier3Buttons)) {
                const text = button.textContent?.toLowerCase().trim() || '';
                if (text === 'all other') {
                  logger.info('Found "All Other" tier 3, selecting it');
                  await this.clickElement(button as HTMLElement);
                  await this.delay(2000, 3000);
                  logger.info('Category selection completed');
                  return; // Exit early since we're done
                }
              }
            }
          }
        }
      }

      // TIER 3: Select sub-subcategory (if specified)
      if (categoryPath.tier3) {
        const tier3Buttons = document.querySelectorAll('.CategoryDialog__ButtonWrapper-sc-13509435-1');

        if (tier3Buttons.length > 0) {
          logger.info(`Found ${tier3Buttons.length} tier 3 (sub-subcategory) options`);

          // Try to find matching tier 3 category
          let tier3ToSelect: HTMLElement | null = null;
          for (const button of Array.from(tier3Buttons)) {
            const text = button.textContent?.trim() || '';
            if (text.toLowerCase() === categoryPath.tier3.toLowerCase()) {
              tier3ToSelect = button as HTMLElement;
              break;
            }
          }

          // Fallback: try partial match
          if (!tier3ToSelect) {
            for (const button of Array.from(tier3Buttons)) {
              const text = button.textContent?.toLowerCase() || '';
              if (text.includes(categoryPath.tier3.toLowerCase())) {
                tier3ToSelect = button as HTMLElement;
                break;
              }
            }
          }

          // If found, select it
          if (tier3ToSelect) {
            logger.info(`Selecting tier 3: ${tier3ToSelect.textContent?.trim()}`);
            await this.clickElement(tier3ToSelect);
          } else {
            logger.warn(`Tier 3 category "${categoryPath.tier3}" not found, skipping`);
          }
        }
      }

      // Wait for category dialog to close
      await this.delay(2000, 3000);
      logger.info('Category selection completed');
    } catch (error) {
      logger.error('Failed to select category:', error);
      // Continue anyway - listing can proceed with default category
    }
  }

  /**
   * Fill in brand field (required in Mercari)
   */
  public async fillBrand(brand: string | null): Promise<void> {
    logger.debug('Filling brand:', brand);

    try {
      const brandInput = await this.waitForElement('input[data-testid="Brand"]') as HTMLInputElement;

      // If no brand provided, use "No brand / Not sure"
      const brandText = brand && brand.toLowerCase() !== 'n/a' && brand.toLowerCase() !== 'none'
        ? brand
        : 'No brand';

      await this.typeText(brandInput, brandText);
      await this.delay(500, 1000);

      // Wait for autocomplete suggestions
      await this.delay(500, 1000);

      // Try to select first suggestion if available
      const suggestions = document.querySelectorAll('[role="option"]');
      if (suggestions.length > 0) {
        logger.info('Selecting first brand suggestion');
        await this.clickElement(suggestions[0] as HTMLElement);
      }
    } catch (error) {
      logger.warn('Failed to fill brand:', error);
      throw error; // Brand is required, so throw error
    }
  }

  /**
   * Select condition (required)
   */
  public async selectCondition(condition: string): Promise<void> {
    logger.debug('Selecting condition:', condition);

    try {
      // Map conditions to Mercari's options
      const conditionMap: Record<string, string> = {
        'new': 'ConditionNew',
        'like_new': 'ConditionLikeNew',
        'good': 'ConditionGood',
        'fair': 'ConditionFair',
        'poor': 'ConditionPoor'
      };

      const testId = conditionMap[condition] || 'ConditionGood';

      // Find and click the label for the condition
      const conditionLabel = await this.waitForElement(`label[data-testid="${testId}"]`);
      await this.clickElement(conditionLabel);
      await this.delay(500, 1000);

      logger.info(`Selected condition: ${testId}`);
    } catch (error) {
      logger.warn('Failed to select condition:', error);
      throw error; // Condition is required
    }
  }

  /**
   * Select size (optional - not all categories have size field)
   */
  public async selectSize(size: string | null): Promise<void> {
    logger.debug('Checking for size field...');

    try {
      // Try to find size dropdown (appears after category is selected for some categories)
      // Use shorter timeout since it may not exist
      logger.info('Looking for size dropdown...');
      const sizeDropdown = await this.waitForElement('[data-testid="Size"]', 5000);

      logger.info('Size field found! Selecting size...');

      // Scroll into view to ensure it's visible
      sizeDropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.delay(500, 1000);

      logger.info('Clicking size dropdown...');
      await this.clickElement(sizeDropdown);
      await this.delay(1000, 1500);

      // Find size options
      const sizeOptions = document.querySelectorAll('[data-testid="Size-option"]');

      if (sizeOptions.length > 0) {
        logger.info(`Found ${sizeOptions.length} size options`);

        // If no size provided or size is N/A, select "One Size"
        if (!size || size.toLowerCase() === 'n/a' || size.toLowerCase() === 'none') {
          for (const option of Array.from(sizeOptions)) {
            if (option.textContent?.includes('One Size')) {
              await this.clickElement(option as HTMLElement);
              return;
            }
          }
          // If One Size not found, select first option
          await this.clickElement(sizeOptions[0] as HTMLElement);
          return;
        }

        // Try to match the size
        const sizeUpper = size.toUpperCase();
        for (const option of Array.from(sizeOptions)) {
          const optionText = option.textContent || '';

          // Check for exact matches or partial matches
          if (optionText.includes(sizeUpper) ||
              optionText.includes(size) ||
              (sizeUpper.length <= 3 && optionText.startsWith(sizeUpper))) {
            await this.clickElement(option as HTMLElement);
            return;
          }
        }

        // If no match found, select first option
        logger.warn(`Size "${size}" not found, selecting first option`);
        await this.clickElement(sizeOptions[0] as HTMLElement);
      }
    } catch (error) {
      // Size field is not required for all categories (e.g., Electronics)
      logger.info('Size field not found - skipping (not required for this category)');
      // Don't throw error - size is optional depending on category
    }
  }

  /**
   * Fill in price field (required)
   */
  public async fillPrice(price: number, floorPrice?: number): Promise<void> {
    logger.debug('Filling price:', price, 'Floor price:', floorPrice);

    try {
      const priceInput = await this.waitForElement('input[data-testid="Price"]') as HTMLInputElement;

      // Fill price
      priceInput.focus();
      await this.delay(100, 200);
      priceInput.value = String(Math.ceil(price));
      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      priceInput.dispatchEvent(new Event('change', { bubbles: true }));
      await this.delay(300, 500);
      priceInput.blur();

      // Wait for smart pricing UI to appear
      await this.delay(1000, 1500);

      // Handle smart pricing
      if (floorPrice && floorPrice > 0) {
        // Set floor price
        logger.info('Setting floor price for smart pricing:', floorPrice);

        const floorPriceInput = await this.waitForElement('input[data-testid="SmartPricingFloorPrice"]') as HTMLInputElement;
        floorPriceInput.focus();
        await this.delay(100, 200);
        floorPriceInput.value = String(Math.ceil(floorPrice));
        floorPriceInput.dispatchEvent(new Event('input', { bubbles: true }));
        floorPriceInput.dispatchEvent(new Event('change', { bubbles: true }));
        await this.delay(200, 300);
        floorPriceInput.blur();
      } else {
        // Turn off smart pricing
        logger.info('Turning off smart pricing');

        try {
          // Check if smart pricing is ON
          const smartPricingButton = document.querySelector('button[data-testid="SmartPricingButton"][aria-pressed="true"]');

          if (smartPricingButton) {
            // Click to turn it off
            const turnOffButton = await this.waitForElement('button[data-testid="SmartPricingTurnOffButton"]', 3000);
            await this.clickElement(turnOffButton);
            await this.delay(500, 1000);
          }
        } catch (error) {
          logger.warn('Could not turn off smart pricing:', error);
          // Continue anyway
        }
      }

      logger.info('Price set to:', price);
    } catch (error) {
      logger.warn('Failed to fill price:', error);
      throw error; // Price is required
    }
  }

  /**
   * Submit the listing
   */
  public async submitListing(): Promise<{ platformListingId: string; platformUrl: string }> {
    logger.debug('Submitting listing');

    try {
      // Find and click the List button
      const listButton = await this.waitForElement('button[data-testid="ListButton"]');

      logger.info('Found List button, clicking to submit listing...');
      await this.clickElement(listButton);

      // Wait for navigation or success
      await this.delay(3000, 5000);

      // Extract listing URL and ID from current page
      const currentUrl = window.location.href;

      // Check if we were redirected to item page or success page
      if (currentUrl.includes('/item/') || currentUrl.includes('/mypage/listings')) {
        logger.info('Listing submitted successfully');

        // Try to extract listing ID from URL
        const match = currentUrl.match(/\/item\/m(\d+)/);
        const platformListingId = match ? match[1] : 'success';

        return {
          platformListingId,
          platformUrl: currentUrl,
        };
      }

      // If still on sell page, might be an error or success without redirect
      logger.info('Listing submitted (checking for success)');
      return {
        platformListingId: 'success',
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
      logger.info('Starting Mercari listing creation for:', listingData.title);
      logger.info('Listing data received:', JSON.stringify(listingData));
      logger.info('Photo URLs:', listingData.photo_urls);

      // Step 1: Upload images
      await this.uploadImages(listingData.photo_urls);

      // Step 2: Fill in basic fields
      await this.fillTitle(listingData.title);
      await this.fillDescription(listingData.description);

      // Step 3: Smart category selection
      let categoryToUse: Mercari.Category;

      if (listingData.mercari_category) {
        // Use pre-determined Mercari category if available
        logger.info('Using pre-determined Mercari category:', listingData.mercari_category);
        categoryToUse = parseCategoryPath(listingData.mercari_category);
      } else {
        // Auto-detect category from title/description
        logger.info('Auto-detecting Mercari category from listing data');
        categoryToUse = suggestMercariCategory(
          listingData.title,
          listingData.description,
          listingData.category || ''
        );
        logger.info('Suggested category:', formatCategoryPath(categoryToUse));
      }

      await this.selectCategory(categoryToUse, listingData.title, listingData.description);

      // Step 4: Fill remaining fields
      await this.fillBrand(listingData.brand);
      await this.selectCondition(listingData.condition);
      await this.selectSize(listingData.size);

      // Pass floor price if available (original_price can be used as floor)
      const floorPrice = listingData.original_price && listingData.original_price < listingData.price
        ? listingData.original_price
        : undefined;

      await this.fillPrice(listingData.price, floorPrice);

      // Step 5: Submit
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
