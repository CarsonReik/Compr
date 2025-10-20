# Compr Email-Based Auth Setup Instructions

## What's Been Implemented

✅ **Database Schema** - Supabase tables for users and usage tracking
✅ **Authentication Pages** - Signup and login with email/password
✅ **Buyer Dashboard** - Search tool with 10 free searches/month limit
✅ **Seller Dashboard** - Placeholder with "Coming Soon" message
✅ **Usage Tracking** - Automatic tracking per user per month
✅ **Landing Page** - Updated with buyer/seller split and marketplace logos

## Next Steps to Complete Setup

### 1. Set up Supabase Database

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** to execute the SQL commands

This will create:
- `users` table (stores user email, account type, subscription tier)
- `usage_tracking` table (tracks searches_used and listings_added per month)
- Row Level Security policies
- Indexes for performance

### 2. Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled
3. Configure email templates (optional but recommended):
   - Go to **Authentication** → **Email Templates**
   - Customize the signup confirmation email if desired

### 3. Test the Authentication Flow

1. Start your dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Sign Up" in the header
4. Create a test account:
   - Choose "Buy" or "Sell"
   - Enter email and password (min 6 characters)
   - Click "Sign Up"
5. You should be redirected to the appropriate dashboard

### 4. Test the Buyer Dashboard

1. Log in as a buyer account
2. Try searching for an item (e.g., "iPhone 13")
3. Verify:
   - Search counter shows "X free searches remaining this month"
   - After using 10 searches, you get blocked
   - Results display properly

### 5. Test the Seller Dashboard

1. Sign up or log in as a seller account
2. Verify the "Coming Soon" placeholder displays
3. Usage tracking shows 0/10 listings added

## How Usage Limits Work

### For Buyers:
- **Free tier**: 10 searches per month
- **Pro tier** (not yet implemented): Unlimited searches for $20/month
- Usage resets on the 1st of each month

### For Sellers:
- **Free tier**: 10 listings added per month
- **Starter tier** (not yet implemented): 50 listings/month for $15/month
- **Pro tier** (not yet implemented): 200 listings/month for $30/month

## File Structure

```
app/
├── page.tsx                    # Landing page with buyer/seller split
├── login/page.tsx              # Login page
├── signup/page.tsx             # Signup page with account type selection
├── buyer/page.tsx              # Buyer dashboard with search tool
├── seller/page.tsx             # Seller dashboard (placeholder)
└── api/
    └── search/route.ts         # Search API with auth & usage tracking

lib/
├── supabase.ts                 # Supabase client setup
├── ebay-browse.ts              # eBay API integration
└── mercari.ts                  # Mercari scraper integration

supabase-schema.sql             # Database schema to run in Supabase
```

## Old Files You Can Delete

The following files are from the old token-based system and are no longer needed:

- `app/api/checkout/route.ts` - Stripe checkout (replaced with simple auth)
- `app/api/validate-token/route.ts` - Token validation
- `app/api/webhook/route.ts` - Stripe webhook
- `lib/access-tokens.ts` - Token management
- `lib/rate-limit.ts` - IP-based rate limiting

## Environment Variables

Make sure you have these in `.env.local`:

```
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# eBay API (Required for buyer search)
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret

# Apify (Required for Mercari search)
APIFY_API_TOKEN=your_apify_token

# Stripe (Optional - for future payment integration)
# STRIPE_SECRET_KEY=your_stripe_secret_key
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Next Features to Build

1. **Stripe Payment Integration** - Allow users to upgrade to Pro
2. **Cross-Listing Tool** - Seller dashboard functionality
3. **Email Verification** - Require email confirmation on signup
4. **Password Reset** - Allow users to reset forgotten passwords
5. **Usage Analytics** - Show users their search/listing history
6. **Admin Dashboard** - View all users and usage stats

## Troubleshooting

### "Failed to fetch user data"
- Check that you ran the SQL schema in Supabase
- Verify your environment variables are correct
- Check Supabase logs in the dashboard

### "User authentication required"
- Make sure user is logged in
- Check browser console for auth errors
- Try logging out and back in

### Search not working
- Verify eBay and Apify API credentials
- Check API quotas haven't been exceeded
- Look at server logs for specific errors

## Support

If you run into issues:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Verify all environment variables are set
4. Make sure the Supabase schema was created successfully
