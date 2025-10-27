-- Add Poshmark-specific fields to listings table

-- Add color array field (up to 2 colors)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS poshmark_color text[];

-- Add New With Tags boolean flag
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS poshmark_new_with_tags boolean DEFAULT false;

-- Add 3-level category path (Department/Category/Subcategory)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS poshmark_category text;

-- Note: original_price field already exists and is required for Poshmark
-- Note: color field already exists in listings table for general use

-- Add comments for clarity
COMMENT ON COLUMN listings.poshmark_color IS 'Array of up to 2 colors for Poshmark listing (Red, Pink, Orange, Yellow, Green, Blue, Purple, Gold, Silver, Black, Gray, White, Cream, Brown, Tan)';
COMMENT ON COLUMN listings.poshmark_new_with_tags IS 'Whether item is New With Tags for Poshmark';
COMMENT ON COLUMN listings.poshmark_category IS '3-level category path: Department/Category/Subcategory (e.g., Women/Dresses/Maxi)';
