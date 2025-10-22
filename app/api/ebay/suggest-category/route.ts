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
    let accessToken: string;
    try {
      accessToken = await getValidEbayToken(userId);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to get eBay access token. Please reconnect your eBay account.',
          needsConnection: true
        },
        { status: 400 }
      );
    }

    // Get category suggestions
    console.log(`Getting category suggestions for title: "${title}"`);
    const result = await getCategorySuggestion(title, accessToken);
    console.log('Category suggestion result:', result);

    if (!result.success) {
      console.error('Category suggestion failed:', result.error);
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
