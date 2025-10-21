# eBay Marketplace Account Deletion Setup

## ⚠️ REQUIRED FOR COMPLIANCE

This is a **mandatory requirement** for all eBay API applications. Failure to implement this will result in:
- Termination of eBay API access
- Reduced access to APIs
- Non-compliance status

---

## What Is This?

When an eBay user requests deletion of their account and personal data (GDPR right to be forgotten), eBay sends a notification to all connected apps. You **must** delete their data from your database.

---

## Setup Steps

### 1. Add Environment Variables

Add these to your `.env.local` and Vercel environment variables:

```env
# eBay Marketplace Account Deletion
EBAY_VERIFICATION_TOKEN=your_random_verification_token_here
EBAY_DELETION_ENDPOINT=https://compr.co/api/ebay/marketplace-account-deletion
```

**Generate a verification token**:
```bash
# Use a random string, at least 32 characters
openssl rand -hex 32
```

Or use any random string generator. Save this token - you'll need it in the eBay Developer Portal.

---

### 2. Configure in eBay Developer Portal

1. Go to https://developer.ebay.com/my/alerts-and-notifications
2. Log in with your eBay developer account
3. Find "Marketplace Account Deletion/Closure Notifications"
4. Click **"Subscribe"** or **"Edit Subscription"**

#### Fill in the form:

**Alert Email**:
```
your-email@example.com
```
(Where eBay will send alerts about failed deliveries)

**Endpoint URL**:
```
https://compr.co/api/ebay/marketplace-account-deletion
```

**Verification Token**:
```
<paste the token you generated in step 1>
```

5. Click **"Verify and Subscribe"**

---

### 3. Endpoint Validation

eBay will immediately send a challenge code to validate your endpoint:

```
GET https://compr.co/api/ebay/marketplace-account-deletion?challenge_code=abc123
```

Your endpoint will automatically respond with:
```json
{
  "challengeResponse": "52161ff4651cb71888801b47bae62f44d7f6d0aab17e70d00f64fc84368ca38f"
}
```

✅ If validation succeeds, you'll see "Subscription Active" in the portal.

---

## How It Works

### Notification Flow

```
[eBay User requests account deletion]
          ↓
[eBay sends POST notification to your endpoint]
          ↓
[Your endpoint receives notification with user ID/username]
          ↓
[Search platform_connections for matching eBay connection]
          ↓
[Delete the connection(s) from database]
          ↓
[Log deletion for audit purposes]
          ↓
[Respond with HTTP 200 OK]
          ↓
[eBay marks notification as acknowledged]
```

---

## Notification Payload

eBay sends a POST request with this JSON:

```json
{
  "metadata": {
    "topic": "MARKETPLACE_ACCOUNT_DELETION",
    "schemaVersion": "1.0",
    "deprecated": false
  },
  "notification": {
    "notificationId": "unique-id-here",
    "eventDate": "2025-01-15T20:43:59.462Z",
    "publishDate": "2025-01-15T20:43:59.679Z",
    "publishAttemptCount": 1,
    "data": {
      "username": "ebay_seller_123",
      "userId": "ma8vp1jySJC",
      "eiasToken": "encrypted_token_here"
    }
  }
}
```

---

## What Gets Deleted

When a deletion notification is received:

1. **Search** `platform_connections` table for:
   - `platform = 'ebay'`
   - `platform_username = <username from notification>`
   - OR `platform_user_id = <userId from notification>`

2. **Delete** matching records (removes access tokens, refresh tokens, user info)

3. **Log** the deletion for audit compliance

**Note**: We only delete the eBay connection data. We do NOT delete the user's Compr account or their listings. The eBay user may still have a Compr account and can reconnect if they create a new eBay account.

---

## Monitoring & Troubleshooting

### Check Subscription Status

1. Go to https://developer.ebay.com/my/alerts-and-notifications
2. Look for "Marketplace Account Deletion/Closure Notifications"
3. Status should show: **"Active"** ✅

### Failed Deliveries

If your endpoint doesn't respond with HTTP 200:
- eBay will **retry** the notification
- After **24 hours** of failures, your endpoint is marked down
- You'll receive an **alert email**
- You have **30 days** to fix the issue or you'll be marked non-compliant

### View Logs in Vercel

Check Vercel logs for:
```
Received eBay marketplace account deletion notification
Processing deletion for eBay user: { username, userId }
Successfully deleted X eBay connection(s)
```

### Test the Endpoint

You can test the validation endpoint:

```bash
curl "https://compr.co/api/ebay/marketplace-account-deletion?challenge_code=test123"
```

Should return:
```json
{
  "challengeResponse": "<hash>"
}
```

---

## Opting Out (NOT Recommended)

If you're **NOT storing any eBay user data** (which we are), you can opt out:

1. Go to eBay Developer Portal → Alerts and Notifications
2. Click "Opt Out" instead of "Subscribe"
3. Confirm you're not persisting any eBay data

**WARNING**: Since Compr stores:
- eBay access tokens
- eBay refresh tokens
- eBay usernames
- eBay user IDs
- Platform connection data

**You MUST subscribe** - opting out would violate eBay's terms and GDPR.

---

## Compliance Checklist

- [x] Endpoint created at `/api/ebay/marketplace-account-deletion`
- [ ] `EBAY_VERIFICATION_TOKEN` added to environment variables
- [ ] `EBAY_DELETION_ENDPOINT` added to environment variables
- [ ] Environment variables deployed to Vercel
- [ ] Subscribed in eBay Developer Portal
- [ ] Endpoint validation successful (status: Active)
- [ ] Tested with challenge code
- [ ] Monitoring enabled for failed deliveries

---

## Resources

- [eBay Marketplace Account Deletion Docs](https://developer.ebay.com/marketplace-account-deletion)
- [GDPR Compliance Guide](https://developer.ebay.com/api-docs/static/gdpr.html)
- [Alerts and Notifications Portal](https://developer.ebay.com/my/alerts-and-notifications)
