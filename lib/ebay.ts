import { EbaySoldListing, EbayPriceData } from '@/types';

const EBAY_FINDING_API_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';
const EBAY_FEE_PERCENTAGE = 0.1325; // 13.25% average eBay fees

interface EbayApiItem {
  title: string[];
  sellingStatus: Array<{
    currentPrice: Array<{
      __value__: string;
    }>;
  }>;
  listingInfo: Array<{
    endTime: string[];
  }>;
  condition?: Array<{
    conditionDisplayName: string[];
  }>;
  viewItemURL: string[];
}

interface EbayApiResponse {
  findCompletedItemsResponse: Array<{
    ack?: string[];
    errorMessage?: Array<{
      error?: Array<{
        message?: string[];
      }>;
    }>;
    searchResult: Array<{
      '@count': string;
      item?: EbayApiItem[];
    }>;
  }>;
}

/**
 * Fetches sold listings from eBay Finding API
 */
export async function fetchEbaySoldListings(query: string): Promise<EbayPriceData> {
  const appId = process.env.EBAY_APP_ID;

  if (!appId) {
    throw new Error('eBay App ID not configured');
  }

  // Build eBay API request URL
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': query,
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'itemFilter(1).name': 'ListingType',
    'itemFilter(1).value': 'FixedPrice',
    'paginationInput.entriesPerPage': '100', // Get up to 100 results
    'sortOrder': 'EndTimeSoonest',
  });

  const url = `${EBAY_FINDING_API_URL}?${params.toString()}`;

  try {
    console.log('eBay API URL:', url);
    const response = await fetch(url);

    const data: EbayApiResponse = await response.json();
    console.log('eBay API Response:', JSON.stringify(data, null, 2));

    // Check for eBay API errors in response
    if (data.findCompletedItemsResponse?.[0]?.ack?.[0] === 'Failure') {
      const errorMessage = data.findCompletedItemsResponse?.[0]?.errorMessage?.[0]?.error?.[0]?.message?.[0];
      throw new Error(`eBay API error: ${errorMessage || 'Unknown error'}`);
    }

    // Parse eBay response
    const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
    const items = searchResult?.item || [];
    const itemCount = parseInt(searchResult?.['@count'] || '0', 10);

    if (itemCount === 0 || items.length === 0) {
      return {
        platform: 'ebay',
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

    // Filter items from last 30 days and parse into our format
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const listings: EbaySoldListing[] = items
      .map((item): EbaySoldListing | null => {
        try {
          const price = parseFloat(item.sellingStatus[0].currentPrice[0].__value__);
          const soldDate = item.listingInfo[0].endTime[0];
          const soldDateObj = new Date(soldDate);

          // Only include items sold in last 30 days
          if (soldDateObj < thirtyDaysAgo) {
            return null;
          }

          return {
            title: item.title[0],
            price,
            soldDate,
            condition: item.condition?.[0]?.conditionDisplayName?.[0],
            url: item.viewItemURL[0],
          };
        } catch (err) {
          console.error('Error parsing eBay item:', err);
          return null;
        }
      })
      .filter((item): item is EbaySoldListing => item !== null);

    if (listings.length === 0) {
      return {
        platform: 'ebay',
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
    const prices = listings.map((l) => l.price).sort((a, b) => a - b);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];

    // Calculate fees and net profit
    const fees = average * EBAY_FEE_PERCENTAGE;
    const netProfit = average - fees;

    return {
      platform: 'ebay',
      itemCount: listings.length,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      listings: listings.slice(0, 10), // Return only 10 most recent
      fees: Math.round(fees * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching eBay data:', error);
    throw new Error('Failed to fetch eBay data');
  }
}
