import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/access-tokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const result = await validateToken(token);

    return NextResponse.json({
      valid: result.valid,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
