# eBay Token Refresh System

## Overview

eBay OAuth access tokens expire every **2 hours (7,200 seconds)**. The refresh token is valid for **18 months**. This document explains how automatic token refresh works in Compr.

---

## How It Works

### 1. **Token Storage**

When a user connects their eBay account, we store:
- `access_token` - Valid for 2 hours
- `refresh_token` - Valid for 18 months
- `token_expires_at` - Exact expiration timestamp

These are stored in the `platform_connections` table.

### 2. **Automatic Refresh**

The `getValidEbayToken(userId)` function automatically:
1. Checks if the current token expires in the next 5 minutes
2. If valid, returns the existing token
3. If expired/expiring soon, uses the refresh token to get a new access token
4. Updates the database with new tokens
5. Returns the fresh access token

### 3. **Usage in API Routes**

```typescript
import { getValidEbayToken } from '@/lib/ebay-token-refresh';

export async function POST(request: Request) {
  const userId = 'user-uuid-here';

  try {
    // This automatically refreshes if needed
    const accessToken = await getValidEbayToken(userId);

    // Use the token to make eBay API calls
    const response = await fetch('https://api.ebay.com/sell/inventory/v1/inventory_item', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // ... rest of your eBay API call
    });

    // Handle response...
  } catch (error) {
    // If refresh fails, user needs to reconnect
    return new Response('eBay connection expired. Please reconnect.', { status: 401 });
  }
}
```

---

## Key Functions

### `getValidEbayToken(userId: string)`

**Purpose**: Get a valid access token, refreshing automatically if needed

**Returns**: `Promise<string>` - Valid access token

**Throws**: Error if refresh fails or connection doesn't exist

**Example**:
```typescript
const token = await getValidEbayToken('user-id');
```

---

### `checkTokenExpiration(userId: string)`

**Purpose**: Check if a token will expire soon (useful for proactive refresh)

**Returns**:
```typescript
{
  needsRefresh: boolean,  // true if expires in < 30 minutes
  expiresAt: Date | null
}
```

**Example**:
```typescript
const { needsRefresh, expiresAt } = await checkTokenExpiration('user-id');

if (needsRefresh) {
  // Proactively refresh before user tries to list
  await getValidEbayToken('user-id');
}
```

---

## Token Lifecycle

```
[User connects eBay]
       ↓
[Store access_token + refresh_token]
       ↓
[User lists item after 2+ hours]
       ↓
[getValidEbayToken() detects expiration]
       ↓
[Automatically refreshes using refresh_token]
       ↓
[Updates database with new tokens]
       ↓
[Returns fresh access_token]
       ↓
[Item listed successfully]
```

---

## Error Handling

### If Refresh Fails:

1. The connection is marked as `is_active: false` in the database
2. An error is thrown
3. User sees a message to reconnect their eBay account
4. User can click "Connect eBay" again to get new tokens

### Common Refresh Failures:

- **Refresh token expired** (after 18 months) → User must reconnect
- **User revoked access** on eBay → User must reconnect
- **Network error** → Retry, then ask user to reconnect
- **Invalid credentials** (changed eBay app keys) → Check environment variables

---

## When Tokens Are Refreshed

Tokens are refreshed automatically when:

1. **Any eBay API call** is made through `getValidEbayToken()`
2. Token expires in **< 5 minutes**

This "5 minute buffer" ensures tokens don't expire mid-request.

---

## Future Improvements

### Background Token Refresh Job

For production, consider a cron job that:
- Runs every hour
- Checks all active eBay connections
- Proactively refreshes tokens expiring in < 1 hour
- Prevents users from encountering expired tokens

**Example with Vercel Cron**:

```typescript
// app/api/cron/refresh-tokens/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(...);

  // Get all connections expiring in next hour
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'ebay')
    .eq('is_active', true)
    .lt('token_expires_at', oneHourFromNow.toISOString());

  // Refresh each one
  for (const conn of connections || []) {
    try {
      await getValidEbayToken(conn.user_id);
    } catch (error) {
      console.error(`Failed to refresh for user ${conn.user_id}:`, error);
    }
  }

  return new Response('OK');
}
```

Then add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/refresh-tokens",
    "schedule": "0 * * * *"  // Every hour
  }]
}
```

---

## Testing Token Refresh

To test the refresh logic:

1. **Manually expire a token in the database**:
```sql
UPDATE platform_connections
SET token_expires_at = NOW() - INTERVAL '1 hour'
WHERE user_id = 'your-user-id' AND platform = 'ebay';
```

2. **Make an API call** that uses `getValidEbayToken()`

3. **Check logs** to see "Refreshing eBay token for user..."

4. **Verify** new token is saved in database with updated `token_expires_at`

---

## Security Notes

- ✅ Tokens are stored server-side only (never sent to client)
- ✅ Refresh tokens are encrypted at rest by Supabase
- ✅ Access tokens are short-lived (2 hours)
- ✅ Failed refresh attempts mark connection as inactive
- ✅ Service role key used for token operations (bypasses RLS)

---

## Resources

- [eBay OAuth Documentation](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [eBay Token Refresh Guide](https://developer.ebay.com/api-docs/static/oauth-refresh-token-request.html)
