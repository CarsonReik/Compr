/**
 * Complete Mercari Category Taxonomy
 * Organized as Tier1 -> Tier2 -> Tier3 hierarchy
 */

export interface MercariCategoryOption {
  tier1: string;
  tier2: string;
  tier3?: string;
  label: string;
  value: string;
}

export const MERCARI_CATEGORIES: MercariCategoryOption[] = [
  // Women
  { tier1: 'Women', tier2: 'Athletic Apparel', tier3: 'Pants, Tights, Leggings', label: 'Women > Athletic Apparel > Pants, Tights, Leggings', value: 'Women/Athletic Apparel/Pants, Tights, Leggings' },
  { tier1: 'Women', tier2: 'Athletic Apparel', tier3: 'Shorts', label: 'Women > Athletic Apparel > Shorts', value: 'Women/Athletic Apparel/Shorts' },
  { tier1: 'Women', tier2: 'Athletic Apparel', tier3: 'Tops', label: 'Women > Athletic Apparel > Tops', value: 'Women/Athletic Apparel/Tops' },
  { tier1: 'Women', tier2: 'Athletic Apparel', label: 'Women > Athletic Apparel', value: 'Women/Athletic Apparel' },

  { tier1: 'Women', tier2: 'Tops & Blouses', tier3: 'T-Shirts', label: 'Women > Tops & Blouses > T-Shirts', value: 'Women/Tops & Blouses/T-Shirts' },
  { tier1: 'Women', tier2: 'Tops & Blouses', tier3: 'Tank, Cami', label: 'Women > Tops & Blouses > Tank, Cami', value: 'Women/Tops & Blouses/Tank, Cami' },
  { tier1: 'Women', tier2: 'Tops & Blouses', tier3: 'Blouses', label: 'Women > Tops & Blouses > Blouses', value: 'Women/Tops & Blouses/Blouses' },
  { tier1: 'Women', tier2: 'Tops & Blouses', label: 'Women > Tops & Blouses', value: 'Women/Tops & Blouses' },

  { tier1: 'Women', tier2: 'Dresses', tier3: 'Mini', label: 'Women > Dresses > Mini', value: 'Women/Dresses/Mini' },
  { tier1: 'Women', tier2: 'Dresses', tier3: 'Midi', label: 'Women > Dresses > Midi', value: 'Women/Dresses/Midi' },
  { tier1: 'Women', tier2: 'Dresses', tier3: 'Maxi', label: 'Women > Dresses > Maxi', value: 'Women/Dresses/Maxi' },
  { tier1: 'Women', tier2: 'Dresses', label: 'Women > Dresses', value: 'Women/Dresses' },

  { tier1: 'Women', tier2: 'Shoes', tier3: 'Athletic', label: 'Women > Shoes > Athletic', value: 'Women/Shoes/Athletic' },
  { tier1: 'Women', tier2: 'Shoes', tier3: 'Heels', label: 'Women > Shoes > Heels', value: 'Women/Shoes/Heels' },
  { tier1: 'Women', tier2: 'Shoes', tier3: 'Boots', label: 'Women > Shoes > Boots', value: 'Women/Shoes/Boots' },
  { tier1: 'Women', tier2: 'Shoes', tier3: 'Sandals', label: 'Women > Shoes > Sandals', value: 'Women/Shoes/Sandals' },
  { tier1: 'Women', tier2: 'Shoes', tier3: 'Flats', label: 'Women > Shoes > Flats', value: 'Women/Shoes/Flats' },
  { tier1: 'Women', tier2: 'Shoes', label: 'Women > Shoes', value: 'Women/Shoes' },

  { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Crossbody', label: 'Women > Bags & Purses > Crossbody', value: 'Women/Bags & Purses/Crossbody' },
  { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Shoulder Bag', label: 'Women > Bags & Purses > Shoulder Bag', value: 'Women/Bags & Purses/Shoulder Bag' },
  { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Tote', label: 'Women > Bags & Purses > Tote', value: 'Women/Bags & Purses/Tote' },
  { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Backpack', label: 'Women > Bags & Purses > Backpack', value: 'Women/Bags & Purses/Backpack' },
  { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Wallet', label: 'Women > Bags & Purses > Wallet', value: 'Women/Bags & Purses/Wallet' },
  { tier1: 'Women', tier2: 'Bags & Purses', tier3: 'Clutch', label: 'Women > Bags & Purses > Clutch', value: 'Women/Bags & Purses/Clutch' },
  { tier1: 'Women', tier2: 'Bags & Purses', label: 'Women > Bags & Purses', value: 'Women/Bags & Purses' },

  { tier1: 'Women', tier2: 'Jewelry', tier3: 'Necklaces', label: 'Women > Jewelry > Necklaces', value: 'Women/Jewelry/Necklaces' },
  { tier1: 'Women', tier2: 'Jewelry', tier3: 'Earrings', label: 'Women > Jewelry > Earrings', value: 'Women/Jewelry/Earrings' },
  { tier1: 'Women', tier2: 'Jewelry', tier3: 'Bracelets', label: 'Women > Jewelry > Bracelets', value: 'Women/Jewelry/Bracelets' },
  { tier1: 'Women', tier2: 'Jewelry', tier3: 'Rings', label: 'Women > Jewelry > Rings', value: 'Women/Jewelry/Rings' },
  { tier1: 'Women', tier2: 'Jewelry', label: 'Women > Jewelry', value: 'Women/Jewelry' },

  { tier1: 'Women', tier2: 'Jeans', label: 'Women > Jeans', value: 'Women/Jeans' },
  { tier1: 'Women', tier2: 'Pants', label: 'Women > Pants', value: 'Women/Pants' },
  { tier1: 'Women', tier2: 'Skirts', label: 'Women > Skirts', value: 'Women/Skirts' },
  { tier1: 'Women', tier2: 'Shorts', label: 'Women > Shorts', value: 'Women/Shorts' },
  { tier1: 'Women', tier2: 'Jackets & Coats', label: 'Women > Jackets & Coats', value: 'Women/Jackets & Coats' },
  { tier1: 'Women', tier2: 'Sweaters', label: 'Women > Sweaters', value: 'Women/Sweaters' },
  { tier1: 'Women', tier2: 'Swim', label: 'Women > Swim', value: 'Women/Swim' },
  { tier1: 'Women', tier2: 'Intimates & Sleepwear', label: 'Women > Intimates & Sleepwear', value: 'Women/Intimates & Sleepwear' },
  { tier1: 'Women', tier2: 'Other', tier3: 'All Other', label: 'Women > Other > All Other', value: 'Women/Other/All Other' },

  // Beauty
  { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Face', label: 'Beauty > Makeup > Face', value: 'Beauty/Makeup/Face' },
  { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Lips', label: 'Beauty > Makeup > Lips', value: 'Beauty/Makeup/Lips' },
  { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Eyes', label: 'Beauty > Makeup > Eyes', value: 'Beauty/Makeup/Eyes' },
  { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Nails', label: 'Beauty > Makeup > Nails', value: 'Beauty/Makeup/Nails' },
  { tier1: 'Beauty', tier2: 'Makeup', label: 'Beauty > Makeup', value: 'Beauty/Makeup' },

  { tier1: 'Beauty', tier2: 'Skin Care', tier3: 'Treatments & Masks', label: 'Beauty > Skin Care > Treatments & Masks', value: 'Beauty/Skin Care/Treatments & Masks' },
  { tier1: 'Beauty', tier2: 'Skin Care', label: 'Beauty > Skin Care', value: 'Beauty/Skin Care' },

  { tier1: 'Beauty', tier2: 'Fragrance', tier3: 'Perfume', label: 'Beauty > Fragrance > Perfume', value: 'Beauty/Fragrance/Perfume' },
  { tier1: 'Beauty', tier2: 'Fragrance', label: 'Beauty > Fragrance', value: 'Beauty/Fragrance' },

  { tier1: 'Beauty', tier2: 'Hair Care', tier3: 'Shampoo & Conditioner', label: 'Beauty > Hair Care > Shampoo & Conditioner', value: 'Beauty/Hair Care/Shampoo & Conditioner' },
  { tier1: 'Beauty', tier2: 'Hair Care', label: 'Beauty > Hair Care', value: 'Beauty/Hair Care' },

  { tier1: 'Beauty', tier2: 'Bath & Body', label: 'Beauty > Bath & Body', value: 'Beauty/Bath & Body' },

  // Kids
  { tier1: 'Kids', tier2: 'Toys', tier3: 'Action Figures & Accessories', label: 'Kids > Toys > Action Figures & Accessories', value: 'Kids/Toys/Action Figures & Accessories' },
  { tier1: 'Kids', tier2: 'Toys', tier3: 'Dolls', label: 'Kids > Toys > Dolls', value: 'Kids/Toys/Dolls' },
  { tier1: 'Kids', tier2: 'Toys', tier3: 'Building Toys', label: 'Kids > Toys > Building Toys', value: 'Kids/Toys/Building Toys' },
  { tier1: 'Kids', tier2: 'Toys', tier3: 'Games & Puzzles', label: 'Kids > Toys > Games & Puzzles', value: 'Kids/Toys/Games & Puzzles' },
  { tier1: 'Kids', tier2: 'Toys', tier3: 'Stuffed Animals', label: 'Kids > Toys > Stuffed Animals', value: 'Kids/Toys/Stuffed Animals' },
  { tier1: 'Kids', tier2: 'Toys', label: 'Kids > Toys', value: 'Kids/Toys' },

  { tier1: 'Kids', tier2: 'Baby Clothing', tier3: 'Bodysuits', label: 'Kids > Baby Clothing > Bodysuits', value: 'Kids/Baby Clothing/Bodysuits' },
  { tier1: 'Kids', tier2: 'Baby Clothing', label: 'Kids > Baby Clothing', value: 'Kids/Baby Clothing' },

  { tier1: 'Kids', tier2: 'Kids Clothing', tier3: 'Tops & T-Shirts', label: 'Kids > Kids Clothing > Tops & T-Shirts', value: 'Kids/Kids Clothing/Tops & T-Shirts' },
  { tier1: 'Kids', tier2: 'Kids Clothing', label: 'Kids > Kids Clothing', value: 'Kids/Kids Clothing' },

  // Electronics
  { tier1: 'Electronics', tier2: 'Cell Phones & Accessories', tier3: 'Cases & Covers', label: 'Electronics > Cell Phones & Accessories > Cases & Covers', value: 'Electronics/Cell Phones & Accessories/Cases & Covers' },
  { tier1: 'Electronics', tier2: 'Cell Phones & Accessories', tier3: 'Unlocked Phones', label: 'Electronics > Cell Phones & Accessories > Unlocked Phones', value: 'Electronics/Cell Phones & Accessories/Unlocked Phones' },
  { tier1: 'Electronics', tier2: 'Cell Phones & Accessories', label: 'Electronics > Cell Phones & Accessories', value: 'Electronics/Cell Phones & Accessories' },

  { tier1: 'Electronics', tier2: 'Video Games & Consoles', tier3: 'Consoles', label: 'Electronics > Video Games & Consoles > Consoles', value: 'Electronics/Video Games & Consoles/Consoles' },
  { tier1: 'Electronics', tier2: 'Video Games & Consoles', tier3: 'Games', label: 'Electronics > Video Games & Consoles > Games', value: 'Electronics/Video Games & Consoles/Games' },
  { tier1: 'Electronics', tier2: 'Video Games & Consoles', label: 'Electronics > Video Games & Consoles', value: 'Electronics/Video Games & Consoles' },

  { tier1: 'Electronics', tier2: 'Computers & Tablets', tier3: 'Laptops', label: 'Electronics > Computers & Tablets > Laptops', value: 'Electronics/Computers & Tablets/Laptops' },
  { tier1: 'Electronics', tier2: 'Computers & Tablets', tier3: 'Tablets', label: 'Electronics > Computers & Tablets > Tablets', value: 'Electronics/Computers & Tablets/Tablets' },
  { tier1: 'Electronics', tier2: 'Computers & Tablets', label: 'Electronics > Computers & Tablets', value: 'Electronics/Computers & Tablets' },

  { tier1: 'Electronics', tier2: 'Audio', tier3: 'Headphones', label: 'Electronics > Audio > Headphones', value: 'Electronics/Audio/Headphones' },
  { tier1: 'Electronics', tier2: 'Audio', tier3: 'Speakers', label: 'Electronics > Audio > Speakers', value: 'Electronics/Audio/Speakers' },
  { tier1: 'Electronics', tier2: 'Audio', label: 'Electronics > Audio', value: 'Electronics/Audio' },

  { tier1: 'Electronics', tier2: 'Cameras & Photography', label: 'Electronics > Cameras & Photography', value: 'Electronics/Cameras & Photography' },
  { tier1: 'Electronics', tier2: 'Wearables', label: 'Electronics > Wearables', value: 'Electronics/Wearables' },
  { tier1: 'Electronics', tier2: 'Other', label: 'Electronics > Other', value: 'Electronics/Other' },

  // Men
  { tier1: 'Men', tier2: 'Tops', tier3: 'T-Shirts', label: 'Men > Tops > T-Shirts', value: 'Men/Tops/T-Shirts' },
  { tier1: 'Men', tier2: 'Tops', label: 'Men > Tops', value: 'Men/Tops' },

  { tier1: 'Men', tier2: 'Bottoms', tier3: 'Jeans', label: 'Men > Bottoms > Jeans', value: 'Men/Bottoms/Jeans' },
  { tier1: 'Men', tier2: 'Bottoms', label: 'Men > Bottoms', value: 'Men/Bottoms' },

  { tier1: 'Men', tier2: 'Shoes', tier3: 'Sneakers', label: 'Men > Shoes > Sneakers', value: 'Men/Shoes/Sneakers' },
  { tier1: 'Men', tier2: 'Shoes', label: 'Men > Shoes', value: 'Men/Shoes' },

  { tier1: 'Men', tier2: 'Athletic Apparel', tier3: 'Shorts', label: 'Men > Athletic Apparel > Shorts', value: 'Men/Athletic Apparel/Shorts' },
  { tier1: 'Men', tier2: 'Athletic Apparel', label: 'Men > Athletic Apparel', value: 'Men/Athletic Apparel' },

  { tier1: 'Men', tier2: 'Jackets & Coats', label: 'Men > Jackets & Coats', value: 'Men/Jackets & Coats' },
  { tier1: 'Men', tier2: 'Accessories', tier3: 'Watches', label: 'Men > Accessories > Watches', value: 'Men/Accessories/Watches' },
  { tier1: 'Men', tier2: 'Accessories', tier3: 'Ties', label: 'Men > Accessories > Ties', value: 'Men/Accessories/Ties' },
  { tier1: 'Men', tier2: 'Accessories', label: 'Men > Accessories', value: 'Men/Accessories' },
  { tier1: 'Men', tier2: 'Other', label: 'Men > Other', value: 'Men/Other' },

  // Home
  { tier1: 'Home', tier2: 'Kitchen & Dining', tier3: 'Dinnerware', label: 'Home > Kitchen & Dining > Dinnerware', value: 'Home/Kitchen & Dining/Dinnerware' },
  { tier1: 'Home', tier2: 'Kitchen & Dining', tier3: 'Storage & Organization', label: 'Home > Kitchen & Dining > Storage & Organization', value: 'Home/Kitchen & Dining/Storage & Organization' },
  { tier1: 'Home', tier2: 'Kitchen & Dining', label: 'Home > Kitchen & Dining', value: 'Home/Kitchen & Dining' },

  { tier1: 'Home', tier2: 'Bedding', tier3: 'Sheets', label: 'Home > Bedding > Sheets', value: 'Home/Bedding/Sheets' },
  { tier1: 'Home', tier2: 'Bedding', label: 'Home > Bedding', value: 'Home/Bedding' },

  { tier1: 'Home', tier2: 'Home Decor', tier3: 'Candles & Holders', label: 'Home > Home Decor > Candles & Holders', value: 'Home/Home Decor/Candles & Holders' },
  { tier1: 'Home', tier2: 'Home Decor', label: 'Home > Home Decor', value: 'Home/Home Decor' },

  { tier1: 'Home', tier2: 'Furniture', tier3: 'Chairs', label: 'Home > Furniture > Chairs', value: 'Home/Furniture/Chairs' },
  { tier1: 'Home', tier2: 'Furniture', label: 'Home > Furniture', value: 'Home/Furniture' },

  { tier1: 'Home', tier2: 'Bath', label: 'Home > Bath', value: 'Home/Bath' },
  { tier1: 'Home', tier2: 'Other', label: 'Home > Other', value: 'Home/Other' },

  // Sports & Outdoors
  { tier1: 'Sports & Outdoors', tier2: 'Exercise & Fitness', label: 'Sports & Outdoors > Exercise & Fitness', value: 'Sports & Outdoors/Exercise & Fitness' },
  { tier1: 'Sports & Outdoors', tier2: 'Outdoor Recreation', label: 'Sports & Outdoors > Outdoor Recreation', value: 'Sports & Outdoors/Outdoor Recreation' },
  { tier1: 'Sports & Outdoors', tier2: 'Cycling', label: 'Sports & Outdoors > Cycling', value: 'Sports & Outdoors/Cycling' },
  { tier1: 'Sports & Outdoors', tier2: 'Athletic Equipment', label: 'Sports & Outdoors > Athletic Equipment', value: 'Sports & Outdoors/Athletic Equipment' },

  // Vintage & Collectibles
  { tier1: 'Vintage & Collectibles', tier2: 'Vintage Toys', label: 'Vintage & Collectibles > Vintage Toys', value: 'Vintage & Collectibles/Vintage Toys' },
  { tier1: 'Vintage & Collectibles', tier2: 'Collectibles', label: 'Vintage & Collectibles > Collectibles', value: 'Vintage & Collectibles/Collectibles' },
  { tier1: 'Vintage & Collectibles', tier2: 'Other', label: 'Vintage & Collectibles > Other', value: 'Vintage & Collectibles/Other' },

  // Handmade
  { tier1: 'Handmade', tier2: 'Jewelry', label: 'Handmade > Jewelry', value: 'Handmade/Jewelry' },
  { tier1: 'Handmade', tier2: 'Other', label: 'Handmade > Other', value: 'Handmade/Other' },

  // Office
  { tier1: 'Office', tier2: 'Other', label: 'Office > Other', value: 'Office/Other' },

  // Pet Supplies
  { tier1: 'Pet Supplies', tier2: 'Other', label: 'Pet Supplies > Other', value: 'Pet Supplies/Other' },
];

/**
 * Get tier1 categories (main categories)
 */
export function getTier1Categories(): string[] {
  return Array.from(new Set(MERCARI_CATEGORIES.map(c => c.tier1)));
}

/**
 * Get tier2 categories for a given tier1
 */
export function getTier2Categories(tier1: string): string[] {
  return Array.from(
    new Set(
      MERCARI_CATEGORIES
        .filter(c => c.tier1 === tier1)
        .map(c => c.tier2)
    )
  );
}

/**
 * Get tier3 categories for a given tier1 and tier2
 */
export function getTier3Categories(tier1: string, tier2: string): string[] {
  return MERCARI_CATEGORIES
    .filter(c => c.tier1 === tier1 && c.tier2 === tier2 && c.tier3)
    .map(c => c.tier3!);
}
