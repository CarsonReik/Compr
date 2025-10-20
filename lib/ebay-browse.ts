/**
 * eBay Browse API for fetching active listings
 * Used for price lookup/comparison tool
 */

interface ActiveListingResult {
  itemCount: number;
  average: number;
  median: number;
}

/**
 * Removes outliers from price array using IQR method
 */
function removeOutliers(prices: number[]): number[] {
  if (prices.length < 4) return prices;

  const sorted = [...prices].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return prices.filter(price => price >= lowerBound && price <= upperBound);
}

/**
 * Get OAuth access token for eBay API
 */
async function getEbayAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('eBay API credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!response.ok) {
    throw new Error('Failed to get eBay access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetches currently active listings from eBay for price comparison
 */
export async function fetchEbayActiveListings(query: string): Promise<ActiveListingResult> {
  try {
    const accessToken = await getEbayAccessToken();

    // Search for active Buy It Now listings
    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=30&filter=buyingOptions:%7BFIXED_PRICE%7D`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay API error:', response.status, errorText);
      return { itemCount: 0, average: 0, median: 0 };
    }

    const data = await response.json();
    console.log('eBay results:', data.itemSummaries?.length || 0, 'items');
    let prices = data.itemSummaries
      ?.map((item: any) => parseFloat(item.price?.value))
      .filter((price: number) => !isNaN(price) && price > 0) || [];

    if (prices.length === 0) {
      return { itemCount: 0, average: 0, median: 0 };
    }

    // Remove outliers using IQR method
    prices = removeOutliers(prices);

    if (prices.length === 0) {
      return { itemCount: 0, average: 0, median: 0 };
    }

    prices.sort((a, b) => a - b);
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    return {
      itemCount: prices.length,
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
    };
  } catch (error) {
    console.error('eBay API error:', error);
    return { itemCount: 0, average: 0, median: 0 };
  }
}
