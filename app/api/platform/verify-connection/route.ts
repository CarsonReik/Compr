/**
 * Verify platform connection (session-based, no credentials needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, platform } = await request.json();

    if (!userId || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, platform' },
        { status: 400 }
      );
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .single();

    if (existing) {
      // Update existing connection
      const { error } = await supabase
        .from('platform_connections')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new connection
      // For session-based platforms (Poshmark, Mercari, Depop), we store encrypted_credentials
      // The extension will provide credentials during the verification process
      const { error } = await supabase
        .from('platform_connections')
        .insert({
          user_id: userId,
          platform,
          is_active: true,
          encrypted_credentials: 'SESSION_BASED', // Placeholder - actual credentials handled by extension
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${platform} connected successfully`,
    });
  } catch (error) {
    console.error('Error verifying connection:', error);

    // Return more specific error message if available
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      {
        error: 'Failed to verify connection',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
