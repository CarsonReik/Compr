/**
 * Mercari Category Mapping System
 * Maps product keywords to Mercari's 3-level category hierarchy
 *
 * Based on Kaggle Mercari Price Suggestion Challenge dataset analysis:
 * - 11 main categories (Tier 1)
 * - 114 subcategories (Tier 2)
 * - 869 sub-subcategories (Tier 3)
 * - 1,287 total unique category paths
 */

export interface MercariCategory {
  tier1: string;
  tier2: string;
  tier3?: string;
}

/**
 * Category mapping based on keywords in title/description
 * Priority: More specific matches first
 * Format: Tier1/Tier2/Tier3
 */
const CATEGORY_MAPPINGS: Array<{
  keywords: string[];
  category: MercariCategory;
}> = [
  // Women's Athletic Apparel (most popular category on Mercari)
  {
    keywords: ['leggings', 'yoga pants', 'tights', 'athletic pants'],
    category: { tier1: 'Women', tier2: 'Athletic Apparel', tier3: 'Pants, Tights, Leggings' }
  },
  {
    keywords: ['athletic shorts', 'running shorts', 'yoga shorts', 'bike shorts'],
    category: { tier1: 'Women', tier2: 'Athletic Apparel', tier3: 'Shorts' }
  },
  {
    keywords: ['sports bra', 'athletic top', 'workout top', 'gym top'],
    category: { tier1: 'Women', tier2: 'Athletic Apparel', tier3: 'Tops' }
  },
  {
    keywords: ['activewear', 'athletic', 'workout', 'gym', 'yoga', 'fitness'],
    category: { tier1: 'Women', tier2: 'Athletic Apparel' }
  },

  // Women's Tops & Blouses
  {
    keywords: ['t-shirt', 'tee', 'tshirt'],
    category: { tier1: 'Women', tier2: 'Tops & Blouses', tier3: 'T-Shirts' }
  },
  {
    keywords: ['tank top', 'cami', 'camisole'],
    category: { tier1: 'Women', tier2: 'Tops & Blouses', tier3: 'Tank, Cami' }
  },
  {
    keywords: ['blouse', 'dress shirt'],
    category: { tier1: 'Women', tier2: 'Tops & Blouses', tier3: 'Blouses' }
  },
  {
    keywords: ['top', 'shirt', 'tunic'],
    category: { tier1: 'Women', tier2: 'Tops & Blouses' }
  },

  // Women's Dresses
  {
    keywords: ['mini dress', 'short dress'],
    category: { tier1: 'Women', tier2: 'Dresses', tier3: 'Mini' }
  },
  {
    keywords: ['midi dress', 'knee length dress'],
    category: { tier1: 'Women', tier2: 'Dresses', tier3: 'Midi' }
  },
  {
    keywords: ['maxi dress', 'long dress', 'floor length'],
    category: { tier1: 'Women', tier2: 'Dresses', tier3: 'Maxi' }
  },
  {
    keywords: ['dress', 'gown', 'sundress'],
    category: { tier1: 'Women', tier2: 'Dresses' }
  },

  // Women's Shoes
  {
    keywords: ['sneakers', 'tennis shoes', 'running shoes', 'trainers', 'athletic shoes'],
    category: { tier1: 'Women', tier2: 'Shoes', tier3: 'Athletic' }
  },
  {
    keywords: ['heels', 'pumps', 'stiletto'],
    category: { tier1: 'Women', tier2: 'Shoes', tier3: 'Heels' }
  },
  {
    keywords: ['boots', 'ankle boots', 'booties'],
    category: { tier1: 'Women', tier2: 'Shoes', tier3: 'Boots' }
  },
  {
    keywords: ['sandals', 'flip flops', 'slides'],
    category: { tier1: 'Women', tier2: 'Shoes', tier3: 'Sandals' }
  },
  {
    keywords: ['flats', 'ballet flats', 'loafers'],
    category: { tier1: 'Women', tier2: 'Shoes', tier3: 'Flats' }
  },

  // Women's Bags & Purses
  {
    keywords: ['crossbody', 'crossbody bag', 'cross body'],
    category: { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Crossbody' }
  },
  {
    keywords: ['shoulder bag', 'hobo bag'],
    category: { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Shoulder Bag' }
  },
  {
    keywords: ['tote', 'tote bag'],
    category: { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Tote' }
  },
  {
    keywords: ['backpack'],
    category: { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Backpack' }
  },
  {
    keywords: ['wallet', 'coin purse', 'wristlet'],
    category: { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Wallet' }
  },
  {
    keywords: ['clutch'],
    category: { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Clutch' }
  },
  {
    keywords: ['handbag', 'purse', 'bag', 'satchel'],
    category: { tier1: 'Women', tier2: 'Bags & Purses' }
  },

  // Women's Jewelry
  {
    keywords: ['necklace', 'pendant', 'chain'],
    category: { tier1: 'Women', tier2: 'Jewelry', tier3: 'Necklaces' }
  },
  {
    keywords: ['earrings', 'studs', 'hoops'],
    category: { tier1: 'Women', tier2: 'Jewelry', tier3: 'Earrings' }
  },
  {
    keywords: ['bracelet', 'bangle'],
    category: { tier1: 'Women', tier2: 'Jewelry', tier3: 'Bracelets' }
  },
  {
    keywords: ['ring', 'band'],
    category: { tier1: 'Women', tier2: 'Jewelry', tier3: 'Rings' }
  },

  // Women's Other Clothing
  {
    keywords: ['jeans'],
    category: { tier1: 'Women', tier2: 'Jeans' }
  },
  {
    keywords: ['pants', 'trousers', 'slacks'],
    category: { tier1: 'Women', tier2: 'Pants' }
  },
  {
    keywords: ['skirt', 'mini skirt', 'pencil skirt'],
    category: { tier1: 'Women', tier2: 'Skirts' }
  },
  {
    keywords: ['shorts'],
    category: { tier1: 'Women', tier2: 'Shorts' }
  },
  {
    keywords: ['jacket', 'coat', 'blazer'],
    category: { tier1: 'Women', tier2: 'Jackets & Coats' }
  },
  {
    keywords: ['sweater', 'cardigan', 'pullover'],
    category: { tier1: 'Women', tier2: 'Sweaters' }
  },
  {
    keywords: ['swimsuit', 'bikini', 'swimwear', 'bathing suit'],
    category: { tier1: 'Women', tier2: 'Swim' }
  },
  {
    keywords: ['lingerie', 'bra', 'underwear', 'panties', 'intimates'],
    category: { tier1: 'Women', tier2: 'Intimates & Sleepwear' }
  },

  // Beauty (2nd largest category)
  {
    keywords: ['foundation', 'concealer', 'powder', 'blush', 'bronzer', 'makeup face'],
    category: { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Face' }
  },
  {
    keywords: ['lipstick', 'lip gloss', 'lip liner', 'lip balm'],
    category: { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Lips' }
  },
  {
    keywords: ['eyeshadow', 'eyeliner', 'mascara', 'eye makeup'],
    category: { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Eyes' }
  },
  {
    keywords: ['nail polish', 'nail', 'manicure'],
    category: { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Nails' }
  },
  {
    keywords: ['makeup', 'cosmetics'],
    category: { tier1: 'Beauty', tier2: 'Makeup' }
  },
  {
    keywords: ['face mask', 'serum', 'moisturizer', 'cleanser', 'toner'],
    category: { tier1: 'Beauty', tier2: 'Skin Care', tier3: 'Treatments & Masks' }
  },
  {
    keywords: ['skincare', 'skin care'],
    category: { tier1: 'Beauty', tier2: 'Skin Care' }
  },
  {
    keywords: ['perfume', 'cologne', 'fragrance', 'eau de'],
    category: { tier1: 'Beauty', tier2: 'Fragrance', tier3: 'Perfume' }
  },
  {
    keywords: ['shampoo', 'conditioner', 'hair treatment'],
    category: { tier1: 'Beauty', tier2: 'Hair Care', tier3: 'Shampoo & Conditioner' }
  },
  {
    keywords: ['hair care', 'hair product'],
    category: { tier1: 'Beauty', tier2: 'Hair Care' }
  },
  {
    keywords: ['bath', 'body wash', 'soap', 'lotion'],
    category: { tier1: 'Beauty', tier2: 'Bath & Body' }
  },

  // Kids
  {
    keywords: ['action figure', 'toy figure'],
    category: { tier1: 'Kids', tier2: 'Toys', tier3: 'Action Figures & Accessories' }
  },
  {
    keywords: ['doll', 'barbie'],
    category: { tier1: 'Kids', tier2: 'Toys', tier3: 'Dolls' }
  },
  {
    keywords: ['lego', 'building blocks', 'construction toy'],
    category: { tier1: 'Kids', tier2: 'Toys', tier3: 'Building Toys' }
  },
  {
    keywords: ['board game', 'puzzle', 'game'],
    category: { tier1: 'Kids', tier2: 'Toys', tier3: 'Games & Puzzles' }
  },
  {
    keywords: ['stuffed animal', 'plush', 'teddy bear'],
    category: { tier1: 'Kids', tier2: 'Toys', tier3: 'Stuffed Animals' }
  },
  {
    keywords: ['toy', 'toys'],
    category: { tier1: 'Kids', tier2: 'Toys' }
  },
  {
    keywords: ['onesie', 'bodysuit', 'baby clothes'],
    category: { tier1: 'Kids', tier2: 'Baby Clothing', tier3: 'Bodysuits' }
  },
  {
    keywords: ['baby', 'infant', 'toddler'],
    category: { tier1: 'Kids', tier2: 'Baby Clothing' }
  },
  {
    keywords: ['kids shirt', 'children shirt', 'boys shirt', 'girls shirt'],
    category: { tier1: 'Kids', tier2: 'Kids Clothing', tier3: 'Tops & T-Shirts' }
  },
  {
    keywords: ['kids', 'child', 'children', 'boy', 'girl'],
    category: { tier1: 'Kids', tier2: 'Kids Clothing' }
  },

  // Electronics
  {
    keywords: ['phone case', 'iphone case', 'android case', 'cell phone case'],
    category: { tier1: 'Electronics', tier2: 'Cell Phones & Accessories', tier3: 'Cases & Covers' }
  },
  {
    keywords: ['unlocked phone', 'smartphone', 'cell phone', 'mobile phone'],
    category: { tier1: 'Electronics', tier2: 'Cell Phones & Accessories', tier3: 'Unlocked Phones' }
  },
  {
    keywords: ['phone', 'iphone', 'android'],
    category: { tier1: 'Electronics', tier2: 'Cell Phones & Accessories' }
  },
  {
    keywords: ['ps5', 'ps4', 'playstation', 'xbox', 'nintendo switch', 'console'],
    category: { tier1: 'Electronics', tier2: 'Video Games & Consoles', tier3: 'Consoles' }
  },
  {
    keywords: ['video game', 'game disc', 'ps5 game', 'xbox game', 'switch game'],
    category: { tier1: 'Electronics', tier2: 'Video Games & Consoles', tier3: 'Games' }
  },
  {
    keywords: ['gaming', 'video game'],
    category: { tier1: 'Electronics', tier2: 'Video Games & Consoles' }
  },
  {
    keywords: ['laptop', 'macbook', 'notebook computer'],
    category: { tier1: 'Electronics', tier2: 'Computers & Tablets', tier3: 'Laptops' }
  },
  {
    keywords: ['tablet', 'ipad'],
    category: { tier1: 'Electronics', tier2: 'Computers & Tablets', tier3: 'Tablets' }
  },
  {
    keywords: ['computer', 'pc'],
    category: { tier1: 'Electronics', tier2: 'Computers & Tablets' }
  },
  {
    keywords: ['headphones', 'earbuds', 'airpods', 'earphones'],
    category: { tier1: 'Electronics', tier2: 'Audio', tier3: 'Headphones' }
  },
  {
    keywords: ['speaker', 'bluetooth speaker'],
    category: { tier1: 'Electronics', tier2: 'Audio', tier3: 'Speakers' }
  },
  {
    keywords: ['camera', 'dslr', 'canon', 'nikon'],
    category: { tier1: 'Electronics', tier2: 'Cameras & Photography' }
  },
  {
    keywords: ['watch', 'smartwatch', 'apple watch', 'fitbit'],
    category: { tier1: 'Electronics', tier2: 'Wearables' }
  },
  {
    keywords: ['electronics', 'electronic'],
    category: { tier1: 'Electronics', tier2: 'Other' }
  },

  // Men's Clothing
  {
    keywords: ['men shirt', 'mens shirt', "men's shirt", 'button down', 'dress shirt'],
    category: { tier1: 'Men', tier2: 'Tops', tier3: 'T-Shirts' }
  },
  {
    keywords: ['men jeans', 'mens jeans', "men's jeans"],
    category: { tier1: 'Men', tier2: 'Bottoms', tier3: 'Jeans' }
  },
  {
    keywords: ['men pants', 'mens pants', "men's pants", 'chinos', 'khakis'],
    category: { tier1: 'Men', tier2: 'Bottoms' }
  },
  {
    keywords: ['men sneakers', 'mens sneakers', "men's sneakers"],
    category: { tier1: 'Men', tier2: 'Shoes', tier3: 'Sneakers' }
  },
  {
    keywords: ['men shoes', 'mens shoes', "men's shoes"],
    category: { tier1: 'Men', tier2: 'Shoes' }
  },
  {
    keywords: ['men shorts', 'mens shorts', "men's shorts"],
    category: { tier1: 'Men', tier2: 'Athletic Apparel', tier3: 'Shorts' }
  },
  {
    keywords: ['men jacket', 'mens jacket', "men's jacket", 'men coat'],
    category: { tier1: 'Men', tier2: 'Jackets & Coats' }
  },
  {
    keywords: ['men watch', 'mens watch', "men's watch"],
    category: { tier1: 'Men', tier2: 'Accessories', tier3: 'Watches' }
  },
  {
    keywords: ['tie', 'necktie', 'bow tie'],
    category: { tier1: 'Men', tier2: 'Accessories', tier3: 'Ties' }
  },
  {
    keywords: ['men', 'mens', "men's", 'male'],
    category: { tier1: 'Men', tier2: 'Other' }
  },

  // Home
  {
    keywords: ['dinnerware', 'plates', 'bowls', 'dishes'],
    category: { tier1: 'Home', tier2: 'Kitchen & Dining', tier3: 'Dinnerware' }
  },
  {
    keywords: ['kitchen storage', 'food storage'],
    category: { tier1: 'Home', tier2: 'Kitchen & Dining', tier3: 'Storage & Organization' }
  },
  {
    keywords: ['kitchen', 'cookware', 'utensils'],
    category: { tier1: 'Home', tier2: 'Kitchen & Dining' }
  },
  {
    keywords: ['sheets', 'bed sheets', 'bedding'],
    category: { tier1: 'Home', tier2: 'Bedding', tier3: 'Sheets' }
  },
  {
    keywords: ['comforter', 'duvet'],
    category: { tier1: 'Home', tier2: 'Bedding' }
  },
  {
    keywords: ['candle', 'candle holder'],
    category: { tier1: 'Home', tier2: 'Home Decor', tier3: 'Candles & Holders' }
  },
  {
    keywords: ['home decor', 'decor', 'pillow', 'throw', 'vase'],
    category: { tier1: 'Home', tier2: 'Home Decor' }
  },
  {
    keywords: ['chair', 'table', 'furniture'],
    category: { tier1: 'Home', tier2: 'Furniture', tier3: 'Chairs' }
  },
  {
    keywords: ['bath', 'bathroom'],
    category: { tier1: 'Home', tier2: 'Bath' }
  },
  {
    keywords: ['home'],
    category: { tier1: 'Home', tier2: 'Other' }
  },

  // Sports & Outdoors
  {
    keywords: ['exercise', 'fitness equipment', 'weights', 'dumbbells'],
    category: { tier1: 'Sports & Outdoors', tier2: 'Exercise & Fitness' }
  },
  {
    keywords: ['camping', 'hiking', 'outdoor gear'],
    category: { tier1: 'Sports & Outdoors', tier2: 'Outdoor Recreation' }
  },
  {
    keywords: ['bicycle', 'bike', 'cycling'],
    category: { tier1: 'Sports & Outdoors', tier2: 'Cycling' }
  },
  {
    keywords: ['sports', 'athletic equipment'],
    category: { tier1: 'Sports & Outdoors', tier2: 'Athletic Equipment' }
  },

  // Vintage & Collectibles
  {
    keywords: ['vintage toy', 'retro toy', 'antique toy'],
    category: { tier1: 'Vintage & Collectibles', tier2: 'Vintage Toys' }
  },
  {
    keywords: ['collectible', 'memorabilia', 'antique'],
    category: { tier1: 'Vintage & Collectibles', tier2: 'Collectibles' }
  },
  {
    keywords: ['vintage', 'retro'],
    category: { tier1: 'Vintage & Collectibles', tier2: 'Other' }
  },

  // Handmade
  {
    keywords: ['handmade jewelry', 'handcrafted jewelry'],
    category: { tier1: 'Handmade', tier2: 'Jewelry' }
  },
  {
    keywords: ['handmade', 'handcrafted', 'diy', 'craft'],
    category: { tier1: 'Handmade', tier2: 'Other' }
  },

  // Office
  {
    keywords: ['office', 'desk', 'supplies', 'stationery'],
    category: { tier1: 'Office', tier2: 'Other' }
  },

  // Pet Supplies
  {
    keywords: ['dog', 'puppy', 'cat', 'kitten', 'pet'],
    category: { tier1: 'Pet Supplies', tier2: 'Other' }
  },
];

/**
 * Determine Mercari category from listing title, description, and category
 */
export function suggestMercariCategory(
  title: string,
  description: string = '',
  category: string = ''
): MercariCategory {
  const searchText = `${title} ${description} ${category}`.toLowerCase();

  // Try to find a matching category based on keywords
  for (const mapping of CATEGORY_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return mapping.category;
      }
    }
  }

  // Default: Women > Other (most common on Mercari)
  return {
    tier1: 'Women',
    tier2: 'Other',
  };
}

/**
 * Format category path for display
 */
export function formatCategoryPath(category: MercariCategory): string {
  const parts = [category.tier1, category.tier2];
  if (category.tier3) {
    parts.push(category.tier3);
  }
  return parts.join('/');
}

/**
 * Parse category path from string format
 */
export function parseCategoryPath(path: string): MercariCategory {
  const parts = path.split('/').map(p => p.trim());
  return {
    tier1: parts[0] || 'Women',
    tier2: parts[1] || 'Other',
    tier3: parts[2],
  };
}

/**
 * Main Mercari categories (Tier 1)
 */
export const MERCARI_MAIN_CATEGORIES = [
  'Women',
  'Beauty',
  'Kids',
  'Electronics',
  'Men',
  'Home',
  'Sports & Outdoors',
  'Vintage & Collectibles',
  'Handmade',
  'Other',
  'Office',
  'Pet Supplies',
] as const;

export type MercariMainCategory = typeof MERCARI_MAIN_CATEGORIES[number];
