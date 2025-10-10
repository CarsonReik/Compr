import { NextRequest, NextResponse } from 'next/server';
import { fetchEbayActiveListings } from '@/lib/ebay-browse';
import { fetchMercariActiveListings } from '@/lib/mercari';
import { ComparisonResult } from '@/types';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { consumeTokenSearch, validateToken } from '@/lib/access-tokens';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const token = searchParams.get('token');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Check if user has a valid access token
    let usingToken = false;
    let tokenResult = null;
    let rateLimit = null;

    if (token) {
      const validation = await validateToken(token);
      if (validation.valid) {
        // Use a search from the token
        tokenResult = await consumeTokenSearch(token);
        if (tokenResult.success) {
          usingToken = true;
        }
      }
    }

    // If not using a token or token invalid, check rate limit
    if (!usingToken) {
      const clientIP = getClientIP(request);
      rateLimit = checkRateLimit(clientIP);

      if (!rateLimit.allowed) {
        const resetDate = new Date(rateLimit.resetAt);
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'You have used all 3 free searches for today. Get 10 more searches for just $1!',
            remaining: 0,
            resetAt: rateLimit.resetAt,
            resetAtFormatted: resetDate.toLocaleString(),
          },
          { status: 429 }
        );
      }
    }

    // Fetch eBay data (always)
    const ebayData = await fetchEbayActiveListings(query);

    // Try to fetch Mercari data, but don't fail if it errors
    let mercariData;
    try {
      mercariData = await fetchMercariActiveListings(query);
    } catch (error) {
      console.error('Mercari fetch failed, continuing with eBay only:', error);
      mercariData = undefined;
    }

    // Build comparison result
    const result: ComparisonResult = {
      query,
      ebay: ebayData,
      mercari: mercariData,
    };

    // Add rate limit or token info
    if (usingToken && tokenResult) {
      result.tokenInfo = {
        remaining: tokenResult.remaining,
      };
    } else if (rateLimit) {
      result.rateLimit = {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      };
    }

    // Determine recommendation based on net profit
    if (ebayData.itemCount > 0 && mercariData && mercariData.itemCount > 0) {
      if (ebayData.netProfit > mercariData.netProfit) {
        result.recommendation = {
          platform: 'ebay',
          profitDifference: Math.round((ebayData.netProfit - mercariData.netProfit) * 100) / 100,
        };
      } else if (mercariData.netProfit > ebayData.netProfit) {
        result.recommendation = {
          platform: 'mercari',
          profitDifference: Math.round((mercariData.netProfit - ebayData.netProfit) * 100) / 100,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pricing data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
