import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.EBAY_CLIENT_ID;
    const ruName = process.env.EBAY_RU_NAME;

    if (!clientId || !ruName) {
      return NextResponse.json(
        { error: 'eBay credentials not configured - missing client ID or RuName' },
        { status: 500 }
      );
    }

    // Get user ID from auth header
    const authHeader = request.headers.get('authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { authorization: authHeader } : {},
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
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

    // Generate state parameter with user ID encoded (for CSRF protection + user identification)
    // Format: {userId}.{randomString}
    const randomString = Math.random().toString(36).substring(7);
    const state = `${user.id}.${randomString}`;

    // Build eBay OAuth authorization URL
    // Note: eBay requires the RuName (not the actual URL) in the redirect_uri parameter
    const authUrl = new URL(`https://${authDomain}/oauth2/authorize`);
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', ruName);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', state);

    // Log the generated URL for debugging
    console.log('eBay OAuth URL:', authUrl.toString());
    console.log('RuName used:', ruName);
    console.log('Client ID:', clientId);
    console.log('User ID:', user.id);
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
