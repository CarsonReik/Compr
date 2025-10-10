import { getEbayAccessToken } from './ebay-oauth';
import { EbayPriceData, EbaySoldListing } from '@/types';

const BROWSE_API_URL = 'https://api.ebay.com/buy/browse/v1';
const SANDBOX_BROWSE_URL = 'https://api.sandbox.ebay.com/buy/browse/v1';
const EBAY_FEE_PERCENTAGE = 0.136; // 13.6% eBay final value fee (most categories)
const EBAY_PER_ORDER_FEE = 0.40; // $0.40 per order fee (orders over $10)

interface BrowseApiItem {
  itemId: string;
  title: string;
  price: {
    value: string;
    currency: string;
  };
  condition?: string;
  itemWebUrl: string;
  seller?: {
    username: string;
  };
}

interface BrowseApiResponse {
  total: number;
  itemSummaries?: BrowseApiItem[];
  warnings?: Array<{
    category: string;
    message: string;
  }>;
}

/**
 * Fetch active listings from eBay Browse API
 * NOTE: This returns ACTIVE listings, not sold items
 */
export async function fetchEbayActiveListings(query: string): Promise<EbayPriceData> {
  const environment = process.env.EBAY_ENVIRONMENT || 'PRODUCTION';
  const baseUrl = environment === 'SANDBOX' ? SANDBOX_BROWSE_URL : BROWSE_API_URL;

  try {
    // Get OAuth token
    const accessToken = await getEbayAccessToken();

    // Build search URL
    const searchUrl = `${baseUrl}/item_summary/search?q=${encodeURIComponent(query)}&limit=200`;

    console.log('eBay Browse API URL:', searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', // US marketplace
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay Browse API error:', errorText);
      throw new Error(`eBay Browse API error: ${response.statusText}`);
    }

    const data: BrowseApiResponse = await response.json();
    console.log('eBay Browse API Response:', JSON.stringify(data, null, 2));

    const items = data.itemSummaries || [];

    if (items.length === 0) {
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

    // Parse items into our format
    const listings: EbaySoldListing[] = items
      .map((item) => {
        try {
          const price = parseFloat(item.price.value);

          return {
            title: item.title,
            price,
            soldDate: new Date().toISOString(), // Active listings don't have sold date
            condition: item.condition,
            url: item.itemWebUrl,
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
    const median =
      prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];

    // Calculate fees and net profit (13.6% + $0.40 per order)
    const percentageFee = average * EBAY_FEE_PERCENTAGE;
    const fees = percentageFee + EBAY_PER_ORDER_FEE;
    const netProfit = average - fees;

    return {
      platform: 'ebay',
      itemCount: listings.length,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      listings: listings.slice(0, 10), // Return only 10 most relevant
      fees: Math.round(fees * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching eBay Browse data:', error);
    throw new Error('Failed to fetch eBay data');
  }
}
