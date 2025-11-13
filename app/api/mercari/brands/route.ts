import { NextRequest, NextResponse } from 'next/server';
import masterData from '@/Mercari-Categories.json';

interface MercariBrand {
  id: number;
  name: string;
}

/**
 * GET /api/mercari/brands
 * Search and retrieve Mercari brands
 * Query params:
 *   - search: optional search term to filter brands
 *   - limit: max results to return (default 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search')?.toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '100');

    const brands: MercariBrand[] = (masterData as any).data.master.itemBrands;

    let results = brands;

    // Filter by search term if provided
    if (searchTerm) {
      results = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort alphabetically
    results.sort((a, b) => a.name.localeCompare(b.name));

    // Limit results
    results = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      brands: results,
      total: results.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch Mercari brands:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
