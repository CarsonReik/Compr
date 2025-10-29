# Chrome Web Store Publication Guide

## Overview
This guide covers everything needed to publish the Compr Chrome Extension to the Chrome Web Store.

---

## Pre-Publication Checklist

### 1. Create Extension Icons ⚠️ REQUIRED
You need to create icons in 4 sizes. These should be the Compr logo with good visibility at small sizes.

**Required sizes:**
- `icons/icon16.png` - 16x16px (toolbar icon)
- `icons/icon32.png` - 32x32px (Windows icon)
- `icons/icon48.png` - 48x48px (extension management page)
- `icons/icon128.png` - 128x128px (Chrome Web Store listing)

**Design tips:**
- Use a simple, recognizable design (your Compr "C" logo)
- Ensure it looks good on both light and dark backgrounds
- Use transparent background PNG
- Keep it centered with padding

**Tools to create icons:**
- Figma/Canva: Design once, export at different sizes
- Online tool: https://realfavicongenerator.net/
- Hire designer on Fiverr: $5-20 for professional icon set

### 2. Create Promotional Images ⚠️ REQUIRED

Chrome Web Store requires promotional images for your listing:

**Small promotional tile (Required)**
- Size: 440x280px
- Shows in Chrome Web Store search results
- Should show your extension in action or key benefit
- Format: PNG or JPEG

**Marquee promotional tile (Recommended)**
- Size: 1400x560px
- Shows in featured sections of the store
- More detailed showcase of features
- Format: PNG or JPEG

**Screenshots (Required - at least 1, max 5)**
- Size: 1280x800px or 640x400px
- Show your extension's UI and key features
- Take screenshots of:
  1. The popup UI showing connection status
  2. Extension icon in Chrome toolbar
  3. A successful crosslisting in action
  4. The connections page with extension connected
  5. Settings or configuration screen

**Tips:**
- Use https://www.screely.com/ to make beautiful browser mockups
- Show actual functionality, not just marketing fluff
- Add captions explaining what's happening

### 3. Write Store Listing Copy

**Name** (max 45 characters)
```
Compr - Crosslist to Poshmark & More
```

**Short Description** (max 132 characters)
```
Automate crosslisting to Poshmark, Mercari, and Depop. One-click posting with automatic form filling and image uploads.
```

**Detailed Description** (max 16,000 characters)
```
Compr Chrome Extension - The Ultimate Crosslisting Tool

Tired of manually copying and pasting listings across multiple marketplaces? Compr automates the entire process, saving you hours of tedious work.

✨ KEY FEATURES

• One-Click Crosslisting
  Create your listing once on Compr, then crosslist to Poshmark, Mercari, and Depop with a single click.

• Automatic Form Filling
  The extension automatically fills out all fields: title, description, price, category, brand, size, color, and condition.

• Smart Image Upload
  Uploads up to 16 images automatically with proper formatting for each platform.

• Browser Automation
  Uses your own browser session - secure and reliable. No credentials stored on external servers.

• Works in Background
  Crosslist while you browse or work on other tasks. The extension handles everything automatically.

🚀 HOW IT WORKS

1. Install the extension and connect your Compr account
2. Create a listing on Compr.co
3. Click "Post to Poshmark" (or other platforms)
4. Extension opens the platform in a background tab
5. Automatically fills out the entire form
6. Submits the listing and reports back
7. Your item is live in seconds!

🔒 SECURITY & PRIVACY

• Uses your existing browser sessions - no password storage
• All automation happens locally in your browser
• End-to-end encryption for sensitive data
• No access to your browsing history or personal data

📱 SUPPORTED PLATFORMS

✓ Poshmark - Full automation
✓ Mercari - Coming soon
✓ Depop - Coming soon

🎯 WHO IS THIS FOR?

• Resellers managing inventory across multiple platforms
• Small business owners crosslisting products
• Anyone tired of manual copy-paste work
• Sellers who want to maximize their reach

💎 PRICING

Free to use with Compr account. Premium features coming soon.

🛟 SUPPORT

Need help? Visit https://compr.co/help or email support@compr.co

---

By installing, you agree to our Terms of Service and Privacy Policy at https://compr.co/terms
```

### 4. Create Privacy Policy ⚠️ REQUIRED

Chrome Web Store requires a privacy policy URL. Create this page on your site:

**File to create:** `app/privacy/page.tsx`

**What to include:**
- What data you collect (user ID, extension status, listing data)
- How you use the data (crosslisting automation, analytics)
- What you DON'T collect (browsing history, passwords, personal data)
- How users can delete their data
- GDPR compliance information
- Contact email for privacy concerns

See template below.

### 5. Update Extension for Production

**Remove localhost references:**
```json
// In manifest.json, remove:
"http://localhost:3000/*"
```

Only keep production URLs in `host_permissions` and `externally_connectable`.

**Update constants:**
Check `compr-extension/lib/constants.ts` - ensure API_BASE_URL points to production.

---

## Publication Steps

### Step 1: Build the Extension

```bash
cd compr-extension
npm run build
```

This creates the `build/` directory with compiled extension.

### Step 2: Create ZIP File

```bash
# From compr-extension directory
cd build
zip -r ../compr-extension-v1.0.0.zip .
cd ..
```

