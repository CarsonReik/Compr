# Compr - Project Summary

**Last Updated**: January 2025

## Quick Start
```bash
npm run dev  # Start dev server at localhost:3000
npm run build  # Production build
```

## What is Compr?

Compr is a **seller-focused cross-listing automation tool**:

- Upload product once, list on multiple platforms (eBay, Mercari, Poshmark, Depop, Etsy)
- Manage all listings from one dashboard
- Track which platforms sell fastest
- AI-powered image analysis and pricing recommendations

---

## Current Status

### ✅ Fully Implemented
- Email-based authentication (signup/login/logout)
- Supabase database with RLS (users, usage_tracking tables)
- Seller dashboard with listing management UI
- Monthly usage tracking with automatic resets
- Landing page (seller-focused)
- Navy blue trust-based design (avoiding generic AI purple)
- AI image analysis (OpenAI Vision API)
- Multi-platform price lookup API

### 🚧 Partially Implemented
- **API Integrations for Listing Creation**:
  - eBay: Trading API ready (not yet integrated)
  - Etsy: Official API v3 ready (not yet integrated)
  - Mercari: Browser automation planned
  - Poshmark: Browser automation planned
  - Depop: Browser automation or CSV upload planned
- **Price Lookup APIs** (for pricing recommendations):
  - eBay: Official Browse API ✓
  - Mercari: Apify scraper ✓
  - Poshmark: Apify scraper ✓
  - Depop: Oxylabs scraper ✓
  - Etsy: Official API ✓

### ❌ Not Yet Built
- Stripe subscription payments
- Actual cross-listing functionality (creating listings on platforms)
- Email verification
- Password reset flow
- Admin dashboard
- User profile page

---

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 (React 19)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4
- **Payments**: Stripe (not yet integrated)
- **APIs**: eBay Browse, Etsy, Apify (Mercari/Poshmark), Oxylabs (Depop)

### Project Structure
```
compr/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/page.tsx              # Login form
│   ├── signup/page.tsx             # Signup with account type selection
│   ├── buyer/page.tsx              # Buyer dashboard (DELETED: old search was at app/api/search/route.ts)
│   ├── seller/
│   │   ├── page.tsx                # Seller dashboard
│   │   └── listings/
│   │       ├── page.tsx            # All listings view
│   │       ├── new/page.tsx        # Create new listing
│   │       └── [id]/
│   │           ├── page.tsx        # View listing
│   │           └── edit/page.tsx   # Edit listing
│   └── api/
│       ├── analyze-image/route.ts  # AI image analysis (OpenAI Vision)
│       ├── price-lookup/route.ts   # Multi-platform price lookup
│       ├── checkout/route.ts       # OLD: Stripe token checkout
│       ├── validate-token/route.ts # OLD: Token validation
│       └── generate-token/route.ts # OLD: Token generation
├── lib/
│   ├── supabase.ts                 # Supabase client setup
│   ├── ebay-browse.ts              # eBay Browse API (active listings)
│   ├── ebay.ts                     # eBay Trading API (for listing creation)
│   ├── ebay-oauth.ts               # eBay OAuth token management
│   ├── mercari.ts                  # Mercari Apify scraper
│   ├── poshmark.ts                 # Poshmark Apify scraper
│   ├── depop.ts                    # Depop Oxylabs scraper
│   ├── etsy.ts                     # Etsy Official API v3
│   ├── access-tokens.ts            # OLD: Token management
│   └── rate-limit.ts               # OLD: IP-based rate limiting
├── types/
│   └── index.ts                    # TypeScript types for all platforms
├── supabase-schema.sql             # Database schema (MUST RUN IN SUPABASE)
├── CURRENT-STATE-AND-NEXT-STEPS.txt # Detailed developer notes
├── MARKETPLACE-API-REQUIREMENTS.md  # API research & field mappings
└── SETUP-INSTRUCTIONS.md            # User-friendly setup guide
```

