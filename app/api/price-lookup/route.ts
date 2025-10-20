import { NextRequest, NextResponse } from 'next/server';
import { fetchEbayActiveListings } from '@/lib/ebay-browse';
import { fetchMercariActiveListings } from '@/lib/mercari';
import { fetchPoshmarkActiveListings } from '@/lib/poshmark';
import { fetchDepopActiveListings } from '@/lib/depop';
import { fetchEtsyActiveListings } from '@/lib/etsy';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('Starting price lookup for:', query);

    // Fetch data from all platforms in parallel with individual error handling
    console.log('Calling eBay...');
    const ebayData = await fetchEbayActiveListings(query).catch(e => {
      console.error('eBay error:', e);
      return { itemCount: 0, average: 0, median: 0 };
    });
    console.log('eBay done:', ebayData.itemCount, 'items');

    console.log('Calling Mercari...');
    const mercariData = await fetchMercariActiveListings(query).catch(e => {
      console.error('Mercari error:', e);
      return { itemCount: 0, average: 0, median: 0 };
    });
    console.log('Mercari done:', mercariData.itemCount, 'items');

    console.log('Calling Poshmark...');
    const poshmarkData = await fetchPoshmarkActiveListings(query).catch(e => {
      console.error('Poshmark error:', e);
      return { itemCount: 0, average: 0, median: 0 };
    });
    console.log('Poshmark done:', poshmarkData.itemCount, 'items');

    console.log('Calling Depop...');
    const depopData = await fetchDepopActiveListings(query).catch(e => {
      console.error('Depop error:', e);
      return { itemCount: 0, average: 0, median: 0 };
    });
    console.log('Depop done:', depopData.itemCount, 'items');

    console.log('Calling Etsy...');
    const etsyData = await fetchEtsyActiveListings(query).catch(e => {
      console.error('Etsy error:', e);
      return { itemCount: 0, average: 0, median: 0 };
    });
    console.log('Etsy done:', etsyData.itemCount, 'items');

    console.log('All platform calls completed');

    // Build response with average prices
    const result: Record<string, any> = {
      query,
      prices: {},
    };

    // Check eBay
    if (ebayData && ebayData.itemCount > 0) {
      console.log('eBay returned:', ebayData.itemCount, 'items');
      result.prices.ebay = {
        average: ebayData.average,
        median: ebayData.median,
        count: ebayData.itemCount,
      };
    }

    // Check Mercari
    if (mercariData && mercariData.itemCount > 0) {
      console.log('Mercari returned:', mercariData.itemCount, 'items');
      result.prices.mercari = {
        average: mercariData.average,
        median: mercariData.median,
        count: mercariData.itemCount,
      };
    }

    // Check Poshmark
    if (poshmarkData && poshmarkData.itemCount > 0) {
      console.log('Poshmark returned:', poshmarkData.itemCount, 'items');
      result.prices.poshmark = {
        average: poshmarkData.average,
        median: poshmarkData.median,
        count: poshmarkData.itemCount,
      };
    }

    // Check Depop
    if (depopData && depopData.itemCount > 0) {
      console.log('Depop returned:', depopData.itemCount, 'items');
      result.prices.depop = {
        average: depopData.average,
        median: depopData.median,
        count: depopData.itemCount,
      };
    }

    // Check Etsy
    if (etsyData && etsyData.itemCount > 0) {
      console.log('Etsy returned:', etsyData.itemCount, 'items');
      result.prices.etsy = {
        average: etsyData.average,
        median: etsyData.median,
        count: etsyData.itemCount,
      };
    }

    // Calculate overall average if we have any prices
    const platformAverages = Object.values(result.prices).map((p: any) => p.average);
    if (platformAverages.length > 0) {
      result.overallAverage = Math.round(
        (platformAverages.reduce((sum, price) => sum + price, 0) / platformAverages.length) * 100
      ) / 100;

      // Get OpenAI recommendations if we have pricing data
      if (process.env.OPENAI_API_KEY) {
        try {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const platformsData = Object.entries(result.prices)
            .map(([platform, data]: [string, any]) => `${platform}: $${data.average} (${data.count} listings)`)
            .join(', ');

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a pricing expert for online marketplaces. Provide concise recommendations.',
              },
              {
                role: 'user',
                content: `Item: "${query}"\nMarket prices: ${platformsData}\n\nProvide: 1) Best platforms to list on and why (one sentence each), 2) Suggested listing price with brief reasoning, can be separate per marketplace. Keep total response under 150 words. Don't bold words with *.`,
              },
            ],
            max_tokens: 300,
            temperature: 0.7,
          });

          result.recommendation = completion.choices[0]?.message?.content || null;
        } catch (aiError) {
          console.error('OpenAI error:', aiError);
          // Don't fail the whole request if AI fails
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Price lookup error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pricing data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
