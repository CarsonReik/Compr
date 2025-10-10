import { NextRequest, NextResponse } from 'next/server';
import { createAccessToken } from '@/lib/access-tokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // TODO: Verify the session with Stripe to ensure payment was successful
    // For now, we'll trust that if they have a sessionId, payment succeeded

    // Generate access token
    const token = await createAccessToken(sessionId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate access token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
