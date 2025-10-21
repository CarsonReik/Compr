// eBay Token Refresh Utility
// Handles automatic refresh of expired eBay OAuth tokens

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface EbayTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Refresh an expired eBay access token using the refresh token
 */
async function refreshEbayToken(refreshToken: string): Promise<EbayTokens> {
  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;
  const isSandbox = process.env.EBAY_ENVIRONMENT?.toLowerCase() === 'sandbox';

  const tokenEndpoint = isSandbox
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('eBay token refresh error:', errorData);
    throw new Error(`Failed to refresh eBay token: ${errorData.error_description || 'Unknown error'}`);
  }

  return await response.json();
}

/**
 * Get a valid eBay access token for a user
 * Automatically refreshes the token if it's expired or about to expire
 *
 * @param userId - The user's UUID
 * @returns Valid access token
 */
export async function getValidEbayToken(userId: string): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get the current connection from database
  const { data: connection, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_active', true)
    .single();

  if (error || !connection) {
    throw new Error('eBay connection not found. Please reconnect your eBay account.');
  }

  // Check if token is expired or will expire in the next 5 minutes
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt > fiveMinutesFromNow) {
    // Token is still valid
    return connection.access_token;
  }

  // Token is expired or about to expire - refresh it
  console.log(`Refreshing eBay token for user ${userId}`);

  try {
    const newTokens = await refreshEbayToken(connection.refresh_token);

    // Calculate new expiration
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

    // Update the database with new tokens
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('platform', 'ebay');

    if (updateError) {
      console.error('Failed to update tokens in database:', updateError);
      throw new Error('Failed to save refreshed tokens');
    }

    console.log(`Successfully refreshed eBay token for user ${userId}`);
    return newTokens.access_token;

  } catch (error) {
    console.error('Token refresh failed:', error);

    // Mark the connection as inactive if refresh fails
    await supabase
      .from('platform_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('platform', 'ebay');

    throw new Error('Failed to refresh eBay token. Please reconnect your eBay account.');
  }
}

/**
 * Check if a user's eBay token needs refreshing soon
 * Useful for proactive background refresh
 */
export async function checkTokenExpiration(userId: string): Promise<{
  needsRefresh: boolean;
  expiresAt: Date | null;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('token_expires_at')
    .eq('user_id', userId)
    .eq('platform', 'ebay')
    .eq('is_active', true)
    .single();

  if (!connection) {
    return { needsRefresh: true, expiresAt: null };
  }

  const expiresAt = new Date(connection.token_expires_at);
  const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);

  return {
    needsRefresh: expiresAt <= thirtyMinutesFromNow,
    expiresAt,
  };
}
