-- Add Mercari shipping fields to listings table
-- Run this in your Supabase SQL Editor

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS weight_lb INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_oz INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mercari_shipping_carrier TEXT,
ADD COLUMN IF NOT EXISTS mercari_shipping_type TEXT;

COMMENT ON COLUMN listings.weight_lb IS 'Item weight in pounds for shipping (separate from weight_oz which is total ounces)';
COMMENT ON COLUMN listings.weight_oz IS 'Item weight in ounces (additional to weight_lb). Total weight = weight_lb * 16 + weight_oz';
COMMENT ON COLUMN listings.mercari_shipping_carrier IS 'Preferred Mercari carrier: "usps", "ups", "fedex", or "cheapest"';
COMMENT ON COLUMN listings.mercari_shipping_type IS 'Preferred Mercari shipping type: "ground_advantage", "priority", "media_mail", "surepost", "ground", "smartpost", "home", or "auto" for cheapest option';
