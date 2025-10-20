/**
 * Depop search functions for active listings
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
 * Fetches currently active listings from Depop for price comparison
 * Uses Oxylabs E-Commerce Scraper API
 */
export async function fetchDepopActiveListings(query: string): Promise<ActiveListingResult> {
  const username = process.env.OXYLABS_USERNAME;
  const password = process.env.OXYLABS_PASSWORD;

  if (!username || !password) {
    console.error('Oxylabs credentials not configured');
    return { itemCount: 0, average: 0, median: 0 };
  }

  try {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const depopUrl = `https://www.depop.com/search/?q=${encodeURIComponent(query)}`;

    console.log('Depop scraping URL:', depopUrl);

    // Use Oxylabs to scrape Depop search results
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        source: 'universal',
        url: depopUrl,
        render: 'html',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Oxylabs API error:', response.status, errorText);
      return { itemCount: 0, average: 0, median: 0 };
    }

    const data = await response.json();
    console.log('Oxylabs response received');
    console.log('Oxylabs full response:', JSON.stringify(data).substring(0, 1000));

    // Oxylabs returns structured content, need to get the actual HTML
    const content = data.results?.[0]?.content;
    console.log('Content type:', typeof content);

    // If content is an object, try to get HTML from it
    let html = '';
    if (typeof content === 'string') {
      html = content;
    } else if (content && typeof content === 'object') {
      // Try common fields where HTML might be
      html = content.html || content.body || content.text || '';
    }

    console.log('Depop HTML length:', html.length);
    console.log('Depop HTML sample:', html.substring(0, 500));

    // Parse prices from HTML (Depop shows prices in data attributes or text)
    // This is a simplified parser - adjust based on actual HTML structure
    const priceRegex = /\$(\d+(?:\.\d{2})?)/g;
    const matches = html.matchAll(priceRegex);

    let prices: number[] = [];
    for (const match of matches) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        prices.push(price);
      }
    }

    // Limit to 30 items
    prices = prices.slice(0, 30);

    console.log('Depop extracted prices:', prices.length, 'valid prices');

    if (prices.length === 0) {
      console.log('Depop: No prices found in HTML');
      return { itemCount: 0, average: 0, median: 0 };
    }

    // Remove outliers
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
    console.error('Depop scraping error:', error);
    return { itemCount: 0, average: 0, median: 0 };
  }
}
