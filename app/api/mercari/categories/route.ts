import { NextRequest, NextResponse } from 'next/server';
import masterData from '@/Mercari-Categories.json';

interface MercariCategory {
  id: number;
  name: string;
  parentId: number;
}

/**
 * GET /api/mercari/categories
 * Search and retrieve Mercari categories
 * Query params:
 *   - search: optional search term to filter categories
 *   - limit: max results to return (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '100');

    const categories: MercariCategory[] = (masterData as any).data.master.itemCategories;

    let results = categories;

    // Filter by search term if provided
    if (searchTerm) {
      results = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm)
      );
    }

    // Limit results
    results = results.slice(0, limit);

    // Build category paths for display
    const resultsWithPaths = results.map(cat => {
      const path = buildCategoryPath(cat.id, categories);
      return {
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId,
        path,
      };
    });

    return NextResponse.json({
      success: true,
      categories: resultsWithPaths,
      total: results.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch Mercari categories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Build full category path (e.g., "Women > Tops > T-shirts")
 */
function buildCategoryPath(categoryId: number, allCategories: MercariCategory[]): string {
  const path: string[] = [];
  let currentId: number | null = categoryId;

  while (currentId && currentId !== 0) {
    const category = allCategories.find(c => c.id === currentId);
    if (!category) break;

    path.unshift(category.name);
    currentId = category.parentId;
  }

  return path.join(' > ');
}
