import { NextRequest, NextResponse } from 'next/server';
import { getCategorySuggestion } from '@/lib/ebay-inventory-api';
import { getValidEbayToken } from '@/lib/ebay-token-refresh';
import { searchCategories } from '@/lib/ebay-common-categories';

export const runtime = 'nodejs';

/**
 * POST /api/ebay/suggest-category
 * Gets eBay category suggestions based on listing title
 * Tries eBay Category Suggestion API first, falls back to common categories
 */
export async function POST(request: NextRequest) {
  try {
    const { title, userId } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Missing title' },
        { status: 400 }
      );
    }

    // Try eBay API if user is connected
    if (userId) {
      try {
        const accessToken = await getValidEbayToken(userId);
        console.log(`Trying eBay Category Suggestion API for: "${title}"`);

        const result = await getCategorySuggestion(title, accessToken);

        if (result.success && result.suggestions && result.suggestions.length > 0) {
          console.log(`eBay API returned ${result.suggestions.length} suggestions`);
          return NextResponse.json({
            success: true,
            suggestions: result.suggestions,
            defaultCategoryId: result.categoryId,
            source: 'ebay_api',
          });
        }
      } catch (error) {
        console.log('eBay API failed, falling back to common categories:', error);
      }
    }

    // Fallback to common categories search
    console.log(`Searching common categories for: "${title}"`);
    const suggestions = searchCategories(title);
    console.log(`Found ${suggestions.length} category matches in common categories`);

    if (suggestions.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'No category matches found. Try different keywords or enter a category ID manually.',
      });
    }

    // Format suggestions to match expected structure
    const formattedSuggestions = suggestions.map(cat => ({
      categoryId: cat.id,
      categoryName: cat.name,
      parent: cat.parent,
    }));

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      defaultCategoryId: formattedSuggestions[0].categoryId,
      source: 'common_categories',
    });
  } catch (error) {
    console.error('Error in suggest-category API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
