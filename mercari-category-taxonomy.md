# Mercari Category Taxonomy

## Overview

Mercari uses a **3-tier hierarchical category system** with categories separated by "/" in the format:
```
Tier 1 / Tier 2 / Tier 3
```

Based on the Kaggle Mercari Price Suggestion Challenge dataset (1.4M products), the complete taxonomy structure is:

- **Tier 1 (Main Categories):** 11 unique categories
- **Tier 2 (Subcategories):** 114 unique categories
- **Tier 3 (Sub-subcategories):** 869 unique categories
- **Total Unique Category Paths:** 1,287-1,288 complete combinations

---

## Tier 1: Main Categories (11)

### 1. Women
- **~600,000 products** (~50% of all listings - largest category)
- Most popular category on Mercari
- Includes clothing, accessories, shoes, jewelry, etc.

### 2. Beauty
- Makeup, fragrances, skin care, hair care, bath products
- Second largest category by volume

### 3. Kids
- Baby & Kids items
- Clothing, toys, furniture, gear

### 4. Electronics
- Cell phones, computers, tablets, cameras, headphones, gaming
- Popular for tech enthusiasts

### 5. Men
- Men's clothing, accessories, shoes, jewelry
- Similar structure to Women's category

### 6. Home
- Furniture, kitchen, decor, bedding, storage
- Home goods and appliances

### 7. Sports & Outdoors
- Athletic equipment, outdoor gear, fitness
- Least frequent among main categories

### 8. Vintage & Collectibles
- Antiques, collectibles, memorabilia
- Includes vintage toys and rare items

### 9. Handmade
- Handcrafted items, artisan goods
- Custom and DIY products

### 10. Other
- Items that don't fit standard categories
- Miscellaneous goods

### 11. Office
- Office supplies, desk accessories, stationery

### 12. Pet Supplies
- Pet toys, accessories, food, grooming

---

## Tier 2: Subcategories (114)

The most popular Tier 2 subcategories include:

### Women's Subcategories
- **Athletic Apparel** (~120,000 products - highest tier 2 volume)
- Tops & Blouses
- Dresses
- Pants, Tights, Leggings
- Shoes
- Bags & Purses
- Jewelry
- Jeans
- Pants
- Skirts
- Shorts
- Jackets & Coats
- Sweaters
- Swim
- Intimates & Sleepwear

### Beauty Subcategories
- **Makeup** (very high volume)
- Skin Care
- Fragrance
- Hair Care
- Bath & Body
- Tools & Accessories

### Kids Subcategories
- Toys
- Baby Clothing
- Kids Clothing
- Diapering
- Baby Gear
- Feeding

### Electronics Subcategories
- Cell Phones & Accessories
- Computers & Tablets
- Video Games & Consoles
- Cameras & Photography
- Audio
- Wearables

### Men's Subcategories
- Tops
- Bottoms
- Shoes
- Accessories
- Athletic Apparel
- Jackets & Coats
- Jeans
- Sweaters

### Home Subcategories
- Kitchen & Dining
- Bedding
- Home Decor
- Furniture
- Storage & Organization
- Bath

### Sports & Outdoors Subcategories
- Exercise & Fitness
- Outdoor Recreation
- Athletic Equipment
- Cycling
- Water Sports
- Team Sports

### Vintage & Collectibles Subcategories
- Collectibles
- Antiques
- Vintage Toys
- Memorabilia
- Art

### Handmade Subcategories
- Accessories
- Home & Living
- Jewelry
- Clothing

---

## Tier 3: Sub-subcategories (869)

The most granular level with 869 unique specific product types.

### Most Popular Tier 3 Categories

1. **Women/Athletic Apparel/Pants, Tights, Leggings** - 60,177 products (most popular)
2. **Women/Tops & Blouses/T-Shirts** - 46,380 products
3. **Beauty/Makeup/Face** - 34,335 products
4. **Beauty/Makeup/Lips** - 29,910 products
5. **Women/Athletic Apparel/Shorts**
6. **Women/Jewelry/Necklaces**
7. **Kids/Toys/Action Figures & Accessories**
8. **Electronics/Cell Phones & Accessories/Cases & Covers**

### Example Tier 3 Paths

