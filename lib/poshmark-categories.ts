/**
 * Poshmark Category Mapping System
 * Maps product keywords to Poshmark's 3-level category hierarchy
 */

export interface PoshmarkCategory {
  department: string;
  category: string;
  subcategory?: string;
}

export const POSHMARK_COLORS = [
  'Red',
  'Pink',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'Purple',
  'Gold',
  'Silver',
  'Black',
  'Gray',
  'White',
  'Cream',
  'Brown',
  'Tan',
] as const;

export type PoshmarkColor = typeof POSHMARK_COLORS[number];

/**
 * Category mapping based on keywords in title/description
 * Priority: More specific matches first
 */
const CATEGORY_MAPPINGS: Array<{
  keywords: string[];
  category: PoshmarkCategory;
}> = [
  // Women's Clothing
  { keywords: ['dress', 'dresses', 'gown', 'sundress', 'maxi', 'midi'], category: { department: 'Women', category: 'Dresses' } },
  { keywords: ['shirt', 'blouse', 'top', 'tee', 't-shirt', 'tank', 'cami'], category: { department: 'Women', category: 'Tops' } },
  { keywords: ['jeans', 'pants', 'trousers', 'slacks', 'leggings'], category: { department: 'Women', category: 'Pants' } },
  { keywords: ['skirt', 'mini skirt', 'pencil skirt'], category: { department: 'Women', category: 'Skirts' } },
  { keywords: ['jacket', 'coat', 'blazer', 'cardigan', 'sweater'], category: { department: 'Women', category: 'Jackets & Coats' } },
  { keywords: ['shorts'], category: { department: 'Women', category: 'Shorts' } },
  { keywords: ['swimsuit', 'bikini', 'swimwear', 'bathing suit'], category: { department: 'Women', category: 'Swim' } },
  { keywords: ['activewear', 'yoga', 'athletic', 'sports bra', 'leggings'], category: { department: 'Women', category: 'Athletic Apparel' } },
  { keywords: ['lingerie', 'bra', 'underwear', 'panties'], category: { department: 'Women', category: 'Intimates & Sleepwear' } },

  // Women's Accessories
  { keywords: ['handbag', 'purse', 'clutch', 'tote', 'crossbody', 'satchel', 'hobo bag'], category: { department: 'Women', category: 'Bags', subcategory: 'Crossbody Bags' } },
  { keywords: ['backpack'], category: { department: 'Women', category: 'Bags', subcategory: 'Backpacks' } },
  { keywords: ['wallet', 'coin purse'], category: { department: 'Women', category: 'Bags', subcategory: 'Wallets' } },
  { keywords: ['necklace', 'pendant', 'chain'], category: { department: 'Women', category: 'Jewelry', subcategory: 'Necklaces' } },
  { keywords: ['earrings', 'studs', 'hoops'], category: { department: 'Women', category: 'Jewelry', subcategory: 'Earrings' } },
  { keywords: ['bracelet', 'bangle'], category: { department: 'Women', category: 'Jewelry', subcategory: 'Bracelets' } },
  { keywords: ['ring', 'band'], category: { department: 'Women', category: 'Jewelry', subcategory: 'Rings' } },
  { keywords: ['watch'], category: { department: 'Women', category: 'Accessories', subcategory: 'Watches' } },
  { keywords: ['sunglasses', 'shades'], category: { department: 'Women', category: 'Accessories', subcategory: 'Sunglasses' } },
  { keywords: ['scarf', 'shawl'], category: { department: 'Women', category: 'Accessories', subcategory: 'Scarves & Wraps' } },
  { keywords: ['hat', 'cap', 'beanie'], category: { department: 'Women', category: 'Accessories', subcategory: 'Hats' } },
  { keywords: ['belt'], category: { department: 'Women', category: 'Accessories', subcategory: 'Belts' } },

  // Women's Shoes
  { keywords: ['heels', 'pumps', 'stiletto'], category: { department: 'Women', category: 'Shoes', subcategory: 'Heels' } },
  { keywords: ['boots', 'ankle boots', 'knee boots'], category: { department: 'Women', category: 'Shoes', subcategory: 'Ankle Boots & Booties' } },
  { keywords: ['sneakers', 'tennis shoes', 'running shoes', 'trainers'], category: { department: 'Women', category: 'Shoes', subcategory: 'Sneakers' } },
  { keywords: ['sandals', 'flip flops', 'slides'], category: { department: 'Women', category: 'Shoes', subcategory: 'Sandals' } },
  { keywords: ['flats', 'ballet flats', 'loafers'], category: { department: 'Women', category: 'Shoes', subcategory: 'Flats & Loafers' } },
  { keywords: ['wedges', 'wedge heels'], category: { department: 'Women', category: 'Shoes', subcategory: 'Wedges' } },

  // Men's Clothing
  { keywords: ['men shirt', 'men\'s shirt', 'button down', 'dress shirt', 'polo'], category: { department: 'Men', category: 'Shirts' } },
  { keywords: ['men pants', 'men\'s pants', 'chinos', 'khakis'], category: { department: 'Men', category: 'Pants' } },
  { keywords: ['men jacket', 'men\'s jacket', 'men coat'], category: { department: 'Men', category: 'Jackets & Coats' } },
  { keywords: ['men jeans', 'men\'s jeans'], category: { department: 'Men', category: 'Jeans' } },
  { keywords: ['men shorts', 'men\'s shorts'], category: { department: 'Men', category: 'Shorts' } },
  { keywords: ['men sweater', 'men\'s sweater', 'pullover'], category: { department: 'Men', category: 'Sweaters' } },
  { keywords: ['suit', 'blazer men', 'sport coat'], category: { department: 'Men', category: 'Suits & Blazers' } },

  // Men's Shoes
  { keywords: ['men sneakers', 'men\'s sneakers', 'men shoes'], category: { department: 'Men', category: 'Shoes' } },
  { keywords: ['men boots', 'men\'s boots', 'work boots'], category: { department: 'Men', category: 'Shoes' } },

  // Men's Accessories
  { keywords: ['men watch', 'men\'s watch'], category: { department: 'Men', category: 'Accessories', subcategory: 'Watches' } },
  { keywords: ['men belt', 'men\'s belt'], category: { department: 'Men', category: 'Accessories', subcategory: 'Belts' } },
  { keywords: ['tie', 'necktie', 'bow tie'], category: { department: 'Men', category: 'Accessories', subcategory: 'Ties' } },

  // Kids
  { keywords: ['kids', 'child', 'children', 'toddler', 'baby', 'infant', 'boy', 'girl'], category: { department: 'Kids', category: 'Other' } },

  // Home
  { keywords: ['home decor', 'pillow', 'throw', 'blanket', 'candle', 'vase', 'frame'], category: { department: 'Home', category: 'Home Decor' } },
  { keywords: ['bedding', 'sheets', 'comforter', 'duvet'], category: { department: 'Home', category: 'Bedding' } },
  { keywords: ['kitchen', 'cookware', 'dishes', 'utensils'], category: { department: 'Home', category: 'Kitchen & Dining' } },

  // Pets
  { keywords: ['dog', 'puppy', 'cat', 'kitten', 'pet'], category: { department: 'Pets', category: 'Other' } },

  // Electronics
  { keywords: ['phone', 'laptop', 'tablet', 'electronics', 'headphones', 'speaker', 'camera'], category: { department: 'Electronics', category: 'Other' } },
];

