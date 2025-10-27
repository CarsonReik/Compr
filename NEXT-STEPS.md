# Next Steps: Chrome Extension Testing & Integration

## 🎯 Current Status

The **Chrome Extension for Poshmark crosslisting** is fully built and ready for testing. All core functionality is complete:

✅ Extension built with TypeScript, React, and Webpack
✅ Background service worker with HTTP polling
✅ Poshmark content script with full automation
✅ Backend API endpoints for communication
✅ Sale detection framework (skeleton)
✅ Popup UI with settings and status

---

## 📋 Testing Checklist (Do This First)

### 1. Database Migration

**Run this SQL in Supabase:**

```sql
-- Add extension tracking fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS extension_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extension_last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS extension_version TEXT;

-- Add index for finding active extension users
CREATE INDEX IF NOT EXISTS idx_users_extension_last_seen
  ON users(extension_last_seen)
  WHERE extension_connected = TRUE;
```

**File location:** `extension-schema-update.sql`

### 2. Build the Extension

```bash
cd compr-extension
npm install
npm run build
```

This will create a `build/` directory with the compiled extension.

### 3. Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the `compr-extension/build` directory
6. Extension should appear in your extensions list

### 4. Configure Extension (Temporary Auth)

Since we haven't built the auth flow yet, manually set credentials:

1. Click the extension icon in Chrome toolbar
2. Right-click the popup → **"Inspect"**
3. In the DevTools console, run:

```javascript
// Replace with your actual user ID from Supabase
chrome.storage.local.set({
  userId: 'YOUR_USER_ID_HERE',
  authToken: 'temp-token-123',
});
```

4. Close and reopen the popup
5. You should see "Connected" status

### 5. Test Poshmark Login Detection

1. Open a new tab and go to `https://poshmark.com`
2. Log in to your Poshmark account
3. Go back to extension popup
4. Click **"Check"** button next to Poshmark
5. Should show "✓ Connected"

### 6. Start Next.js Dev Server

```bash
npm run dev
```

Make sure the server is running on `http://localhost:3000`

### 7. Test Crosslisting

**Option A: Via Compr Dashboard (requires UI update)**
- Not yet implemented (see remaining tasks below)

**Option B: Direct API Test**

Use Postman or curl:

```bash
curl -X POST http://localhost:3000/api/listings/crosslist-poshmark \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "listingId": "EXISTING_LISTING_ID"
  }'
```

**What should happen:**
1. API creates a crosslisting job
2. Extension polls and picks up the job within 5 seconds
3. Extension opens Poshmark in background tab
4. Form fills out automatically
5. Listing submits
6. Extension reports success back
7. Tab closes

**Debug:**
- Check extension background worker: `chrome://extensions/` → "Inspect views: service worker"
- Watch console for polling and job processing
- Check Supabase `crosslisting_jobs` table for job status

---

## 🛠️ Remaining Implementation Tasks

### Task 1: Update Listing Page UI (~30 min)

**File:** `app/seller/listings/[id]/page.tsx`

**Current state:**
- Uses old VPS endpoint: `/api/listings/publish-to-poshmark`
- Shows Poshmark verification alert

**What to do:**
1. Replace "Post to Poshmark" button logic to call `/api/listings/crosslist-poshmark`
2. Add extension status check before posting
3. Show "Install Extension" prompt if not connected
4. Remove verification alert for Poshmark
5. Update success/error messaging

**Example code:**

```typescript
// Check extension status
const checkExtensionStatus = async () => {
  const res = await fetch('/api/extension/status');
  const data = await res.json();
  return data.connected;
};

// Post to Poshmark via extension
const postToPoshmark = async () => {
  const connected = await checkExtensionStatus();

  if (!connected) {
    alert('Please install and activate the Compr Chrome Extension');
    window.open('/extension-install', '_blank');
    return;
  }

  const res = await fetch('/api/listings/crosslist-poshmark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listingId,
      userId: user.id,
    }),
  });

  if (res.ok) {
    alert('Crosslisting job created! Check back in 30 seconds.');
  }
};
```

### Task 2: Add Extension Status Endpoint (~15 min)

**Create:** `app/api/extension/status/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return Response.json({ connected: false });
  }

  const { data: user } = await supabase
    .from('users')
    .select('extension_connected, extension_last_seen')
    .eq('id', userId)
    .single();

  if (!user?.extension_connected) {
    return Response.json({ connected: false });
  }

  // Check if seen within last 2 minutes
  const lastSeen = new Date(user.extension_last_seen);
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  return Response.json({
    connected: lastSeen > twoMinutesAgo,
    lastSeen: user.extension_last_seen,
  });
}
```

### Task 3: Remove VPS Poshmark Code (~20 min)