**Women's Fashion:**
- Women/Athletic Apparel/Pants, Tights, Leggings
- Women/Athletic Apparel/Shorts
- Women/Athletic Apparel/Tops
- Women/Tops & Blouses/T-Shirts
- Women/Tops & Blouses/Tank, Cami
- Women/Tops & Blouses/Blouses
- Women/Dresses/Mini
- Women/Dresses/Midi
- Women/Dresses/Maxi
- Women/Shoes/Athletic
- Women/Shoes/Heels
- Women/Shoes/Boots
- Women/Shoes/Sandals
- Women/Shoes/Flats
- Women/Bags & Purses/Crossbody
- Women/Bags & Purses/Shoulder Bag
- Women/Bags & Purses/Tote
- Women/Bags & Purses/Backpack
- Women/Bags & Purses/Wallet
- Women/Bags & Purses/Clutch
- Women/Jewelry/Necklaces
- Women/Jewelry/Earrings
- Women/Jewelry/Bracelets
- Women/Jewelry/Rings

**Beauty:**
- Beauty/Makeup/Face
- Beauty/Makeup/Lips
- Beauty/Makeup/Eyes
- Beauty/Makeup/Nails
- Beauty/Skin Care/Treatments & Masks
- Beauty/Fragrance/Perfume
- Beauty/Hair Care/Shampoo & Conditioner

**Kids:**
- Kids/Toys/Action Figures & Accessories
- Kids/Toys/Dolls
- Kids/Toys/Building Toys
- Kids/Toys/Games & Puzzles
- Kids/Toys/Stuffed Animals
- Kids/Baby Clothing/Bodysuits
- Kids/Kids Clothing/Tops & T-Shirts

**Electronics:**
- Electronics/Cell Phones & Accessories/Cases & Covers
- Electronics/Cell Phones & Accessories/Unlocked Phones
- Electronics/Video Games & Consoles/Games
- Electronics/Video Games & Consoles/Consoles
- Electronics/Computers & Tablets/Laptops
- Electronics/Computers & Tablets/Tablets
- Electronics/Audio/Headphones
- Electronics/Audio/Speakers

**Men's:**
- Men/Tops/T-Shirts
- Men/Bottoms/Jeans
- Men/Shoes/Sneakers
- Men/Athletic Apparel/Shorts
- Men/Accessories/Watches
- Men/Accessories/Ties

**Home:**
- Home/Kitchen & Dining/Dinnerware
- Home/Kitchen & Dining/Storage & Organization
- Home/Bedding/Sheets
- Home/Home Decor/Candles & Holders
- Home/Furniture/Chairs

---

## Confirmed Category IDs (Numeric)

Categories use numeric IDs in URLs like `/category/{ID}/`:

| ID | Category Name |
|----|---------------|
| 1 | Women |
| 4 | Home |
| 25 | Shoes (general) |
| 39 | Men's Shoes |
| 74 | Sports & Outdoors Footwear |
| 283 | Athletic Shoes |
| 285 | Fashion Sneakers |
| 397 | Athletic Shoes for Men |
| 399 | Fashion Sneakers for Men |
| 703 | Handheld Game Consoles (Japan) |
| 725 | Women's Sports & Outdoors Footwear |
| 797 | Consoles |
| 1802 | Vintage & Antique Toys |
| 2382 | Other Dinnerware |

---

## Additional Context

### US vs Japan Differences

**Mercari Japan Categories:**
- Women's Fashion
- Men's Fashion
- Baby/Kids
- Interior Housing and Accessories
- Books, Music, Games
- Toys, Hobbies and Goods
- Cosmetics, Perfume, Beauty
- Home Appliances, Smartphones, Cameras
- Sports and Leisure
- Handmade
- Tickets
- Anime Goods / Action Figures / Idol Goods / Trading Cards / DVD/CD / K-POP / Pokemon

**US-Specific Categories:**
- Video Games (separate from Toys)
- Handbags (separate from Women)
- Office
- Pet Supplies
- Garden & Outdoor
- Arts & Crafts
- Tools

### 2024 Category Restructuring

- Mercari renewed its category structure in 2024
- Significantly increased the number of item categories
- Now uses LLM-based categorization for over 3 billion items
- Improved category hierarchy and specificity

---

## Implementation Notes

### Category Mapping Strategy

Our implementation in `lib/mercari-categories.ts`:

1. **Keyword-Based Matching:**
   - Searches title, description, and category fields for keywords
   - Most specific matches prioritized (e.g., "leggings" → Women/Athletic Apparel/Pants, Tights, Leggings)
   - Falls back to broader categories when specific not found

