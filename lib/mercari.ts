import { MercariPriceData, MercariSoldListing } from '@/types';

const APIFY_MERCARI_ACTOR = 'jupri~mercari-scraper';
const APIFY_API_URL = 'https://api.apify.com/v2';
const MERCARI_FEE_PERCENTAGE = 0.10; // 10% Mercari selling fee (as of Jan 6, 2025)

interface ApifyMercariItem {
  id?: string;
  name?: string;
  price?: number;
  status?: string;
  itemCondition?: string;
  url?: string;
  sold?: boolean;
}

interface ApifyRunResponse {
  data: {
    id: string;
    defaultDatasetId: string;
  };
}

/**
 * Fetch active listings from Mercari using Apify scraper
 */
export async function fetchMercariActiveListings(query: string): Promise<MercariPriceData> {
  const apiToken = process.env.APIFY_API_TOKEN;

  if (!apiToken) {
    throw new Error('Apify API token not configured');
  }

  try {
    // Start the Apify actor run
    const runUrl = `${APIFY_API_URL}/acts/${APIFY_MERCARI_ACTOR}/runs`;

    const input = {
      query: [query], // Must be an array of search terms
      limit: 200,
    };

    console.log('Starting Apify Mercari scraper with input:', input);

    // Start the scraper
    const runResponse = await fetch(`${runUrl}?token=${apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Apify run error:', errorText);
      throw new Error(`Apify run failed: ${runResponse.statusText}`);
    }

    const runData: ApifyRunResponse = await runResponse.json();
    const runId = runData.data.id;
    const datasetId = runData.data.defaultDatasetId;

    console.log('Apify run started:', runId);

    // Wait for the run to complete (with timeout)
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 2000; // Check every 2 seconds
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;

      const statusResponse = await fetch(
        `${APIFY_API_URL}/actor-runs/${runId}?token=${apiToken}`
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.data.status;

        console.log('Apify run status:', status);

        if (status === 'SUCCEEDED') {
          break;
        } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Apify run ${status.toLowerCase()}`);
        }
      }
    }

    // Fetch the dataset results
    const datasetUrl = `${APIFY_API_URL}/datasets/${datasetId}/items?token=${apiToken}`;

    console.log('Fetching dataset from:', datasetUrl);

    const datasetResponse = await fetch(datasetUrl);

    if (!datasetResponse.ok) {
      const errorText = await datasetResponse.text();
      console.error('Apify dataset error:', errorText);
      throw new Error(`Failed to fetch dataset: ${datasetResponse.statusText}`);
    }

    const items: ApifyMercariItem[] = await datasetResponse.json();
    console.log('Mercari items found:', items.length);

    if (items.length === 0) {
      return {
        platform: 'mercari',
        itemCount: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        listings: [],
        fees: 0,
        netProfit: 0,
      };
    }

    // Extract years from query (e.g., "2025" from "2025 ford f250")
    const yearMatches = query.match(/\b(19\d{2}|20\d{2})\b/g);
    const queryYears = yearMatches ? yearMatches.map(y => y.toLowerCase()) : [];

    // Filter to active listings only (not sold)
    let activeListings: MercariSoldListing[] = items
      .filter(item => item.status !== 'sold' && item.price && item.price > 0)
      .map((item) => ({
        title: item.name || 'Unknown',
        price: (item.price || 0) / 100, // Convert cents to dollars
        soldDate: new Date().toISOString(), // Active listings don't have sold date
        condition: typeof item.itemCondition === 'object' && item.itemCondition !== null
          ? (item.itemCondition as { name?: string }).name || JSON.stringify(item.itemCondition)
          : item.itemCondition,
        url: item.url || `https://www.mercari.com/us/item/${item.id}`,
      }));

    // If query contains years, filter listings to only include those years
    if (queryYears.length > 0) {
      const filteredByYear = activeListings.filter(listing => {
        const titleLower = listing.title.toLowerCase();
        return queryYears.some(year => titleLower.includes(year));
      });

      // Only apply year filter if we still have a reasonable number of results
      if (filteredByYear.length >= 20) {
        activeListings = filteredByYear;
        console.log(`Filtered Mercari results by year(s): ${queryYears.join(', ')} - ${filteredByYear.length} listings remain`);
      } else {
        console.log(`Year filter would leave only ${filteredByYear.length} listings, keeping all ${activeListings.length} results`);
      }
    }

    if (activeListings.length === 0) {
      return {
        platform: 'mercari',
        itemCount: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        listings: [],
        fees: 0,
        netProfit: 0,
      };
    }

    // Calculate statistics
    const prices = activeListings.map((l) => l.price).sort((a, b) => a - b);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const median =
      prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];

    // Calculate fees (10% flat, no payment processing fee as of Jan 2025)
    const fees = average * MERCARI_FEE_PERCENTAGE;
    const netProfit = average - fees;

    return {
      platform: 'mercari',
      itemCount: activeListings.length,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      listings: activeListings.slice(0, 10),
      fees: Math.round(fees * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching Mercari data:', error);
    throw new Error('Failed to fetch Mercari data');
  }
}