/**
 * Determine Poshmark category from listing title and description
 */
export function suggestPoshmarkCategory(
  title: string,
  description: string = '',
  category: string = ''
): PoshmarkCategory {
  const searchText = `${title} ${description} ${category}`.toLowerCase();

  // Try to find a matching category based on keywords
  for (const mapping of CATEGORY_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return mapping.category;
      }
    }
  }

  // Default: Women > Other (most common on Poshmark)
  return {
    department: 'Women',
    category: 'Other',
  };
}

/**
 * Extract colors from title/description
 * Returns up to 2 colors found in the text
 */
export function extractColors(title: string, description: string = ''): PoshmarkColor[] {
  const text = `${title} ${description}`.toLowerCase();
  const foundColors: PoshmarkColor[] = [];

  for (const color of POSHMARK_COLORS) {
    if (text.includes(color.toLowerCase()) && foundColors.length < 2) {
      foundColors.push(color);
    }
  }

  return foundColors;
}

/**
 * Format category path for display
 */
export function formatCategoryPath(category: PoshmarkCategory): string {
  const parts = [category.department, category.category];
  if (category.subcategory) {
    parts.push(category.subcategory);
  }
  return parts.join(' > ');
}

/**
 * Parse category path from string format
 */
export function parseCategoryPath(path: string): PoshmarkCategory {
  const parts = path.split(' > ').map(p => p.trim());
  return {
    department: parts[0] || 'Women',
    category: parts[1] || 'Other',
    subcategory: parts[2],
  };
}
