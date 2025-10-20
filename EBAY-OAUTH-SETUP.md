# eBay OAuth Setup Guide

This guide will help you set up eBay OAuth so sellers can connect their eBay accounts to Compr.

## Prerequisites

1. eBay Developer Account (https://developer.ebay.com/)
2. Application keys (App ID/Client ID, Dev ID, Cert ID/Secret)

---

## Step 1: Create eBay Developer Application

1. Go to https://developer.ebay.com/
2. Sign in with your eBay account
3. Navigate to **My Account** → **Application Keys**
4. Click **Create a New Application Key Set**

### Choose Environment:
- **Sandbox**: For testing (use this first!)
- **Production**: For live listings

---

## Step 2: Get Your Keys

You'll receive 3 keys:

1. **App ID (Client ID)** - Your application's public identifier
2. **Dev ID** - Developer identifier (only needed for Trading API)
3. **Cert ID (Client Secret)** - Your application's secret key

Copy these to your `.env.local`:

```env
EBAY_CLIENT_ID=YourAppID
EBAY_CLIENT_SECRET=YourCertID
EBAY_ENVIRONMENT=sandbox  # or 'production'
```

---

## Step 3: Create RuName (Redirect URL Name)

An **RuName** is eBay's way of whitelisting redirect URLs for OAuth.

### For Sandbox:

1. Go to **User Access Tokens** in eBay Developer Portal
2. Click **Get OAuth Redirect URI**
3. Or directly: https://developer.ebay.com/my/auth/?env=sandbox&index=0

### Create New RuName:

1. Click **Add eBay Redirect URL**
2. Enter your redirect URL:
   - **Local dev**: `http://localhost:3000/api/auth/ebay/callback`
   - **Production**: `https://yourdomain.com/api/auth/ebay/callback`
3. Give it a name (e.g., "Compr_Local" or "Compr_Production")
4. Click **Save**

### Copy RuName to `.env.local`:

```env
EBAY_RU_NAME=Your_RuName_Here
EBAY_REDIRECT_URI=http://localhost:3000/api/auth/ebay/callback
```

**Important**: The `EBAY_RU_NAME` is what you'll use in OAuth requests, not the full URL!

---

## Step 4: Configure OAuth Scopes

The app requests these scopes (defined in `/api/auth/ebay/authorize`):

- `https://api.ebay.com/oauth/api_scope/sell.account` - Manage account settings
- `https://api.ebay.com/oauth/api_scope/sell.inventory` - Create and manage listings
- `https://api.ebay.com/oauth/api_scope/sell.fulfillment` - Manage orders
- `https://api.ebay.com/oauth/api_scope/sell.marketing` - Marketing tools

These scopes are automatically included in the authorization request.

---

## Step 5: Complete `.env.local` Configuration

Your complete eBay configuration should look like this:

```env
# eBay API Configuration
EBAY_CLIENT_ID=YourAppIDHere
EBAY_CLIENT_SECRET=YourCertIDHere
EBAY_ENVIRONMENT=sandbox
EBAY_RU_NAME=Your_RuName_Here
EBAY_REDIRECT_URI=http://localhost:3000/api/auth/ebay/callback

# For production:
# EBAY_ENVIRONMENT=production
# EBAY_REDIRECT_URI=https://yourdomain.com/api/auth/ebay/callback
```

---

## Step 6: Create Sandbox Test User (Optional but Recommended)

Sandbox test users let you test without affecting real eBay accounts.

1. Go to https://developer.ebay.com/DevZone/account/tokens/default.aspx
2. Select **User Access Tokens** → **Register a new Sandbox user**
3. Create a test seller account
4. eBay gives each test user $500,000 in play money
5. Use this account to test connecting and listing

---

## Step 7: Test the OAuth Flow

### In Development:

1. Start your dev server: `npm run dev`
2. Navigate to `http://localhost:3000/seller/connections`
3. Click "Connect eBay"
4. You'll be redirected to eBay's authorization page
5. Log in with your eBay account (or sandbox test user)
6. Click "Agree" to authorize Compr
7. You'll be redirected back to `/seller/connections` with success message

### What Happens:

1. User clicks "Connect eBay" → `/api/auth/ebay/authorize` generates auth URL
2. User redirected to eBay → Logs in and authorizes
3. eBay redirects to `/api/auth/ebay/callback` with authorization code
4. Callback exchanges code for access_token + refresh_token
5. Tokens stored in `platform_connections` table
6. User sees "Connected ✓" on connections page

---

## Step 8: Token Management

### Access Token Lifespan:
- **eBay User Access Tokens**: Valid for 2 hours (7,200 seconds)
- **Refresh Token**: Valid for 18 months

### Auto-Refresh (Coming Soon):
We'll need to implement a background job to refresh tokens before they expire using the refresh token.

### Token Storage:
Tokens are stored in the `platform_connections` table:

```sql
{
  user_id: UUID,
  platform: 'ebay',
  access_token: 'v^1.1#...',
  refresh_token: 'v^1.1#...',
  token_expires_at: TIMESTAMP,
  is_active: true
}
```

---

## Troubleshooting

### "Authorization failed" or "Invalid RuName"
- Double-check your RuName is correctly configured in eBay Developer Portal
- Make sure `EBAY_RU_NAME` in `.env.local` matches exactly
- Verify redirect URI matches what's registered

### "Token exchange failed"
- Check `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` are correct
- Make sure you're using sandbox keys with `EBAY_ENVIRONMENT=sandbox`
- Check server logs for detailed error messages

### "Database error"
- Verify `platform_connections` table exists in Supabase
- Run `add-missing-tables.sql` if needed
- Check Row Level Security policies are enabled

### "Unauthorized" after redirect
- User session may have expired
- Try logging in again and reconnecting

---

## Production Checklist

Before going live:

- [ ] Create Production application keys in eBay Developer Portal
- [ ] Create Production RuName with your production domain
- [ ] Update `.env.local` with production keys and `EBAY_ENVIRONMENT=production`
- [ ] Test OAuth flow with real eBay seller account
- [ ] Implement token refresh mechanism
- [ ] Add error logging/monitoring
- [ ] Consider rate limiting (eBay has API call limits)

---

## Resources

- eBay Developer Docs: https://developer.ebay.com/
- OAuth Guide: https://developer.ebay.com/api-docs/static/oauth-quick-ref.html
- Trading API (for listings): https://developer.ebay.com/DevZone/XML/docs/Reference/eBay/index.html
- API Explorer: https://developer.ebay.com/DevZone/build-test/test-tool/default.aspx