---

## Database Schema

### `public.users`
```sql
id              UUID PRIMARY KEY (FK to auth.users.id)
email           TEXT UNIQUE
account_type    TEXT (always 'seller' now)
subscription_tier TEXT ('free', 'starter', 'pro')
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### `public.usage_tracking`
```sql
id              UUID PRIMARY KEY
user_id         UUID (FK to users.id)
period_start    DATE ('2025-01-01', '2025-02-01', etc.)
searches_used   INTEGER DEFAULT 0 (deprecated - was for buyer side)
listings_added  INTEGER DEFAULT 0
created_at      TIMESTAMP
UNIQUE(user_id, period_start)  # One record per user per month
```

### `public.listings` (Needs to be created)
```sql
id              UUID PRIMARY KEY
user_id         UUID (FK to users.id)
title           TEXT
description     TEXT
price           NUMERIC
quantity        INTEGER
condition       TEXT ('new', 'like_new', 'good', 'fair', 'poor')
category        TEXT
brand           TEXT
size            TEXT
color           TEXT
material        TEXT
weight_oz       NUMERIC
tags            TEXT[]
photo_urls      TEXT[]
status          TEXT ('draft', 'active', 'sold', 'archived')
platform_metadata JSONB  # Platform-specific fields
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**RLS Enabled**: Users can only access their own data

---

## User Flows

### Seller Signup & Login
1. Visit homepage → Click "Sign Up"
2. Enter email + password → Creates user with `account_type='seller'`
3. Redirected to `/seller` dashboard
4. Login redirects all users to `/seller` dashboard

### Create New Listing (Planned)
1. Click "New Listing" in seller dashboard
2. Upload 1-8 photos
3. (Optional) Click "Analyze Images" → AI extracts title, description, category, pricing
4. Fill in details: title, description, price, quantity, condition, brand, size, etc.
5. Select platforms to list on (eBay, Etsy, Mercari, Poshmark, Depop)
6. Click "Create Listing" → Listing saved as draft
7. Click "Publish to [Platform]" for each platform
8. API creates listing on selected platforms
9. Listing status updates to "active"
10. Usage counter increments: listings_added

### Manage Listings
1. View all listings at `/seller/listings`
2. Click listing → View details at `/seller/listings/[id]`
3. Edit listing at `/seller/listings/[id]/edit`
4. Mark as sold, archive, or delete

---

## API Integrations

### Price Lookup APIs (For Pricing Recommendations)

| Platform | Method | Status | Notes |
|----------|--------|--------|-------|
| eBay | Official Browse API | ✓ Working | OAuth2 token management |
| Mercari | Apify scraper | ✓ Working | Unofficial but reliable |
| Poshmark | Apify scraper (piotrv1001/poshmark-listings-scraper) | ✓ Working | $1/1000 products |
| Depop | Oxylabs Scraper API | ✓ Working | Free trial 2000 results, then $49/mo |
| Etsy | Official Open API v3 | ✓ Working | x-api-key authentication |

**All platforms use IQR outlier filtering** to remove extreme prices.
**Used in**: `/api/price-lookup` to help sellers price their items

### Listing Creation APIs (Not Yet Implemented)

| Platform | API Available | Integration Method |
|----------|--------------|-------------------|
| eBay | ✅ Yes | Trading API (AddItem) |
| Etsy | ✅ Yes | Open API v3 (createDraftListing) |
| Mercari | ⚠️ Limited | Mercari Shops GraphQL API OR browser automation |
| Poshmark | ❌ No | Browser automation (Puppeteer/Playwright) |
| Depop | ❌ No | CSV bulk upload OR browser automation |

**Strategy**: Start with eBay + Etsy (official APIs), then add browser automation for others.

---

## Environment Variables

Required in `.env.local`:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For server-side operations

# eBay (Required for buyer search)
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret

# Apify (Required for Mercari & Poshmark search)
APIFY_API_TOKEN=your_apify_token

