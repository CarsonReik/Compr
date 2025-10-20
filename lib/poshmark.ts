/**
 * Poshmark search functions for active listings
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
 * Fetches currently active listings from Poshmark for price comparison
 * Uses Apify poshmark-listings-scraper actor
 */
export async function fetchPoshmarkActiveListings(query: string): Promise<ActiveListingResult> {
  const apifyToken = process.env.APIFY_API_TOKEN;

  if (!apifyToken) {
    console.error('Apify API token not configured');
    return { itemCount: 0, average: 0, median: 0 };
  }

  try {
    // Build Poshmark search URL
    const searchUrl = `https://poshmark.com/search?query=${encodeURIComponent(query)}&type=listings`;

    // Start Apify actor run for Poshmark scraping
    const runResponse = await fetch('https://api.apify.com/v2/acts/piotrv1001~poshmark-listings-scraper/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyToken}`,
      },
      body: JSON.stringify({
        searchUrls: [searchUrl],
      }),
    });

    console.log('Poshmark search URL:', searchUrl);

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error('Apify Poshmark run failed:', runResponse.status, errorText);
      return { itemCount: 0, average: 0, median: 0 };
    }

    const runData = await runResponse.json();
    console.log('Poshmark run started:', runData);
    const runId = runData.data.id;

    // Wait for the run to complete (with timeout)
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(`https://api.apify.com/v2/acts/piotrv1001~poshmark-listings-scraper/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apifyToken}` },
      });

      const statusData = await statusResponse.json();
      console.log(`Poshmark attempt ${attempts + 1}: status = ${statusData.data.status}`);

      if (statusData.data.status === 'SUCCEEDED') {
        console.log('Poshmark scraper succeeded!');
        break;
      } else if (statusData.data.status === 'FAILED' || statusData.data.status === 'ABORTED') {
        console.error('Apify Poshmark run failed or aborted:', statusData.data.status);
        return { itemCount: 0, average: 0, median: 0 };
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('Apify Poshmark run timeout after', maxAttempts, 'attempts');
      return { itemCount: 0, average: 0, median: 0 };
    }

    // Get results from dataset using the defaultDatasetId
    const datasetId = runData.data.defaultDatasetId;
    console.log('Fetching Poshmark dataset:', datasetId);
    const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
      headers: { 'Authorization': `Bearer ${apifyToken}` },
    });

    let results = await resultsResponse.json();
    console.log('Poshmark raw results type:', typeof results, 'isArray:', Array.isArray(results));
    console.log('Poshmark raw results sample:', JSON.stringify(results).substring(0, 500));

    // Handle case where results might be wrapped in an object
    if (!Array.isArray(results)) {
      console.log('Poshmark results is not an array, checking for data property');
      results = results.data || results.items || [];
    }

    console.log('Poshmark results after unwrapping:', results.length, 'items');

    // Log sample item to see structure
    if (results.length > 0) {
      console.log('Sample Poshmark item:', JSON.stringify(results[0]));
    }

    let prices = results
      .map((item: any) => {
        // Poshmark returns prices as strings like "$20"
        let priceStr = item.price;
        if (typeof priceStr === 'string') {
          // Remove $ and any other non-numeric characters except decimal
          priceStr = priceStr.replace(/[^0-9.]/g, '');
          return parseFloat(priceStr);
        }
        return 0;
      })
      .filter((price: number) => !isNaN(price) && price > 0);

    console.log('Poshmark extracted prices:', prices.length, 'valid prices');

    if (prices.length === 0) {
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
    console.error('Poshmark scraping error:', error);
    return { itemCount: 0, average: 0, median: 0 };
  }
}
