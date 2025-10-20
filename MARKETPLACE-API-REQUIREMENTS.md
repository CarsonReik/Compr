# Marketplace API Requirements Research (2025)

## Summary

| Platform | API Available | Status | Integration Method |
|----------|--------------|--------|-------------------|
| eBay | ✅ Yes | Full API | Trading API (AddItem) |
| Etsy | ✅ Yes | Full API | Open API v3 (createDraftListing) |
| Poshmark | ❌ No | Partner Only | DSCO/CommerceHub (can't create listings) |
| Mercari | ⚠️ Limited | GraphQL API | Mercari Shops API (unclear docs) |
| Depop | ❌ No | CSV Only | CSV bulk upload or browser automation |

---

## eBay Trading API - AddItem

### Required Fields:
- **Title** (80 chars max)
- **Description** (HTML supported)
- **PrimaryCategory/CategoryID** (numeric ID, conditionally required)
- **Quantity** (integer)
- **StartPrice** (decimal)
- **ListingDuration** (Days_1, Days_3, Days_5, Days_7, Days_10, Days_30, GTC)
- **ListingType** (FixedPriceItem, Auction)
- **ConditionID** (numeric: 1000=New, 1500=New Other, 2000=Manufacturer Refurbished, 2500=Seller Refurbished, 3000=Used, 4000=Very Good, 5000=Good, 6000=Acceptable, 7000=For Parts)
- **Country** (ISO country code, e.g., US)
- **Currency** (ISO currency, e.g., USD)
- **Location** (city/region)
- **PaymentMethods** (e.g., PayPal, CreditCard)
- **ShippingDetails** (at least one shipping service with cost)
- **DispatchTimeMax** (1-30 days)
- **ReturnPolicy** (required for most categories)
- **Product Images** (at least 1, max 12)

### Conditionally Required:
- **Item Specifics** (Brand, Size, Color, etc.) - varies by category
- **PayPalEmailAddress** (if PayPal selected)

### Useful Endpoints:
- `GetCategories` - Get category tree
- `GetCategoryFeatures` - Get category requirements
- `GetCategorySpecifics` - Get required item specifics for category
- `VerifyAddItem` - Test listing before posting

---

## Etsy Open API v3 - createDraftListing

### Required Fields:
- **quantity** (integer)
- **title** (140 chars max)
- **description** (text)
- **price** (decimal, in shop's currency)
- **who_made** (enum: "i_did", "someone_else", "collective")
- **when_made** (enum: "made_to_order", "2020_2025", "2010_2019", "2000_2009", "before_2000", "1990s", "1980s", "1970s", "1960s", "1950s", "1940s", "1930s", "1920s", "1910s", "1900s", "1800s", "1700s", "before_1700")
- **taxonomy_id** (integer, Etsy category ID)

### Required for Physical Items:
- **shipping_profile_id** (integer, must create shipping profile first)

### Required for Active Listings:
- **image_ids** (array of integers, at least 1 image)

### Optional but Important:
- **tags** (array of strings, max 13 tags)
- **materials** (array of strings)
- **shop_section_id** (integer)
- **is_supply** (boolean, "is it a supply?")
- **processing_min** (1-6 weeks)
- **processing_max** (1-6 weeks)
- **type** (enum: "physical", "digital", "download")

### Authentication:
- OAuth 2.0 with `listings_r` and `listings_w` scopes
- `x-api-key` header required

---

## Poshmark

### API Status: ❌ **NO PUBLIC API**

### Integration Options:
1. **DSCO/CommerceHub** (enterprise partners only)
   - Can update price/quantity only
   - CANNOT create new listings via API
   - Takes 2-3 weeks to set up

2. **Manual Upload** (app or website)

3. **Browser Automation** (Puppeteer/Playwright)

### Fields for Manual Listing:
- Title
- Description
- Photos (1-16)
- Category
- Subcategory
- Brand
- Size
- Color
- Condition (New with Tags, New without Tags, Excellent, Good, Fair, Poor)
- Price
- Original Price (optional)
- Style Tags (optional)

---

## Mercari

### API Status: ⚠️ **LIMITED API** (Mercari Shops GraphQL API)

### Access Requirements:
- Personal API Access Token (from shop admin page)
- GraphQL endpoint: api.mercari-shops.com
- Rate limit: 10,000 points/hour

### Known Fields (incomplete documentation):
- Title
- Description
- Price
- Shipping Configuration ID
- Condition (via Product Condition Option values)
- Product Status
- Shipping Payer (currently only SELLER)
- Category
- Photos/Images

### Integration Challenge:
- Limited to Mercari Shops (not regular Mercari marketplace)
- Incomplete public documentation
- May require browser automation for regular Mercari

---

## Depop

### API Status: ❌ **NO PUBLIC API**

### Integration Options:
1. **CSV Bulk Upload** (official, released 2025)
2. **Third-party platforms** (ExportYourStore, etc.)
3. **Browser Automation** (Puppeteer/Playwright)

### Fields for Manual Listing:
- Title (65 chars max)
- Description (1000 chars max)
- Photos (1-4)
- Category
- Subcategory
- Brand (optional)
- Size (optional)
- Color (optional)
- Condition
- Price
- Shipping price OR free shipping

---

## Implementation Recommendations

### Phase 1: Official APIs (Start Here)
✅ **eBay** - Full automation possible
✅ **Etsy** - Full automation possible

### Phase 2: Browser Automation
⚠️ **Poshmark** - Puppeteer/Playwright automation
⚠️ **Mercari** - Puppeteer/Playwright automation
⚠️ **Depop** - Puppeteer/Playwright or CSV export

### Common Fields to Collect:
For all platforms, we should collect:
- Title (use shortest limit: 65 chars for Depop compatibility)
- Description (1000 chars min for compatibility)
- Price
- Quantity
- Condition (standardize to: New, Like New, Good, Fair, Poor)
- Category (we'll need mapping logic)
- Brand (optional but useful)
- Size (optional, required for clothing)
- Color (optional)
- Material (optional, important for Etsy)
- Photos (1-4 minimum for Depop compatibility, up to 12-16 for others)
- Shipping Weight (oz) - needed for eBay and Mercari

### Platform-Specific Fields to Add:
**eBay:**
- eBay Category ID (can auto-suggest from title/category)
- Item Specifics (varies by category)
- Shipping service selection
- Return policy

**Etsy:**
- who_made (dropdown)
- when_made (dropdown)
- is_supply (checkbox)
- tags (max 13)
- materials (array)
- processing time (1-6 weeks)

---

## Category Mapping Strategy

We should create a category mapping table:
```
User Input → eBay Category ID + Etsy Taxonomy ID + Poshmark Category

Example:
"Sneakers" →
  - eBay: 15709 (Men's Athletic Shoes)
  - Etsy: (not applicable, handmade/vintage only)
  - Poshmark: Men > Shoes > Sneakers
  - Mercari: Shoes > Men's Shoes
  - Depop: Menswear > Shoes
```

This will require building a category database or using AI to intelligently map categories.
