// eBay OAuth 2.0 Client Credentials Flow

const OAUTH_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SANDBOX_OAUTH_URL = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get OAuth access token using Client Credentials flow
 * Tokens are cached until they expire
 */
export async function getEbayAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const environment = process.env.EBAY_ENVIRONMENT || 'PRODUCTION';

  if (!clientId || !clientSecret) {
    throw new Error('eBay OAuth credentials not configured');
  }

  // Return cached token if still valid
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  // Determine OAuth URL based on environment
  const oauthUrl = environment === 'SANDBOX' ? SANDBOX_OAUTH_URL : OAUTH_TOKEN_URL;

  // Encode credentials for Basic Auth
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay OAuth error:', errorText);
      throw new Error(`OAuth failed: ${response.statusText}`);
    }

    const data: OAuthTokenResponse = await response.json();

    // Cache token (expires_in is in seconds, convert to milliseconds)
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    return cachedToken;
  } catch (error) {
    console.error('Error getting eBay OAuth token:', error);
    throw new Error('Failed to authenticate with eBay');
  }
}
