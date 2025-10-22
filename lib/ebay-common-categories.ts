/**
 * Common eBay Categories
 * These are frequently used leaf categories that sellers can choose from
 */

export interface EbayCategory {
  id: string;
  name: string;
  parent?: string;
}

export const COMMON_EBAY_CATEGORIES: EbayCategory[] = [
  // Clothing, Shoes & Accessories
  { id: '15724', name: 'Men\'s Shoes', parent: 'Clothing' },
  { id: '3034', name: 'Women\'s Shoes', parent: 'Clothing' },
  { id: '57989', name: 'Women\'s Clothing', parent: 'Clothing' },
  { id: '1059', name: 'Men\'s Clothing', parent: 'Clothing' },
  { id: '155183', name: 'Kids\' Shoes', parent: 'Clothing' },
  { id: '175521', name: 'Women\'s Handbags', parent: 'Accessories' },
  { id: '4250', name: 'Men\'s Accessories', parent: 'Accessories' },

  // Electronics
  { id: '9355', name: 'Cell Phones & Smartphones', parent: 'Electronics' },
  { id: '175673', name: 'Laptops & Netbooks', parent: 'Electronics' },
  { id: '14992', name: 'Tablets & eReaders', parent: 'Electronics' },
  { id: '48446', name: 'Video Game Consoles', parent: 'Electronics' },
  { id: '15052', name: 'Cameras & Photo', parent: 'Electronics' },
  { id: '293', name: 'Desktop Computers', parent: 'Electronics' },
  { id: '171485', name: 'TVs', parent: 'Electronics' },

  // Collectibles
  { id: '183454', name: 'Trading Cards', parent: 'Collectibles' },
  { id: '246', name: 'Coins', parent: 'Collectibles' },
  { id: '13777', name: 'Sports Memorabilia', parent: 'Collectibles' },
  { id: '1305', name: 'Stamps', parent: 'Collectibles' },

  // Home & Garden
  { id: '20625', name: 'Home Décor', parent: 'Home & Garden' },
  { id: '159912', name: 'Kitchen Tools & Gadgets', parent: 'Home & Garden' },
  { id: '20723', name: 'Furniture', parent: 'Home & Garden' },
  { id: '159911', name: 'Major Appliances', parent: 'Home & Garden' },

  // Toys & Hobbies
  { id: '220', name: 'Action Figures', parent: 'Toys' },
  { id: '182182', name: 'Building Toys', parent: 'Toys' },
  { id: '2622', name: 'Dolls', parent: 'Toys' },
  { id: '19006', name: 'Diecast Vehicles', parent: 'Toys' },

  // Sporting Goods
  { id: '159043', name: 'Fitness Equipment', parent: 'Sports' },
  { id: '159049', name: 'Cycling Equipment', parent: 'Sports' },
  { id: '20799', name: 'Team Sports Equipment', parent: 'Sports' },
  { id: '36266', name: 'Golf Equipment', parent: 'Sports' },

  // Books, Movies & Music
  { id: '267', name: 'Books', parent: 'Media' },
  { id: '11232', name: 'DVDs & Blu-ray', parent: 'Media' },
  { id: '176985', name: 'Video Games', parent: 'Media' },
  { id: '306', name: 'Music CDs', parent: 'Media' },

  // Jewelry & Watches
  { id: '164329', name: 'Fashion Jewelry', parent: 'Jewelry' },
  { id: '281', name: 'Fine Jewelry', parent: 'Jewelry' },
  { id: '31387', name: 'Wristwatches', parent: 'Watches' },

  // Health & Beauty
  { id: '31786', name: 'Makeup', parent: 'Beauty' },
  { id: '26395', name: 'Fragrances', parent: 'Beauty' },
  { id: '11854', name: 'Skin Care', parent: 'Beauty' },
  { id: '33917', name: 'Hair Care', parent: 'Beauty' },

  // Automotive
  { id: '6028', name: 'Car Parts', parent: 'Automotive' },
  { id: '179697', name: 'Motorcycle Parts', parent: 'Automotive' },
  { id: '88433', name: 'Car Electronics', parent: 'Automotive' },

  // Baby
  { id: '171246', name: 'Baby Clothing', parent: 'Baby' },
  { id: '20400', name: 'Baby Gear', parent: 'Baby' },
  { id: '100223', name: 'Baby Toys', parent: 'Baby' },

  // Pet Supplies
  { id: '1281', name: 'Dog Supplies', parent: 'Pets' },
  { id: '1266', name: 'Cat Supplies', parent: 'Pets' },

  // Crafts
  { id: '28146', name: 'Scrapbooking', parent: 'Crafts' },
  { id: '14087', name: 'Sewing', parent: 'Crafts' },
  { id: '183443', name: 'Art Supplies', parent: 'Crafts' },
];

/**
 * Search categories by keyword
 */
export function searchCategories(query: string): EbayCategory[] {
  const lowerQuery = query.toLowerCase();
  return COMMON_EBAY_CATEGORIES.filter(cat =>
    cat.name.toLowerCase().includes(lowerQuery) ||
    cat.parent?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): EbayCategory | undefined {
  return COMMON_EBAY_CATEGORIES.find(cat => cat.id === id);
}