# Etsy (Required for Etsy search)
ETSY_API_KEY=your_etsy_api_key

# Oxylabs (Required for Depop search)
OXYLABS_USERNAME=your_oxylabs_username
OXYLABS_PASSWORD=your_oxylabs_password

# OpenAI (For image analysis in seller dashboard)
OPENAI_API_KEY=your_openai_api_key

# Stripe (Not yet integrated)
# STRIPE_SECRET_KEY=your_stripe_secret_key
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

---

## Subscription Tiers (Defined, Not Yet Enforced)

### Seller Plans
- **Free**: 10 listings/month
- **Starter**: $15/month, 50 listings/month
- **Pro**: $30/month, 200 listings/month

---

## Setup Checklist

- [ ] Install dependencies: `npm install`
- [ ] Create `.env.local` with all required variables
- [ ] Go to Supabase dashboard → SQL Editor
- [ ] Copy/paste `supabase-schema.sql` → Run
- [ ] Verify tables created: Check Table Editor for `users` and `usage_tracking`
- [ ] Enable Email Auth: Authentication → Providers → Enable "Email"
- [ ] Start dev server: `npm run dev`
- [ ] Test signup flow: Create buyer account at `/signup`
- [ ] Test search: Try searching for "iphone 13"
- [ ] Verify usage counter: Should show "9 free searches remaining"

---

## Known Issues

### Build Errors (from Logs.txt)
- 404 errors for turbopack chunks
- This appears to be a dev server cache issue
- **Fix**: Try `rm -rf .next` and restart dev server

### Buyer Side References (Need Cleanup)
- `/app/buyer/` directory still exists (should be removed)
- `app/api/search/route.ts` was deleted (correct - not needed anymore)
- `CURRENT-STATE-AND-NEXT-STEPS.txt` references buyer features heavily
- Signup/login pages may still have buyer/seller toggle (should be seller-only)

### Old Token System Files
These files are obsolete but not deleted:
- `app/api/checkout/route.ts`
- `app/api/validate-token/route.ts`
- `app/api/generate-token/route.ts`
- `lib/access-tokens.ts`
- `lib/rate-limit.ts`

---

## Next Steps (Priority Order)

### 1. Clean Up Buyer References
- Remove `/app/buyer/` directory
- Update signup/login to be seller-only (remove account type toggle)
- Update landing page to be seller-focused
- Update `CURRENT-STATE-AND-NEXT-STEPS.txt`

### 2. Test Seller Dashboard
- Verify signup/login/logout works for sellers
- Test listing creation UI at `/seller/listings/new`
- Test image analysis API at `/api/analyze-image`
- Test price lookup API at `/api/price-lookup`

### 3. Create Listings Database Table
- Add `public.listings` table to `supabase-schema.sql`
- Add RLS policies for listings
- Test CRUD operations

### 4. Integrate Stripe Subscriptions
- Create Stripe products for Pro plans
- Build `/api/checkout/subscription` route
- Handle subscription webhooks
- Update `users.subscription_tier` on payment success
- Add "Upgrade to Pro" button functionality

### 5. Build Cross-Listing Functionality
**Phase 1**: eBay + Etsy (Official APIs)
- Create listing form with photo upload
- Implement eBay Trading API listing creation
- Implement Etsy API listing creation
- Store listings in new `listings` table
- Display in seller dashboard

**Phase 2**: Browser Automation
- Add Puppeteer for Mercari/Poshmark/Depop
- Implement "Post to All" button
- Add auto-delist on sale

### 6. Polish & Production Features
- Email verification
- Password reset
- User profile page
- Admin dashboard
- Analytics and usage history

---

## Important Design Decisions

### Why Navy Blue?
- Rejected black/white brutalist (too minimalistic)
- Rejected purple gradients (generic AI)
- Navy blue = trustworthiness (financial service color)
- Subtle gradient: slate-50 → blue-50 → slate-100
- SVG dot pattern overlay for visual interest

