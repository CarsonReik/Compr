# Compr Chrome Extension

Chrome extension for automating crosslisting to Poshmark, Mercari, and Depop.

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Extension

**Development mode (with watch):**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `compr-extension/build` directory
5. The extension should now appear in your extensions list

### 4. Testing

1. Make sure the Compr web app is running (`npm run dev` in the main project)
2. Open the extension popup (click the extension icon)
3. The extension will automatically connect to `localhost:3000` in development mode
4. Log in to Poshmark, Mercari, and Depop in separate tabs
5. Go to Compr dashboard and try creating a listing with Poshmark selected

## Architecture

- **background/service-worker.ts** - Main background script, coordinates all operations
- **background/http-client.ts** - Polls backend for new crosslisting jobs
- **content-scripts/poshmark/listing-creator.ts** - Automates Poshmark listing creation
- **popup/** - Extension popup UI

## How It Works

1. User creates a listing on Compr dashboard
2. Backend creates a `crosslisting_job` record for Poshmark
3. Extension polls `/api/extension/poll` every 5 seconds
4. Extension receives new job and opens Poshmark.com in background tab
5. Content script fills out the listing form automatically
6. Extension reports result back to `/api/extension/callback`
7. Backend updates `platform_listings` table

## Environment

The extension automatically detects environment:
- Development: connects to `http://localhost:3000`
- Production: connects to `https://compr.co`

## Debugging

- Open Chrome DevTools for the extension:
  - Background script: Go to `chrome://extensions/` → Click "Inspect views: service worker"
  - Popup: Right-click extension icon → "Inspect popup"
  - Content script: Open DevTools on Poshmark.com page

- Check console logs for debugging information

## Building for Production

1. Update `manifest.json` version number
2. Run `npm run build`
3. Create a ZIP file of the `build` directory
4. Submit to Chrome Web Store
