// Access token management using Supabase
import { supabase } from './supabase';

const SEARCHES_PER_TOKEN = 10;

/**
 * Generate a random access token
 */
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like I, O, 0, 1
  let token = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) token += '-';
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Create a new access token after successful payment
 */
export async function createAccessToken(stripeSessionId?: string): Promise<string> {
  const token = generateToken();

  const { error } = await supabase
    .from('access_tokens')
    .insert({
      token,
      remaining_searches: SEARCHES_PER_TOKEN,
      stripe_session_id: stripeSessionId,
    });

  if (error) {
    console.error('Error creating token:', error);
    throw new Error('Failed to create access token');
  }

  return token;
}

/**
 * Check if a token is valid and has searches remaining
 */
export async function validateToken(token: string): Promise<{ valid: boolean; remaining: number }> {
  const normalizedToken = token.toUpperCase().replace(/\s/g, '');

  const { data, error } = await supabase
    .from('access_tokens')
    .select('remaining_searches')
    .eq('token', normalizedToken)
    .single();

  if (error || !data) {
    return { valid: false, remaining: 0 };
  }

  return {
    valid: data.remaining_searches > 0,
    remaining: data.remaining_searches,
  };
}

/**
 * Consume one search from a token
 */
export async function consumeTokenSearch(token: string): Promise<{ success: boolean; remaining: number }> {
  const normalizedToken = token.toUpperCase().replace(/\s/g, '');

  // Get current token data
  const { data: tokenData, error: fetchError } = await supabase
    .from('access_tokens')
    .select('remaining_searches')
    .eq('token', normalizedToken)
    .single();

  if (fetchError || !tokenData || tokenData.remaining_searches <= 0) {
    return { success: false, remaining: 0 };
  }

  // Decrement the count and update last_used_at
  const newRemaining = tokenData.remaining_searches - 1;

  const { error: updateError } = await supabase
    .from('access_tokens')
    .update({
      remaining_searches: newRemaining,
      last_used_at: new Date().toISOString(),
    })
    .eq('token', normalizedToken);

  if (updateError) {
    console.error('Error updating token:', updateError);
    return { success: false, remaining: tokenData.remaining_searches };
  }

  return {
    success: true,
    remaining: newRemaining,
  };
}

/**
 * Get token info without using a search
 */
export async function getTokenInfo(token: string): Promise<{ remaining_searches: number } | null> {
  const normalizedToken = token.toUpperCase().replace(/\s/g, '');

  const { data, error } = await supabase
    .from('access_tokens')
    .select('remaining_searches')
    .eq('token', normalizedToken)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
