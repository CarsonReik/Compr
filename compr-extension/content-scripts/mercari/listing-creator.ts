/**
 * Mercari listing creator content script
 * Injected into mercari.com pages to automate listing creation
 */

import { ListingData, ExtensionMessage, ListingResult, Mercari } from '../../lib/types';
import { logger } from '../../lib/messaging';
import { TIMING } from '../../lib/constants';
import { suggestMercariCategory, parseCategoryPath, formatCategoryPath } from '../../lib/mercari-categories';
import { isBackgroundTab, getAdaptiveDelay, essentialDelay } from '../../lib/tab-detection';

/**
 * Utility functions for human-like interactions
 */
class MercariAutomation {
  /**
   * Random delay between min and max (adaptive based on tab visibility)
   * In background tabs: returns immediately to avoid Chrome's 1-second throttling
   * In foreground tabs: uses random delay for human-like behavior
   */
  public delay(min: number, max: number): Promise<void> {
    return getAdaptiveDelay(min, max);
  }

  /**
   * Type text into input/textarea
   * In background tabs: Sets value directly (no character-by-character typing)
   * In foreground tabs: Types character-by-character with human-like delays
   */
  public async typeText(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    element.focus();
    element.value = '';

    if (isBackgroundTab()) {
      // Background tab: set value directly (fast, no throttling)
      element.value = text;

      // Dispatch events to trigger platform's validation/handlers
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      // Optional: tiny delay for event loop processing
      await getAdaptiveDelay(10, 20, true);
    } else {
      // Foreground tab: type character-by-character for human-like behavior
      for (const char of text) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await this.delay(TIMING.MIN_TYPING_DELAY, TIMING.MAX_TYPING_DELAY);
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    element.blur();
  }

  /**
   * Click element with adaptive delays
   * In background tabs: Scrolls and clicks immediately (no delays)
   * In foreground tabs: Uses delays for human-like behavior
   */
  public async clickElement(element: HTMLElement): Promise<void> {
    // Pre-click delay (skipped in background)
    await this.delay(TIMING.MIN_ACTION_DELAY, TIMING.MAX_ACTION_DELAY);

    // Scroll into view (instant in background, smooth in foreground)
    element.scrollIntoView({
      behavior: isBackgroundTab() ? 'auto' : 'smooth',
      block: 'center'
    });

    // Post-scroll delay (skipped in background)
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
   * Check if user is logged in to Mercari
   * @returns true if logged in, false if not
   */
  public async checkLoginStatus(): Promise<boolean> {
    try {
      // Check if we're redirected to login page
      if (window.location.href.includes('/login') || window.location.href.includes('/signup')) {
        logger.error('Redirected to login page - user is not logged in');
        return false;
      }

      // Look for login/signup buttons (only visible when not logged in)
      const loginButton = document.querySelector('a[href*="/login"]');
      const signupButton = document.querySelector('a[href*="/signup"]');

      if (loginButton || signupButton) {
        logger.error('Login/signup buttons found - user is not logged in');
        return false;
      }

      // Look for user menu/profile elements (only visible when logged in)
      // Mercari shows user icon/menu when logged in
      const userMenu = document.querySelector('[data-testid="UserMenu"]') ||
                       document.querySelector('[data-testid="AccountButton"]') ||
                       document.querySelector('button[aria-label*="account" i]') ||
                       document.querySelector('button[aria-label*="profile" i]');

      if (userMenu) {
        logger.info('User menu found - user is logged in');
        return true;
      }

      // If on /sell page and no login prompts, assume logged in
      if (window.location.pathname.includes('/sell')) {
        logger.info('On /sell page without login prompts - assuming logged in');
        return true;
      }

      logger.warn('Could not definitively determine login status - proceeding cautiously');
      return true; // Default to true to avoid blocking legitimate users
    } catch (error) {
      logger.error('Error checking login status:', error);
      return true; // Default to true on error
    }
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

        // Wait for upload to complete (essential - network operation)
        await essentialDelay(2500);

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
   * Select shipping method
   */
  public async selectShipping(
    weightLb: number,
    weightOz: number,
    preferredCarrier?: string,
    preferredType?: string
  ): Promise<void> {
    logger.info('Selecting shipping:', { weightLb, weightOz, preferredCarrier, preferredType });

    try {
      // Click the shipping input to open the shipping dialog
      const shippingInput = await this.waitForElement('input[data-testid="SelectShipping"]');
      logger.info('Found shipping input, clicking to open dialog...');
      await this.clickElement(shippingInput);
      await this.delay(1000, 2000);

      // Fill in weight - pounds
      const poundsInput = await this.waitForElement('input[data-testid="ItemWeightInPounds"]') as HTMLInputElement;
      logger.info('Found pounds input, entering weight:', weightLb);

      // Clear any default value first (Mercari auto-fills with "1")
      poundsInput.value = '';
      poundsInput.focus();
      await this.delay(100, 200);

      await this.typeText(poundsInput, weightLb.toString());
      await this.delay(500, 1000);

      // Fill in weight - ounces
      if (weightOz > 0) {
        const ouncesInput = await this.waitForElement('input[data-testid="ItemWeightInOunces"]') as HTMLInputElement;
        logger.info('Found ounces input, entering weight:', weightOz);
        await this.typeText(ouncesInput, weightOz.toString());
        await this.delay(500, 1000);
      }

      // Handle shoebox question if present
      try {
        const shoeboxContainer = await this.waitForElement('div[data-testid="WillItemFitInShoebox"]', 3000);
        logger.info('Found shoebox question, answering...');

        // For items under 5 lbs, likely fits in shoebox; otherwise select "No"
        const totalWeightLb = weightLb + (weightOz / 16);
        const fitsInShoebox = totalWeightLb <= 5;

        if (fitsInShoebox) {
          const yesButton = await this.waitForElement('input[data-testid="FitsInShoeboxYes"]');
          logger.info('Selecting "Yes" - fits in shoebox');
          await this.clickElement(yesButton);
        } else {
          const noButton = await this.waitForElement('input[data-testid="FitsInShoeboxNo"]');
          logger.info('Selecting "No" - does not fit in shoebox');
          await this.clickElement(noButton);
        }
        await this.delay(500, 1000);
      } catch (error) {
        logger.info('No shoebox question found, continuing...');
      }

      // Click Next button to see carrier options
      const nextButton = await this.waitForElement('button[data-testid="SelectCarrierButton"]');
      logger.info('Clicking Next to view carrier options...');
      await this.clickElement(nextButton);
      await this.delay(2000, 3000);

      // Wait for shipping options to load
      const shippingChoices = await this.waitForElement('div[data-testid="shipping-choices"]');
      logger.info('Shipping options loaded');

      // Find all available shipping options
      const options = shippingChoices.querySelectorAll('div[data-role="shipping-choice"]');
      logger.info(`Found ${options.length} shipping options`);

      if (options.length === 0) {
        throw new Error('No shipping options available');
      }

      let selectedOption: Element | null = null;

      // If user specified preferences, try to find matching option
      if (preferredCarrier && preferredCarrier !== 'cheapest' && preferredType && preferredType !== 'auto') {
        logger.info('Looking for preferred carrier:', preferredCarrier, 'type:', preferredType);

        // Map user preferences to Mercari data attributes
        const carrierMap: Record<string, string> = {
          'usps': 'shippo_usps',
          'ups': 'ups',
          'fedex': 'fedex'
        };

        const typeMap: Record<string, string> = {
          'ground_advantage': 'standard',
          'priority': 'standard',
          'media_mail': 'media_mail',
          'surepost': 'surepost',
          'ground': 'standard',
          'smartpost': 'smartpost',
          'home': 'standard'
        };

        const targetCarrier = carrierMap[preferredCarrier] || preferredCarrier;
        const targetType = typeMap[preferredType] || 'standard';

        for (const option of Array.from(options)) {
          const carrier = option.getAttribute('data-carrier');
          const handlingType = option.getAttribute('data-handling-type');
          const displayName = option.getAttribute('data-display-name') || '';

          if (carrier === targetCarrier && handlingType === targetType) {
            logger.info('Found matching preferred option:', displayName);
            selectedOption = option;
            break;
          }

          // Special case for Priority Mail
          if (preferredType === 'priority' && displayName.includes('Priority Mail')) {
            logger.info('Found Priority Mail option:', displayName);
            selectedOption = option;
            break;
          }
        }
      }

      // If no preference match or set to "cheapest", find the cheapest option
      if (!selectedOption) {
        logger.info('Finding cheapest shipping option...');
        let lowestPrice = Infinity;

        for (const option of Array.from(options)) {
          const priceElement = option.querySelector('h5[color="black"]');
          if (!priceElement) continue;

          const priceText = priceElement.textContent || '';
          const priceMatch = priceText.match(/\$(\d+\.\d+)/);

          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            if (price < lowestPrice) {
              lowestPrice = price;
              selectedOption = option;
            }
          }
        }

        if (selectedOption) {
          const displayName = selectedOption.getAttribute('data-display-name');
          logger.info('Selected cheapest option:', displayName, `($${lowestPrice.toFixed(2)})`);
        }
      }

      if (!selectedOption) {
        // Fallback: select first option
        selectedOption = options[0];
        logger.info('Using fallback: selecting first option');
      }

      // Click the radio button for the selected option
      const radioInput = selectedOption.querySelector('input[type="radio"]') as HTMLInputElement;
      if (radioInput) {
        logger.info('Clicking radio button to select shipping option...');
        await this.clickElement(radioInput);
        await this.delay(1000, 2000);
        logger.info('Shipping option selected');
      } else {
        throw new Error('Could not find radio button for shipping option');
      }

      // Click Save button to confirm shipping selection
      const saveButton = await this.waitForElement('button[data-testid="SelectCarrierSaveButton"]');
      logger.info('Clicking Save to confirm shipping selection...');
      await this.clickElement(saveButton);
      await this.delay(1000, 2000);
      logger.info('Shipping selection saved successfully');

    } catch (error) {
      logger.error('Failed to select shipping:', error);
      throw error; // Shipping is required
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
      // Find the List button
      const listButton = await this.waitForElement('button[data-testid="ListButton"]', 10000);
      logger.info('Found List button');

      // Check if button is disabled
      const isDisabled = (listButton as HTMLButtonElement).disabled;
      logger.info('List button disabled state:', isDisabled);

      // Wait for button to be enabled if it's disabled
      if (isDisabled) {
        logger.info('List button is disabled, waiting for it to be enabled...');
        let attempts = 0;
        while ((listButton as HTMLButtonElement).disabled && attempts < 10) {
          await this.delay(500, 1000);
          attempts++;
        }

        if ((listButton as HTMLButtonElement).disabled) {
          throw new Error('List button remained disabled after waiting');
        }
        logger.info('List button is now enabled');
      }

      // Scroll button into view to ensure it's visible
      listButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.delay(500, 1000);

      logger.info('Clicking List button to submit listing...');

      // Try clicking with retry logic
      let clicked = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          logger.info(`Click attempt ${attempt}/3`);
          await this.clickElement(listButton);
          clicked = true;
          logger.info('Successfully clicked List button');
          break;
        } catch (clickError) {
          logger.warn(`Click attempt ${attempt} failed:`, clickError);
          if (attempt < 3) {
            await this.delay(1000, 2000);
          }
        }
      }

      if (!clicked) {
        throw new Error('Failed to click List button after 3 attempts');
      }

      // Wait for navigation or success (essential - page navigation takes time)
      logger.info('Waiting for page navigation after submission...');
      await essentialDelay(4000);

      // Extract listing URL and ID from current page
      const currentUrl = window.location.href;
      logger.info('Current URL after submission:', currentUrl);

      // Check if we were redirected to item page or success page
      if (currentUrl.includes('/item/') || currentUrl.includes('/mypage/listings')) {
        logger.info('Listing submitted successfully - redirected to success page');

        // Try to extract listing ID from URL
        const match = currentUrl.match(/\/item\/m(\d+)/);
        const platformListingId = match ? match[1] : 'success';

        return {
          platformListingId,
          platformUrl: currentUrl,
        };
      }

      // If still on sell page, might be an error or success without redirect
      logger.info('Listing submitted (checking for success - still on sell page)');
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

      // Check login status first
      logger.info('Checking Mercari login status...');
      const isLoggedIn = await this.checkLoginStatus();

      if (!isLoggedIn) {
        throw new Error('Not logged in to Mercari. Please log in at mercari.com and try again.');
      }

      logger.info('Login check passed - proceeding with listing creation');

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

      // Step 5: Select shipping
      const weightLb = listingData.weight_lb || 0;
      const weightOz = listingData.weight_oz || 0;

      if (weightLb === 0 && weightOz === 0) {
        logger.warn('No weight specified, using default 1 lb');
      }

      await this.selectShipping(
        weightLb || 1,  // Default to 1 lb if not specified
        weightOz || 0,
        listingData.mercari_shipping_carrier || 'cheapest',
        listingData.mercari_shipping_type || 'auto'
      );

      // Step 6: Fill price
      // Pass floor price if available (original_price can be used as floor)
      const floorPrice = listingData.original_price && listingData.original_price < listingData.price
        ? listingData.original_price
        : undefined;

      await this.fillPrice(listingData.price, floorPrice);

      // Wait a moment for form to be ready
      logger.info('Waiting for form to be ready for submission...');
      await this.delay(2000, 3000);

      // Step 7: Submit
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
 * Delete a Mercari listing
 * Clicks the delete button and confirms deletion
 */
async function deleteListing(platformListingId: string): Promise<void> {
  logger.info(`[Mercari] Deleting listing ${platformListingId}`);

  try {
    // Wait for page to fully load
    await automation.delay(2000, 3000);

    // Find the delete button
    const deleteButton = await automation.waitForElement('[data-testid="DeleteButton"]', 10000);
    logger.info('[Mercari] Found delete button, clicking...');

    await automation.clickElement(deleteButton);

    // Wait for confirmation modal
    await automation.delay(1000, 2000);

    // Look for confirmation button in modal
    // Mercari might ask "Are you sure?" - look for confirm button
    const confirmButtons = Array.from(document.querySelectorAll('button'));
    const confirmButton = confirmButtons.find(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('delete') || text.includes('confirm') || text.includes('yes');
    });

    if (confirmButton) {
      logger.info('[Mercari] Found confirmation button, clicking...');
      await automation.clickElement(confirmButton as HTMLElement);
      await automation.delay(2000, 3000);
    }

    logger.info('[Mercari] Listing deleted successfully');
  } catch (error) {
    logger.error('[Mercari] Failed to delete listing:', error);
    throw new Error(`Failed to delete listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user is logged in to Mercari
 * Uses multiple verification methods for accuracy
 */
function isLoggedIn(): boolean {
  console.log('[Mercari] Checking login status...');

  // First check: Are we on a login/signup page? (strong negative indicator)
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/login') || path.includes('/signup') || path.includes('/register')) {
    console.log('[Mercari] On login page - NOT logged in');
    return false;
  }

  // CRITICAL: Check for login button FIRST (strongest negative indicator)
  const loginButton = document.querySelector('[data-testid="LoginButton"]');
  if (loginButton) {
    console.log('[Mercari] Found login button - NOT logged in');
    return false;
  }

  // POSITIVE INDICATORS - Check these after confirming no login button
  // 1. Check for logout button (strongest positive indicator - only visible when logged in)
  const logoutButton = document.querySelector('[data-testid="LogoutMenuItem"]');
  if (logoutButton) {
    console.log('[Mercari] Found logout button - logged in');
    return true;
  }

  // 2. Check for authenticated-only paths
  if (path.includes('/mypage') || path.includes('/dashboard')) {
    console.log('[Mercari] On authenticated path - logged in');
    return true;
  }

  // 3. Check for mypage link (only visible when logged in)
  const mypageLink = document.querySelector('a[href*="/mypage/"]');
  if (mypageLink) {
    console.log('[Mercari] Found mypage link - logged in');
    return true;
  }

  // 4. Check for seller dashboard link (authenticated sellers only)
  const sellerDashboard = document.querySelector('a[href*="/selling/dashboard"]');
  if (sellerDashboard) {
    console.log('[Mercari] Found seller dashboard link - logged in');
    return true;
  }

  // 5. Check for "My purchases" or "My listings" links (authenticated only)
  const myPurchases = document.querySelector('a[href*="/mypage/purchase"]');
  const myListings = document.querySelector('a[href*="/mypage/listings"]');
  if (myPurchases || myListings) {
    console.log('[Mercari] Found account links - logged in');
    return true;
  }

  // NEGATIVE INDICATORS - Only check these if no positive indicators found
  // Note: Only check in header/nav to avoid false positives from footer links
  const headerLoginLink = document.querySelector('header a[href*="/login"], nav a[href*="/login"], [data-testid="login-button"]');
  const headerSignupLink = document.querySelector('header a[href*="/signup"], nav a[href*="/signup"], [data-testid="signup-button"]');

  // Check for buttons with login/signup text in header/nav only
  const headerButtons = Array.from(document.querySelectorAll('header button, header a, nav button, nav a'));
  const hasLoginButton = headerButtons.some(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('log in') || text.includes('login') || text.includes('sign in');
  });
  const hasSignupButton = headerButtons.some(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('sign up') || text.includes('signup');
  });

  // Check for login form
  const loginForm = document.querySelector('form[action*="login"], input[type="email"][name*="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  if (headerLoginLink || headerSignupLink || hasLoginButton || hasSignupButton || (loginForm && passwordInput)) {
    console.log('[Mercari] Found login indicators in header - NOT logged in');
    return false;
  }

  console.log('[Mercari] No clear indicators - NOT logged in');
  return false;
}

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

  if (message.type === 'CHECK_LOGIN') {
    const loggedIn = isLoggedIn();
    logger.info('Mercari login status:', loggedIn);
    sendResponse({ loggedIn });
    return true;
  }

  if (message.type === 'DELETE_LISTING') {
    const { platformListingId, reason } = message.payload;
    logger.info('Deleting Mercari listing:', platformListingId, 'reason:', reason);

    deleteListing(platformListingId)
      .then(() => {
        sendResponse({ success: true, platformListingId });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          platformListingId,
          error: error.message,
        });
      });

    return true; // Async response
  }
});

logger.info('Mercari content script loaded');
