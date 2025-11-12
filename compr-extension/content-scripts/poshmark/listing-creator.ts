/**
 * Poshmark listing creator content script
 * Injected into poshmark.com pages to automate listing creation
 */

import { ListingData, ExtensionMessage, ListingResult, Poshmark } from '../../lib/types';
import { logger } from '../../lib/messaging';
import { TIMING } from '../../lib/constants';
import { isBackgroundTab, getAdaptiveDelay, essentialDelay } from '../../lib/tab-detection';

/**
 * Utility functions for human-like interactions
 */
class PoshmarkAutomation {
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
   * Check if user is logged in to Poshmark
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
      const userMenu = document.querySelector('[data-et-name="user_menu"]') ||
                       document.querySelector('[data-et-name="profile"]') ||
                       document.querySelector('button[aria-label*="account" i]') ||
                       document.querySelector('.header__user-menu');

      if (userMenu) {
        logger.info('User menu found - user is logged in');
        return true;
      }

      // If on /create-listing page and no login prompts, assume logged in
      if (window.location.pathname.includes('/create-listing')) {
        logger.info('On /create-listing page without login prompts - assuming logged in');
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
   * Upload images to Poshmark
   */
  public async uploadImages(photoUrls: string[]): Promise<void> {
    if (!photoUrls || photoUrls.length === 0) {
      logger.warn('No photo URLs provided, skipping image upload');
      return;
    }

    logger.info(`Uploading ${photoUrls.length} images to Poshmark`, photoUrls);

    // Poshmark allows up to 16 photos
    const photos = photoUrls.slice(0, 16);
    let successCount = 0;

    for (let i = 0; i < photos.length; i++) {
      logger.debug(`Uploading image ${i + 1}/${photos.length}: ${photos[i]}`);

      try {
        // Find file input - Poshmark uses id="img-file-input"
        const fileInput = await this.waitForElement('input#img-file-input[type="file"]') as HTMLInputElement;
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

        // Trigger multiple events to ensure Poshmark's JS picks it up
        const events = ['input', 'change', 'blur'];
        for (const eventType of events) {
          fileInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        }

        logger.info(`Triggered events for image ${i + 1}, waiting for upload...`);

        // Wait for upload to complete (Poshmark needs time to process)
        await this.delay(1500, 2000);

        // After uploading, need to click "Apply" button to confirm
        try {
          const applyButton = await this.waitForElement(
            'button[data-et-name="apply"]',
            5000
          );
          logger.info('Found Apply button, clicking...');
          await this.clickElement(applyButton);
          await this.delay(500, 1000);
        } catch (error) {
          logger.warn('Could not find Apply button:', error);
        }

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

    const titleInput = await this.waitForElement(
      'input[data-vv-name="title"]'
    );

    await this.typeText(titleInput as HTMLInputElement, title);
  }

  /**
   * Fill in description field
   */
  public async fillDescription(description: string): Promise<void> {
    logger.debug('Filling description');

    const descInput = await this.waitForElement(
      'textarea[data-vv-name="description"]'
    );

    await this.typeText(descInput as HTMLTextAreaElement, description);
  }

  /**
   * Select category
   */
  public async selectCategory(category: string | null): Promise<void> {
    logger.debug('Selecting category:', category);

    try {
      // Find all dropdown selectors and look for the one with "Select Category"
      const dropdowns = document.querySelectorAll('.dropdown__selector--select-tag');
      let categorySelector: HTMLElement | null = null;

      for (const dropdown of Array.from(dropdowns)) {
        if (dropdown.textContent?.includes('Select Category')) {
          categorySelector = dropdown as HTMLElement;
          break;
        }
      }

      if (!categorySelector) {
        throw new Error('Category selector not found');
      }

      // Click to open dropdown
      await this.clickElement(categorySelector);

      // Wait for category dropdown to appear and render
      await this.delay(1500, 2000);

      // Select category options - they are <a> tags with class dropdown__menu__item
      const allOptions = document.querySelectorAll('a.dropdown__menu__item');

      logger.info(`Found ${allOptions.length} dropdown items`);

      // Filter out "All Categories" and other non-category items
      const categoryOptions = Array.from(allOptions).filter((opt) => {
        const text = opt.textContent?.toLowerCase().trim() || '';
        const isCategory = text &&
          !text.includes('all categories') &&
          !text.includes('done') &&
          text.length > 2;
        return isCategory;
      });

      if (categoryOptions.length > 0) {
        logger.info(`Found ${categoryOptions.length} category options:`, categoryOptions.map(o => o.textContent?.trim()));

        // Try to find "Women" option, otherwise use first
        let categoryToSelect = categoryOptions[0] as HTMLElement;
        for (const option of categoryOptions) {
          const text = option.textContent?.toLowerCase() || '';
          if (text.includes('women')) {
            categoryToSelect = option as HTMLElement;
            break;
          }
        }

        logger.info(`Selecting department: ${categoryToSelect.textContent?.trim()}`);
        await this.clickElement(categoryToSelect);

        // Wait for level 2 category dropdown to appear (e.g., Accessories, Bags, Dresses, etc.)
        await this.delay(1500, 2000);

        // Select "Other" category which is safe for most items
        const allLevel2Options = document.querySelectorAll('li.dropdown__menu__item, a.dropdown__menu__item');
        const level2Options = Array.from(allLevel2Options).filter((opt) => {
          const text = opt.textContent?.toLowerCase().trim() || '';
          return text && !text.includes('all') && text.length > 2;
        });

        if (level2Options.length > 0) {
          logger.info(`Found ${level2Options.length} level 2 category options`);

          // Try to find "Other" option, otherwise use last one (usually "Other" is last)
          let level2ToSelect = level2Options[level2Options.length - 1] as HTMLElement;
          for (const option of level2Options) {
            const text = option.textContent?.toLowerCase().trim() || '';
            if (text === 'other') {
              level2ToSelect = option as HTMLElement;
              break;
            }
          }

          logger.info(`Selecting level 2 category: ${level2ToSelect.textContent?.trim()}`);
          await this.clickElement(level2ToSelect);

          // Wait for optional level 3 subcategory dropdown
          await this.delay(1000, 1500);

          // If there's a level 3, select first option (this is optional)
          const allLevel3Options = document.querySelectorAll('li.dropdown__menu__item, a.dropdown__menu__item');
          const level3Options = Array.from(allLevel3Options).filter((opt) => {
            const text = opt.textContent?.toLowerCase().trim() || '';
            return text && !text.includes('all') && !text.includes('done') && text.length > 2;
          });

          if (level3Options.length > 0) {
            logger.info(`Found ${level3Options.length} level 3 subcategory options, selecting first one: ${level3Options[0].textContent?.trim()}`);
            await this.clickElement(level3Options[0] as HTMLElement);
          }
        }
      } else {
        logger.warn('No category options found in dropdown');
      }
    } catch (error) {
      logger.warn('Failed to select category:', error);
      // Continue anyway - will try with other fields
    }
  }

  /**
   * Fill in brand field
   */
  public async fillBrand(brand: string | null): Promise<void> {
    if (!brand) return;

    logger.debug('Filling brand:', brand);

    try {
      const brandInput = await this.waitForElement(
        'input[name="brand"], input[placeholder*="Brand"], input[data-test="brand"]'
      );

      await this.typeText(brandInput as HTMLInputElement, brand);

      // Wait for autocomplete suggestions
      await this.delay(500, 1000);

      // Try to select first suggestion if available
      const firstSuggestion = document.querySelector(
        '[data-test="brand-suggestion"]:first-child, .autocomplete-option:first-child'
      ) as HTMLElement;

      if (firstSuggestion) {
        await this.clickElement(firstSuggestion);
      }
    } catch (error) {
      logger.warn('Failed to fill brand:', error);
    }
  }

  /**
   * Fill in size field (supports both button and dropdown styles)
   */
  public async fillSize(size: string | null): Promise<void> {
    logger.debug('Filling size:', size);

    try {
      // First, try button-based size selector (for standard sizes like XS, S, M, L, XL)
      if (size) {
        try {
          const sizeButton = await this.waitForElement(`button#size-${size}`, 3000);
          logger.info(`Found size button for "${size}", clicking...`);
          await this.clickElement(sizeButton);
          await this.delay(500, 700);
          logger.info(`Size "${size}" selected via button`);
          return;
        } catch {
          logger.debug(`No button found for size "${size}", trying dropdown...`);
        }
      }

      // Fall back to dropdown-based selector
      const sizeSelector = await this.waitForElement('[data-test="size"]');

      // Click to open dropdown
      await this.clickElement(sizeSelector);

      // Wait for dropdown to open
      await this.delay(500, 1000);

      if (size) {
        // Try to find and select the size option
        const sizeOptions = document.querySelectorAll('[data-test="size-option"], .dropdown__menu .dropdown__menu-item');

        for (const option of Array.from(sizeOptions)) {
          if (option.textContent?.toLowerCase().includes(size.toLowerCase())) {
            await this.clickElement(option as HTMLElement);
            return;
          }
        }

        // If no match found, just select first option
        logger.warn(`Size "${size}" not found, selecting first option`);
        const firstOption = sizeOptions[0] as HTMLElement;
        if (firstOption) {
          await this.clickElement(firstOption);
        }
      } else {
        // If no size provided, select first option (One Size, etc)
        const firstOption = document.querySelector('[data-test="size-option"], .dropdown__menu .dropdown__menu-item:first-child') as HTMLElement;
        if (firstOption) {
          await this.clickElement(firstOption);
        }
      }
    } catch (error) {
      logger.warn('Failed to fill size:', error);
    }
  }

  /**
   * Select colors (up to 2) for Poshmark
   */
  public async selectColors(colors: string[]): Promise<void> {
    if (!colors || colors.length === 0) {
      logger.debug('No colors provided, skipping color selection');
      return;
    }

    logger.info(`Selecting ${colors.length} color(s):`, colors);

    try {
      // Click color dropdown to open it
      const colorDropdown = await this.waitForElement('[data-et-name="color"]', 5000);
      logger.debug('Found color dropdown, clicking...');
      await this.clickElement(colorDropdown);
      await this.delay(1000, 1500);

      // Select up to 2 colors
      const colorsToSelect = colors.slice(0, 2);
      let selectedCount = 0;

      for (const color of colorsToSelect) {
        try {
          // Find all color tiles
          const colorTiles = document.querySelectorAll('.listing-editor__tile--color');
          logger.debug(`Looking for color "${color}" among ${colorTiles.length} tiles`);

          // Find the tile with matching color name
          for (const tile of Array.from(colorTiles)) {
            const colorName = tile.querySelector('span')?.textContent?.trim();
            if (colorName && colorName.toLowerCase() === color.toLowerCase()) {
              // Click the color circle link
              const colorLink = tile.querySelector('a.color__circle--large') as HTMLElement;
              if (colorLink) {
                logger.info(`Clicking color: ${colorName}`);
                await this.clickElement(colorLink);
                await this.delay(500, 700);
                selectedCount++;
                break;
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to select color "${color}":`, error);
        }
      }

      logger.info(`Successfully selected ${selectedCount} color(s)`);
    } catch (error) {
      logger.error('Failed to open color dropdown:', error);
    }
  }

  /**
   * Select condition
   */
  public async selectCondition(condition: string): Promise<void> {
    logger.debug('Selecting condition:', condition);

    const poshmarkCondition = Poshmark.CONDITIONS[condition] || Poshmark.CONDITIONS.good;

    try {
      const conditionSelect = await this.waitForElement(
        'select[name="condition"], [data-test="condition-select"]'
      );

      // Find option by value or label
      const options = Array.from(
        conditionSelect.querySelectorAll('option')
      ) as HTMLOptionElement[];

      const matchingOption = options.find(
        (opt) =>
          opt.value === poshmarkCondition.value ||
          opt.textContent?.includes(poshmarkCondition.label)
      );

      if (matchingOption) {
        (conditionSelect as HTMLSelectElement).value = matchingOption.value;
        conditionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (error) {
      logger.warn('Failed to select condition:', error);
    }
  }

  /**
   * Select New With Tags (NWT) if applicable
   */
  public async selectNewWithTags(isNWT: boolean): Promise<void> {
    if (!isNWT) {
      logger.debug('Item is not NWT, skipping');
      return;
    }

    logger.info('Selecting New With Tags (NWT)');

    try {
      const nwtButton = await this.waitForElement('button[data-et-name="nwt_yes"]', 5000);
      logger.debug('Found NWT button, clicking...');
      await this.clickElement(nwtButton);
      await this.delay(500, 700);
      logger.info('NWT selected successfully');
    } catch (error) {
      logger.warn('Failed to select NWT:', error);
    }
  }

  /**
   * Set multi-item quantity (after size is selected)
   */
  public async setQuantity(quantity: number, size: string): Promise<void> {
    if (quantity <= 1) {
      logger.debug('Quantity is 1, skipping multi-item setup');
      return;
    }

    logger.info(`Setting multi-item quantity: ${quantity}`);

    try {
      // Click Multi Item button
      const multiItemButton = await this.waitForElement('button[data-et-name="multiple"]', 5000);
      logger.debug('Found Multi Item button, clicking...');
      await this.clickElement(multiItemButton);
      await this.delay(1000, 1500);

      // Fill quantity input
      const quantityInput = await this.waitForElement(
        'input[data-vv-name="quantityAvailable0"]',
        5000
      ) as HTMLInputElement;

      quantityInput.value = String(quantity);
      quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
      quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
      await this.delay(300, 500);

      logger.info(`Quantity set to: ${quantity}`);
    } catch (error) {
      logger.warn('Failed to set quantity:', error);
    }
  }

  /**
   * Fill in original/retail price field (required by Poshmark)
   */
  public async fillOriginalPrice(price: number): Promise<void> {
    logger.debug('Filling original price:', price);

    try {
      const originalPriceInput = await this.waitForElement(
        'input[data-vv-name="originalPrice"]'
      ) as HTMLInputElement;

      // Clear any existing value first
      originalPriceInput.focus();
      await this.delay(100, 200);
      originalPriceInput.value = '';
      originalPriceInput.dispatchEvent(new Event('input', { bubbles: true }));
      await this.delay(100, 200);

      // Poshmark requires whole dollar amounts only (no cents)
      const priceString = String(Math.ceil(price));
      originalPriceInput.value = priceString;
      originalPriceInput.dispatchEvent(new Event('input', { bubbles: true }));
      originalPriceInput.dispatchEvent(new Event('change', { bubbles: true }));
      await this.delay(200, 300);
      originalPriceInput.blur();

      await this.delay(200, 300);
      logger.info('Original price set to:', originalPriceInput.value);
    } catch (error) {
      logger.warn('Failed to fill original price:', error);
    }
  }

  /**
   * Fill in listing price field (required by Poshmark)
   */
  public async fillPrice(price: number): Promise<void> {
    logger.debug('Filling listing price:', price);

    const priceInput = await this.waitForElement(
      'input[data-vv-name="listingPrice"]'
    ) as HTMLInputElement;

    // Clear any existing value first
    priceInput.focus();
    await this.delay(100, 200);
    priceInput.value = '';
    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    await this.delay(100, 200);

    // Poshmark requires whole dollar amounts only (no cents)
    const priceString = String(Math.ceil(price));
    priceInput.value = priceString;
    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    priceInput.dispatchEvent(new Event('change', { bubbles: true }));
    await this.delay(200, 300);
    priceInput.blur();

    await this.delay(200, 300);
    logger.info('Listing price set to:', priceInput.value);
  }

  /**
   * Submit the listing
   */
  public async submitListing(): Promise<{ platformListingId: string; platformUrl: string }> {
    logger.debug('Submitting listing');

    // Step 1: Click "Next" button to open confirmation modal
    const nextButton = await this.waitForElement(
      'button[data-et-name="next"]'
    );

    logger.info('Found Next button, clicking to open confirmation modal...');
    await this.clickElement(nextButton);
    await this.delay(1500, 2000);

    // Step 2: Click "List This Item" button in the modal
    const listButton = await this.waitForElement(
      'button[data-et-name="list"]'
    );

    logger.info('Found List This Item button, clicking to submit listing...');
    await this.clickElement(listButton);

    // Wait for navigation (Poshmark redirects to /feed after successful listing)
    // Essential delay - page navigation takes time
    await essentialDelay(4000);

    // Extract listing URL and ID from current page
    const currentUrl = window.location.href;

    // Check if we were redirected to feed (indicates successful listing)
    if (currentUrl.includes('/feed')) {
      logger.info('Redirected to feed - listing submitted successfully');
      // Since Poshmark doesn't give us the listing URL directly, use a placeholder
      return {
        platformListingId: 'success',
        platformUrl: 'https://poshmark.com/feed',
      };
    }

    // Poshmark listing URLs are typically: https://poshmark.com/listing/{title}-{id}
    const urlParts = currentUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];

    // Extract ID from URL (usually last segment or part after last dash)
    const platformListingId = lastPart.split('-').pop() || lastPart;

    logger.info('Listing submitted successfully:', {
      platformListingId,
      platformUrl: currentUrl,
    });

    return {
      platformListingId,
      platformUrl: currentUrl,
    };
  }

  /**
   * Create a complete listing
   */
  public async createListing(listingData: ListingData): Promise<ListingResult> {
    try {
      logger.info('Starting listing creation for:', listingData.title);
      logger.info('Listing data received:', JSON.stringify(listingData));
      logger.info('Photo URLs:', listingData.photo_urls);

      // Check login status first
      logger.info('Checking Poshmark login status...');
      const isLoggedIn = await this.checkLoginStatus();

      if (!isLoggedIn) {
        throw new Error('Not logged in to Poshmark. Please log in at poshmark.com and try again.');
      }

      logger.info('Login check passed - proceeding with listing creation');

      // Step 1: Upload images
      await this.uploadImages(listingData.photo_urls);

      // Step 2: Fill in all fields
      await this.fillTitle(listingData.title);
      await this.fillDescription(listingData.description);
      await this.selectCategory(listingData.poshmark_category || listingData.category);
      await this.fillBrand(listingData.brand);
      await this.fillSize(listingData.size);

      // NEW: Select colors (up to 2) if provided
      if (listingData.poshmark_color && listingData.poshmark_color.length > 0) {
        await this.selectColors(listingData.poshmark_color);
      }

      await this.selectCondition(listingData.condition);

      // NEW: Select New With Tags if applicable
      if (listingData.poshmark_new_with_tags) {
        await this.selectNewWithTags(true);
      }

      await this.fillOriginalPrice(listingData.original_price || listingData.price); // Use original_price if provided
      await this.fillPrice(listingData.price);

      // NEW: Set quantity if multi-item
      if (listingData.quantity && listingData.quantity > 1) {
        await this.setQuantity(listingData.quantity, listingData.size || '');
      }

      // Step 3: Submit
      const result = await this.submitListing();

      return {
        success: true,
        listingId: listingData.id,
        platform: 'poshmark',
        platformListingId: result.platformListingId,
        platformUrl: result.platformUrl,
      };
    } catch (error) {
      logger.error('Failed to create listing:', error);

      return {
        success: false,
        listingId: listingData.id,
        platform: 'poshmark',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Initialize automation instance
const automation = new PoshmarkAutomation();

/**
 * Check if user is logged in to Poshmark
 * Uses multiple verification methods for accuracy
 */
function isLoggedIn(): boolean {
  console.log('[Poshmark] Checking login status...');

  // NEGATIVE INDICATORS - if any of these exist, user is NOT logged in
  const loginLink = document.querySelector('a[href*="/login"]');
  const signupLink = document.querySelector('a[href*="/signup"]');

  // Check for buttons with login/signup text
  const buttons = Array.from(document.querySelectorAll('button, a'));
  const hasLoginButton = buttons.some(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('log in') || text.includes('login') || text.includes('sign in');
  });
  const hasSignupButton = buttons.some(btn => {
    const text = btn.textContent?.toLowerCase() || '';
    return text.includes('sign up') || text.includes('signup');
  });

  // Check for login form
  const loginForm = document.querySelector('form[action*="login"], input[type="email"][name*="login"]');
  const passwordInput = document.querySelector('input[type="password"]');

  if (loginLink || signupLink || hasLoginButton || hasSignupButton || (loginForm && passwordInput)) {
    console.log('[Poshmark] Found login indicators - NOT logged in');
    return false;
  }

  // Check if on login/signup pages
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/login') || path.includes('/signup')) {
    console.log('[Poshmark] On login page - NOT logged in');
    return false;
  }

  // POSITIVE INDICATORS - authenticated-only elements
  // 1. Check for user menu (most reliable)
  const userMenu = document.querySelector('[data-test="user-menu"], [class*="UserMenu"], [aria-label*="user menu"]');
  if (userMenu) {
    console.log('[Poshmark] Found user menu - logged in');
    return true;
  }

  // 2. Check for authenticated-only paths
  if (path === '/feed' || path.includes('/closet/') || path.includes('/mywallet')) {
    console.log('[Poshmark] On authenticated path - logged in');
    return true;
  }

  // 3. Check for notifications or messages icons (logged-in only)
  const notifications = document.querySelector('[data-test="notifications"], [aria-label*="notification"]');
  if (notifications) {
    console.log('[Poshmark] Found notifications - logged in');
    return true;
  }

  // 4. Check for sell button in header (authenticated users only)
  const sellButton = document.querySelector('[data-test="sell-button"], header a[href="/sell"]');
  if (sellButton && !loginLink) {
    console.log('[Poshmark] Found sell button - logged in');
    return true;
  }

  console.log('[Poshmark] No clear indicators - NOT logged in');
  return false;
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  logger.debug('Content script received message:', message.type);

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
          platform: 'poshmark',
          error: error.message,
        });
      });

    return true; // Async response
  }

  if (message.type === 'CHECK_LOGIN') {
    const loggedIn = isLoggedIn();
    logger.info('Poshmark login status:', loggedIn);
    sendResponse({ loggedIn });
    return true;
  }
});

logger.info('Poshmark content script loaded');
