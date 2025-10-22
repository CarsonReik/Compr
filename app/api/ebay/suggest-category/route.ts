import { NextRequest, NextResponse } from 'next/server';
import { searchCategories } from '@/lib/ebay-common-categories';

export const runtime = 'nodejs';

/**
 * POST /api/ebay/suggest-category
 * Gets eBay category suggestions based on listing title
 * Uses a curated list of common categories since the eBay Category Suggestion API
 * requires special permissions not available to standard OAuth apps
 */
export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Missing title' },
        { status: 400 }
      );
    }

    // Search common categories based on title keywords
    console.log(`Searching categories for title: "${title}"`);
    const suggestions = searchCategories(title);
    console.log(`Found ${suggestions.length} category matches`);

    if (suggestions.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        message: 'No category matches found. Please select "Other" and enter a category ID manually.',
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
    });
  } catch (error) {
    console.error('Error in suggest-category API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
