-- Add Mercari-specific fields to listings table

-- Add 3-level category path (Tier1/Tier2/Tier3)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS mercari_category text;

-- Add comments for clarity
COMMENT ON COLUMN listings.mercari_category IS '3-level category path: Tier1/Tier2/Tier3 (e.g., Women/Athletic Apparel/Pants, Tights, Leggings). Based on Mercari''s category taxonomy with 11 main categories, 114 subcategories, and 869 sub-subcategories for a total of 1,287 unique paths.';

-- Note: Existing fields that work for Mercari:
-- - category: General category field (can be used as fallback)
-- - brand: Brand name (required by Mercari)
-- - size: Size field (required by Mercari)
-- - color: Color field (general use)
-- - condition: Item condition (maps to Mercari's 5 conditions)
-- - original_price: Can be used for Mercari's smart pricing floor price