### Why These 5 Marketplaces?
- Started with 15 platforms
- Most have no APIs or require enterprise partnerships
- eBay, Etsy have official APIs
- Mercari, Poshmark, Depop have reliable scrapers
- Dropped: Amazon (too expensive), Vinted (requires 200+ items), Facebook (restricted)

### Why Remove Token System?
- Token system was temporary MVP
- Email auth = better UX (no codes to lose)
- Monthly limits more natural than "10 searches for $1"
- Easier to add subscription tiers
- Supabase handles all auth complexity

### Monthly Usage Tracking
- `period_start` = first day of month (e.g., '2025-01-01')
- One record per user per month (UNIQUE constraint)
- Automatic reset: New month → new record created on first use
- No cron jobs needed

---

## Troubleshooting

### "Failed to fetch user data"
- Check SQL schema was run in Supabase
- Verify `.env.local` has correct Supabase credentials
- Check Supabase dashboard logs

### "User authentication required"
- Clear browser cookies/localStorage
- Try logging out and back in
- Check browser console for auth errors

### Search not working
- Verify all API keys in `.env.local`
- Check API quotas (eBay, Apify, Oxylabs, Etsy)
- Look at server logs for specific errors
- Verify `/api/search/route.ts` exists (currently deleted!)

### 404 errors in console
- Delete `.next` folder
- Restart dev server
- Clear browser cache

---

## File References (Key Locations)

### Authentication
- Signup: `app/signup/page.tsx` ⚠️ **May still have buyer/seller toggle - needs cleanup**
- Login: `app/login/page.tsx`
- Supabase client: `lib/supabase.ts`

### Seller Features
- Dashboard: `app/seller/page.tsx`
- New listing: `app/seller/listings/new/page.tsx`
- All listings: `app/seller/listings/page.tsx`
- Edit listing: `app/seller/listings/[id]/edit/page.tsx`
- Image analysis: `app/api/analyze-image/route.ts`

### Platform Integrations
- eBay: `lib/ebay-browse.ts` (price lookup), `lib/ebay.ts` (listing creation), `lib/ebay-oauth.ts`
- Mercari: `lib/mercari.ts` (price lookup)
- Poshmark: `lib/poshmark.ts` (price lookup)
- Depop: `lib/depop.ts` (price lookup)
- Etsy: `lib/etsy.ts` (price lookup & listing creation)

### Types
- All TypeScript types: `types/index.ts`

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Clear build cache (if 404 errors)
rm -rf .next
npm run dev

# Database
# Run supabase-schema.sql in Supabase SQL Editor
```

---

## Git Status Snapshot

**Modified files**:
- `Logs.txt`
- `app/globals.css`
- `app/page.tsx`
- `lib/ebay-browse.ts`
- `lib/mercari.ts`
- `package.json`, `package-lock.json`
- `types/index.ts`

**Deleted files**:
- `app/api/search/route.ts` (Correct - buyer side removed)

**Untracked files**:
- `.claude/` (Claude Code config)
- `CURRENT-STATE-AND-NEXT-STEPS.txt`
- `MARKETPLACE-API-REQUIREMENTS.md`
- `SETUP-INSTRUCTIONS.md`
- `SUPABASE_STORAGE_SETUP.md`
- `app/api/analyze-image/`
- `app/api/price-lookup/`
- `app/login/`, `app/signup/`, `app/seller/`
- `lib/depop.ts`, `lib/etsy.ts`, `lib/poshmark.ts`
- `supabase-schema.sql`

**Current branch**: `main`

---

## Contact & Documentation

- Main docs: See `CURRENT-STATE-AND-NEXT-STEPS.txt` for detailed technical notes
- API research: See `MARKETPLACE-API-REQUIREMENTS.md` for platform integration details
- Setup guide: See `SETUP-INSTRUCTIONS.md` for user-friendly setup walkthrough
