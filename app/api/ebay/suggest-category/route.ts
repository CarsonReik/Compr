import { NextRequest, NextResponse } from 'next/server';
import { getCategorySuggestion } from '@/lib/ebay-inventory-api';
import { getValidEbayToken } from '@/lib/ebay-token-refresh';

export const runtime = 'nodejs';

/**
 * POST /api/ebay/suggest-category
 * Gets eBay category suggestions based on listing title
 */
export async function POST(request: NextRequest) {
  try {
    const { title, userId } = await request.json();

    if (!title || !userId) {
      return NextResponse.json(
        { error: 'Missing title or userId' },
        { status: 400 }
      );
    }

    // Get user's eBay access token
    const tokenResult = await getValidEbayToken(userId);
    if (!tokenResult.success || !tokenResult.accessToken) {
      return NextResponse.json(
        { error: 'Failed to get eBay access token' },
        { status: 500 }
      );
    }

    // Get category suggestions
    const result = await getCategorySuggestion(title, tokenResult.accessToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to get category suggestions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions || [],
      defaultCategoryId: result.categoryId,
    });
  } catch (error) {
    console.error('Error in suggest-category API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
