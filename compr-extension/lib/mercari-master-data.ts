/**
 * Mercari Master Data Parser
 * Loads and provides lookup functions for Mercari categories, brands, etc.
 */

interface MercariCategory {
  id: number;
  name: string;
  parentId: number;
}

interface MercariBrand {
  id: number;
  name: string;
}

interface MercariMasterData {
  master: {
    itemCategories: MercariCategory[];
    itemBrands: MercariBrand[];
  };
}

// Parse the master data JSON (lazy loaded)
let parsedData: MercariMasterData['master'] | null = null;
let loadingPromise: Promise<MercariMasterData['master']> | null = null;

async function loadMasterData(): Promise<MercariMasterData['master']> {
  if (parsedData) return parsedData;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Dynamically import the JSON file (code splitting)
      const module = await import('../../Mercari-Categories.json');
      const data = module.default as { data: MercariMasterData };
      parsedData = data.data.master;
      return parsedData;
    } catch (error) {
      console.error('Failed to load Mercari master data:', error);
      // Return empty data as fallback
      return {
        itemCategories: [],
        itemBrands: [],
      };
    }
  })();

  return loadingPromise;
}

/**
 * Find Mercari brand ID by brand name (case-insensitive)
 */
export async function findMercariBrandId(brandName: string | null): Promise<number | null> {
  if (!brandName) return null;

  const master = await loadMasterData();
  const normalizedSearch = brandName.toLowerCase().trim();

  // Try exact match first
  const exactMatch = master.itemBrands.find(
    b => b.name.toLowerCase() === normalizedSearch
  );
  if (exactMatch) return exactMatch.id;

  // Try partial match (contains)
  const partialMatch = master.itemBrands.find(
    b => b.name.toLowerCase().includes(normalizedSearch) ||
         normalizedSearch.includes(b.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.id;

  return null;
}

/**
 * Calculate Mercari shipping class ID based on weight
 * Mercari shipping classes based on USPS/UPS weight tiers
 */
export function calculateMercariShippingClass(weightOz: number): number[] {
  // Mercari shipping tiers (approximate based on common patterns)
  // These IDs were observed from the test listing: [2132]

  if (weightOz <= 4) {
    return [2128]; // 4 oz or less - First Class Mail
  } else if (weightOz <= 8) {
    return [2129]; // 5-8 oz - First Class Mail
  } else if (weightOz <= 12) {
    return [2130]; // 9-12 oz - First Class Mail
  } else if (weightOz <= 16) {
    return [2131]; // 13-16 oz (1 lb) - First Class Mail or Priority
  } else if (weightOz <= 32) {
    return [2132]; // 1-2 lbs - Priority Mail
  } else if (weightOz <= 48) {
    return [2133]; // 2-3 lbs - Priority Mail
  } else if (weightOz <= 80) {
    return [2134]; // 3-5 lbs - Priority Mail
  } else if (weightOz <= 160) {
    return [2135]; // 5-10 lbs - Priority Mail or Ground
  } else {
    return [2136]; // 10+ lbs - Ground Shipping
  }
}

/**
 * Get all Mercari brands (for autocomplete/selection UI)
 */
export async function getAllMercariBrands(): Promise<MercariBrand[]> {
  const master = await loadMasterData();
  return master.itemBrands;
}

/**
 * Get all Mercari categories (for selection UI)
 */
export async function getAllMercariCategories(): Promise<MercariCategory[]> {
  const master = await loadMasterData();
  return master.itemCategories;
}

/**
 * Get Mercari category by ID
 */
export async function getMercariCategoryById(id: number): Promise<MercariCategory | null> {
  const master = await loadMasterData();
  return master.itemCategories.find(c => c.id === id) || null;
}

/**
 * Get Mercari category path (for display: "Women > Tops & blouses > T-shirts")
 */
export async function getMercariCategoryPath(categoryId: number): Promise<string> {
  const master = await loadMasterData();
  const path: string[] = [];

  let currentId: number | null = categoryId;

  while (currentId && currentId !== 0) {
    const category = master.itemCategories.find(c => c.id === currentId);
    if (!category) break;

    path.unshift(category.name);
    currentId = category.parentId;
  }

  return path.join(' > ');
}
