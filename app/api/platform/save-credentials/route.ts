import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptCredentials } from '@/lib/encryption';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const { userId, platform, username, password } = await request.json();

    if (!userId || !platform || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ['poshmark', 'mercari', 'depop'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    // Encrypt credentials
    let encryptedCredentials: string;
    try {
      encryptedCredentials = encryptCredentials(username, password);
    } catch (error) {
      console.error('Encryption error:', error);
      return NextResponse.json(
        { error: 'Failed to encrypt credentials' },
        { status: 500 }
      );
    }

    // Save to database
    const { error } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: userId,
        platform,
        access_token: '', // Empty for credential-based platforms
        encrypted_credentials: encryptedCredentials,
        platform_username: username,
        is_active: true,
      }, {
        onConflict: 'user_id,platform',
      });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save credentials to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully',
    });
  } catch (error) {
    console.error('Error in save-credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