Or manually:
1. Open the `build/` folder
2. Select all files inside (don't include the build folder itself!)
3. Right-click → Compress → Create ZIP

**Important:** The manifest.json should be at the ROOT of the ZIP, not in a subfolder.

### Step 3: Create Chrome Web Store Developer Account

1. Go to https://chrome.google.com/webstore/devconsole/
2. Sign in with your Google account
3. Pay one-time $5 developer registration fee
4. Fill out developer information

### Step 4: Upload Extension

1. Click "New Item"
2. Upload your ZIP file
3. Fill out store listing:
   - Upload icons
   - Upload promotional images
   - Upload screenshots
   - Add description
   - Select category: "Shopping"
   - Add privacy policy URL: `https://compr.co/privacy`
4. Select "English" as primary language
5. Add website: `https://compr.co`
6. Add support email: `support@compr.co`

### Step 5: Complete Distribution Settings

**Visibility:**
- ✓ Public (recommended for growth)
- ❌ Unlisted (only if you want to control distribution)

**Regions:**
- Select "All regions" or specific countries

**Pricing:**
- Free

### Step 6: Submit for Review

1. Click "Submit for Review"
2. Review takes 1-7 business days (usually 1-3 days)
3. You'll receive email updates on review status

### Step 7: Update Extension Install Page

Once approved, update `app/extension-install/page.tsx`:

Replace:
```tsx
href="https://chrome.google.com/webstore/detail/compr-extension/YOUR_EXTENSION_ID"
```

With your actual Chrome Web Store URL (you'll get this after approval).

---

## Common Review Issues & Solutions

### Issue 1: Permissions Too Broad
**Problem:** "Your extension requests too many permissions"
**Solution:** Only request necessary permissions. We use:
- `tabs` - Required for opening Poshmark tabs
- `storage` - Required for storing user auth
- `alarms` - Required for periodic checks
- `notifications` - For sale alerts
- `webRequest` - For monitoring tab status

All are justified. Document why in review notes.

### Issue 2: Host Permissions
**Problem:** "Why do you need access to these sites?"
**Solution:** Add this to review notes:
```
Host permissions are required for:
- poshmark.com: Automated listing creation
- mercari.com: Automated listing creation
- depop.com: Automated listing creation
- compr.co: Communication with our backend API

The extension only interacts with these specific sites for its core functionality.
```

### Issue 3: Privacy Policy
**Problem:** "Privacy policy is incomplete or missing"
**Solution:** Ensure your privacy policy at `/privacy` covers:
- What data is collected
- How it's used
- How users can delete data
- Third-party services used
- GDPR/CCPA compliance

### Issue 4: Single Purpose
**Problem:** "Extension does too many things"
**Solution:** Emphasize single purpose in description:
```
Single Purpose: Automate crosslisting to resale marketplaces
All features support this core purpose:
- Form filling: Enters listing data
- Image upload: Adds product photos
- Browser automation: Submits listings
```

---

## After Approval

### Update Your Website

1. Add extension install link to navigation
2. Update connections page with actual Chrome Web Store link
3. Add badge: "Available on Chrome Web Store"
4. Create blog post announcing the extension

### Monitor Reviews

- Respond to user reviews within 24 hours
- Fix reported bugs quickly
- Update extension based on feedback

### Analytics

Track in Supabase:
- Extension installs (via first connection)
- Active users (via extension_last_seen)
- Crosslisting success rate
- Platform usage (Poshmark vs Mercari vs Depop)

---

## Updating the Extension

### Version Update Process

1. Update `manifest.json` version (e.g., 1.0.0 → 1.0.1)
2. Build the extension: `npm run build`
3. Create new ZIP file
4. Upload to Chrome Web Store Developer Console
5. Submit for review (faster than initial review, usually 1-2 days)

### Chrome Web Store Review

Updates go through review again. Plan accordingly:
- Bug fixes: Can be urgent, but still need 1-2 days
- New features: Plan for 2-3 day review time
- Emergency fixes: Chrome has expedited review process for critical security issues

---

## Resources

- Chrome Web Store Developer Policies: https://developer.chrome.com/docs/webstore/program-policies/
- Extension Best Practices: https://developer.chrome.com/docs/extensions/mv3/
- Chrome Web Store Branding Guidelines: https://developer.chrome.com/docs/webstore/branding/
- Privacy Policy Generator: https://www.privacypolicygenerator.info/

---

## Checklist Before Submission

- [ ] Icons created (16, 32, 48, 128px)
- [ ] Promotional images created (440x280, 1400x560)
- [ ] 1-5 screenshots prepared
- [ ] Store listing copy written
- [ ] Privacy policy published at /privacy
- [ ] Terms of service published at /terms
- [ ] Localhost removed from manifest
- [ ] Extension built with production URLs
- [ ] ZIP file created correctly (manifest.json at root)
- [ ] Developer account created ($5 fee paid)
- [ ] Support email setup (support@compr.co)
- [ ] Website live and functional

---

## Timeline

- **Day 0:** Submit extension
- **Day 1-3:** Chrome team reviews extension
- **Day 3:** Extension goes live (if approved)
- **Day 3+:** Monitor reviews, fix bugs, iterate

Total time from submission to live: **1-7 days**

---

## Need Help?

If Chrome rejects your extension:
1. Read the rejection reason carefully
2. Fix the specific issues mentioned
3. Resubmit with notes explaining changes
4. Usually approved on second try

Google provides detailed feedback on why extensions are rejected, making it easier to fix issues and resubmit.

Good luck with your Chrome Web Store submission! 🚀