**Delete these files:**
- `automation-worker/src/workers/poshmark-worker.ts`
- `app/api/listings/publish-to-poshmark/route.ts`
- `components/PoshmarkVerificationAlert.tsx`

**Update files:**
- `app/seller/connections/page.tsx` - Remove Poshmark credentials form
- `lib/queue-client.ts` - Update to exclude Poshmark from VPS platforms

### Task 4: Add Extension Status Badge (~15 min)

**File:** `app/seller/page.tsx` (dashboard)

Add extension status indicator:

```tsx
const ExtensionStatus = () => {
  const [status, setStatus] = useState({ connected: false });

  useEffect(() => {
    fetch(`/api/extension/status?userId=${user.id}`)
      .then(res => res.json())
      .then(setStatus);
  }, []);

  return (
    <div className="extension-status">
      {status.connected ? (
        <span className="badge badge-success">
          ✓ Extension Connected
        </span>
      ) : (
        <span className="badge badge-warning">
          Extension Offline
          <a href="/extension-install">Install</a>
        </span>
      )}
    </div>
  );
};
```

### Task 5: Create Extension Install Page (~30 min)

**Create:** `app/extension-install/page.tsx`

Landing page explaining:
- Why extension is needed
- Installation instructions
- Screenshots of process
- Link to Chrome Web Store (or load unpacked instructions for now)

---

## 🐛 Troubleshooting Guide

### Extension Not Polling

**Symptoms:** Background worker console shows no polling activity

**Solutions:**
1. Check if `userId` and `authToken` are set in storage:
   ```javascript
   chrome.storage.local.get(['userId', 'authToken'], console.log)
   ```
2. Check background worker console for errors
3. Verify Next.js server is running
4. Check CORS settings if testing from different domain

### Content Script Not Injecting

**Symptoms:** Poshmark tab opens but nothing happens

**Solutions:**
1. Check manifest.json content_scripts matches Poshmark URL
2. Ensure page is fully loaded before sending message
3. Check for CSP (Content Security Policy) errors in console
4. Verify content script is included in build output

### Images Not Uploading

**Symptoms:** Form fills but photos don't upload

**Solutions:**
1. Check image URLs are publicly accessible
2. Verify CORS allows extension to fetch images
3. Check Poshmark's file input selector hasn't changed
4. Look for errors in content script console

### Job Stuck in "Queued" Status

**Symptoms:** Job created but never completes

**Solutions:**
1. Check if extension is polling (background worker console)
2. Verify job was created with correct platform ('poshmark')
3. Check if user is logged into Poshmark
4. Look for errors during form filling

### "Extension Not Connected" Error

**Symptoms:** Cannot create crosslisting jobs

