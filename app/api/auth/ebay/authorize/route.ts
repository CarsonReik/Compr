import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientId = process.env.EBAY_CLIENT_ID;
    const redirectUri = process.env.EBAY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'eBay credentials not configured' },
        { status: 500 }
      );
    }

    // eBay OAuth scopes for seller APIs
    // https://developer.ebay.com/api-docs/static/oauth-scopes.html
    const scopes = [
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
    ].join(' ');

    // Determine environment (sandbox or production)
    const isSandbox = process.env.EBAY_ENVIRONMENT?.toLowerCase() === 'sandbox';
    const authDomain = isSandbox
      ? 'auth.sandbox.ebay.com'
      : 'auth.ebay.com';

    // Generate a random state parameter for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Build eBay OAuth authorization URL
    const authUrl = new URL(`https://${authDomain}/oauth2/authorize`);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', state);

    // Log the generated URL for debugging
    console.log('eBay OAuth URL:', authUrl.toString());
    console.log('Redirect URI used:', redirectUri);
    console.log('Client ID:', clientId);
    console.log('Environment:', isSandbox ? 'sandbox' : 'production');

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
    });
  } catch (error) {
    console.error('eBay authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