2. **Default Fallback:**
   - Default to "Women/Other" (most common category on Mercari)
   - Ensures all listings have valid category

3. **Smart Detection:**
   - Detects gender-specific terms (men's, women's)
   - Recognizes product types (shoes, bags, makeup)
   - Matches brand categories (athletic, beauty, electronics)

### Category Selection in Extension

The Chrome extension (`compr-extension/content-scripts/mercari/listing-creator.ts`) automates category selection by:

1. Calling `suggestMercariCategory()` with listing data
2. Clicking Mercari's category selector button
3. Navigating through tier 1 → tier 2 → tier 3 (if available)
4. Waiting for UI updates between selections
5. Falling back to "Other" subcategories when needed

---

## Data Sources

1. **Kaggle Mercari Price Suggestion Challenge Dataset**
   - 1.4 million product listings
   - 1,287-1,288 unique category paths
   - Category field format: "Tier1/Tier2/Tier3"
   - Source: https://www.kaggle.com/c/mercari-price-suggestion-challenge/data

2. **Mercari Shops API**
   - GraphQL API with `productCategories` query
   - Returns: `id`, `name`, `hasChild`, `parentId`
   - Requires authentication
   - Docs: https://api.mercari-shops.com/docs/

3. **Mercari Website Analysis**
   - URL patterns: `/category/{numeric_id}/`
   - Category selection UI during listing creation
   - DOM selectors: `.CategoryDialog__ButtonWrapper-sc-13509435-1`

4. **Crosslisting Tool Analysis**
   - Vendoo: Supports category mapping
   - List Perfectly: Does NOT support automatic categories
   - Most tools require manual category selection

---

## Usage Examples

### Automatic Category Detection

```typescript
import { suggestMercariCategory, formatCategoryPath } from './lib/mercari-categories';

const listing = {
  title: 'Lululemon Align Leggings Size 6',
  description: 'Black high-waisted yoga pants in excellent condition',
  category: 'Athletic Apparel'
};

const category = suggestMercariCategory(
  listing.title,
  listing.description,
  listing.category
);

console.log(formatCategoryPath(category));
// Output: "Women/Athletic Apparel/Pants, Tights, Leggings"
```

### Parse Existing Category

```typescript
import { parseCategoryPath } from './lib/mercari-categories';

const categoryPath = "Beauty/Makeup/Lips";
const category = parseCategoryPath(categoryPath);

console.log(category);
// Output: { tier1: 'Beauty', tier2: 'Makeup', tier3: 'Lips' }
```

---

## Future Enhancements

### To Get Complete List of All 1,288 Paths

1. **Download Kaggle Dataset:**
   - https://www.kaggle.com/c/mercari-price-suggestion-challenge/data
   - Extract unique values from `category_name` field in train.tsv
   - Parse by "/" to get tier structure
   - Generate comprehensive mapping file

2. **Scrape Mercari Website:**
   - Systematically browse category selection UI
   - Extract category IDs from URLs
   - Map IDs to category names
   - Build complete taxonomy database

3. **Use Mercari Shops API:**
   - Authenticate with Personal API Access Token
   - Query `productCategories` for full hierarchy
   - Requires business partnership with Mercari

4. **Machine Learning Enhancement:**
   - Train model on Kaggle dataset to predict categories
   - Use product title + description as features
   - Achieve higher accuracy than keyword matching
   - Consider using Mercari's LLM-based approach

---

## Migration Path

### Database Schema

Add `mercari_category` field to `listings` table:

```sql
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS mercari_category text;

COMMENT ON COLUMN listings.mercari_category IS '3-level category path: Tier1/Tier2/Tier3 (e.g., Women/Athletic Apparel/Pants, Tights, Leggings)';
```

### Existing Listings

For existing listings without Mercari categories:

```sql
-- Auto-populate based on title/description analysis
UPDATE listings
SET mercari_category = suggest_mercari_category(title, description, category)
WHERE mercari_category IS NULL AND platform = 'mercari';
```

---

## References

- [Mercari Engineering Blog - LLM Category Classification](https://engineering.mercari.com/en/blog/entry/20240411-large-scale-item-categoraization-using-llm/)
- [Kaggle Competition](https://www.kaggle.com/c/mercari-price-suggestion-challenge)
- [Mercari Shops API](https://api.mercari-shops.com/docs/)
- [Poshmark vs Mercari Categories Comparison](https://blog.vendoo.co/poshmark-vs-mercari)