**Solutions:**
1. Check `extension_last_seen` timestamp in users table
2. Ensure background worker is running (go to chrome://extensions/)
3. Verify polling endpoint returns 200 OK
4. Check if extension was recently reloaded

---

## 📊 Testing Scenarios

### Scenario 1: Happy Path

1. User has extension installed and connected
2. User is logged into Poshmark
3. User creates listing with all fields filled
4. User clicks "Post to Poshmark"
5. **Expected:** Listing appears on Poshmark within 30 seconds

### Scenario 2: Extension Offline

1. Extension is not running
2. User tries to post to Poshmark
3. **Expected:** Error message "Extension not connected"

### Scenario 3: Not Logged Into Poshmark

1. Extension running but user not logged into Poshmark
2. User tries to post
3. **Expected:** Tab opens to Poshmark login page, then error

### Scenario 4: Partial Data

1. Listing missing optional fields (brand, size, color)
2. User posts to Poshmark
3. **Expected:** Listing created with available data, optional fields left blank

### Scenario 5: Network Error

1. Internet connection drops during upload
2. **Expected:** Job marked as failed with error message, can retry

---

## 🚀 Production Deployment Checklist

### Before Going Live

- [ ] Test with multiple real listings
- [ ] Test with different image counts (1-16 photos)
- [ ] Test with various product types (clothing, shoes, accessories)
- [ ] Verify error handling (network errors, Poshmark changes)
- [ ] Test sale detection (if implemented)
- [ ] Load test: multiple users, multiple listings
- [ ] Cross-browser testing (Chrome only for now)

### Database

- [ ] Run migration on production Supabase
- [ ] Verify indexes are created
- [ ] Test with production data

### Extension

- [ ] Update manifest.json to remove localhost from host_permissions
- [ ] Update http-client.ts to use production URL
- [ ] Build production version: `npm run build`
- [ ] Test with production API

### Backend

- [ ] Deploy API endpoints to production
- [ ] Test polling endpoint performance
- [ ] Monitor job processing times
- [ ] Set up error tracking (Sentry, etc.)

### Chrome Web Store (Future)

- [ ] Create icon assets (16x16, 48x48, 128x128, 256x256)
- [ ] Write privacy policy
- [ ] Create promotional images (1400x560, 440x280)
- [ ] Record demo video
- [ ] Submit for review
- [ ] Wait 1-2 weeks for approval

---

## 📁 Important File Locations

### Extension Core Files

```
compr-extension/
├── background/
│   ├── service-worker.ts          # Main background logic
│   └── http-client.ts             # Backend communication
├── content-scripts/poshmark/
│   └── listing-creator.ts         # Poshmark automation
├── popup/
│   └── popup.tsx                  # Extension UI
├── manifest.json                  # Extension config
└── README.md                      # Developer docs
```

### Backend API Files

```
app/api/
├── extension/
│   ├── connect/route.ts           # Initial connection
│   ├── poll/route.ts              # Job polling
│   └── callback/route.ts          # Result reporting
└── listings/
    └── crosslist-poshmark/route.ts # New crosslisting endpoint
```

### Database Migration

```
extension-schema-update.sql        # Run in Supabase
```

### Documentation

```
CHROME-EXTENSION-IMPLEMENTATION.md # Full implementation details
NEXT-STEPS.md                      # This file
compr-extension/README.md          # Extension developer guide
```

---

## 💡 Quick Commands Reference

### Build Extension
```bash
cd compr-extension
npm install        # First time only
npm run build      # Production build
npm run dev        # Development with watch
```

### Load Extension in Chrome
1. `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select `compr-extension/build`

### Debug Extension
- Background worker: `chrome://extensions/` → "Inspect views: service worker"
- Popup: Right-click extension icon → "Inspect popup"
- Content script: Open DevTools on Poshmark page

### Test API Endpoint
```bash
# Check if extension is connected
curl "http://localhost:3000/api/extension/poll?userId=YOUR_ID&authToken=TOKEN"

# Create crosslisting job
curl -X POST http://localhost:3000/api/listings/crosslist-poshmark \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_ID","listingId":"LISTING_ID"}'
```

### Check Extension Storage
```javascript
// In extension popup or background worker console
chrome.storage.local.get(null, console.log)
```

---

## 🎯 Success Criteria

**The extension is working correctly when:**

1. ✅ Extension loads without errors
2. ✅ Polls backend every 5 seconds
3. ✅ Picks up crosslisting jobs within 5 seconds
4. ✅ Opens Poshmark in background tab
5. ✅ Uploads all images (up to 16)
6. ✅ Fills all form fields correctly
7. ✅ Submits listing successfully
8. ✅ Extracts listing ID and URL
9. ✅ Reports result back to backend
10. ✅ Creates `platform_listings` record
11. ✅ Updates job status to "completed"
12. ✅ Listing visible on Poshmark

---

## 📞 Need Help?

### Common Issues

**"Cannot find module" error during build:**
- Run `npm install` in `compr-extension/` directory

**Extension won't load:**
- Check manifest.json is valid JSON
- Ensure all paths are correct
- Check Chrome DevTools for errors

**Polling not working:**
- Verify userId/authToken are set
- Check Next.js server is running
- Look for errors in background worker console

**Content script not running:**
- Make sure you're on poshmark.com
- Check manifest.json content_scripts configuration
- Reload extension after code changes

### Debug Logs

All extension code uses the logger utility:
```javascript
import { logger } from '../lib/messaging';
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning');
logger.error('Error', errorObject);
```

Logs appear in:
- Background worker console (background scripts)
- Page console (content scripts)
- Popup console (popup UI)

---

## ✨ Next Phase Features (Future)

### Mercari Support
- Implement `content-scripts/mercari/listing-creator.ts`
- Add Mercari-specific selectors and field mappings
- Test with real Mercari account

### Depop Support
- Implement `content-scripts/depop/listing-creator.ts`
- Add Depop-specific selectors and field mappings
- Test with real Depop account

### Sale Detection
- Scrape Poshmark sales page for sold items
- Match sold items with crosslisted items
- Trigger auto-deletion on other platforms
- Send notifications to user

### Auto-Deletion
- Implement deletion logic for each platform
- Handle "sold" vs "deleted" status
- Sync with backend database

### Advanced Features
- Bulk crosslisting (select multiple listings)
- Scheduled posting (post at specific times)
- Price synchronization across platforms
- Inventory management

---

**Ready to test? Start with the Testing Checklist above!** 🚀

**Current Status:** Core extension complete, ready for integration testing
**Estimated Time to Production:** 2-3 hours (remaining UI tasks + testing)
