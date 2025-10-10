'use client';

import { useState, useEffect } from 'react';
import { ComparisonResult } from '@/types';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEbayListings, setShowEbayListings] = useState(false);
  const [showMercariListings, setShowMercariListings] = useState(false);
  const [remainingSearches, setRemainingSearches] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeToken, setActiveToken] = useState(''); // Store the active token
  const [tokenSearches, setTokenSearches] = useState<number | null>(null);

  // Auto-load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('compr_access_token');
    if (savedToken) {
      // Validate the saved token
      fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid && data.remaining > 0) {
            setActiveToken(savedToken);
            setTokenSearches(data.remaining);
          } else {
            // Token expired or invalid, remove from storage
            localStorage.removeItem('compr_access_token');
          }
        })
        .catch((err) => {
          console.error('Error validating saved token:', err);
        });
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build URL with optional token
      const url = new URL('/api/search', window.location.origin);
      url.searchParams.set('query', query);
      if (tokenSearches !== null && tokenSearches > 0 && activeToken) {
        url.searchParams.set('token', activeToken);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();

        // Handle rate limit error specifically
        if (response.status === 429) {
          setError(errorData.message || 'Rate limit exceeded');
          setRemainingSearches(0);
        } else {
          throw new Error(errorData.error || 'Failed to fetch data');
        }
        return;
      }

      const data: ComparisonResult = await response.json();
      setResult(data);

      // Update remaining searches from response
      if (data.rateLimit) {
        setRemainingSearches(data.rateLimit.remaining);
      }

      // Update token searches if using a token
      if (data.tokenInfo) {
        setTokenSearches(data.tokenInfo.remaining);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      // You'll need to create a Stripe Price ID and add it here
      // For now, we'll use a placeholder
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_placeholder';

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to initiate checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" fill="black"/>
              <text x="16" y="23" fontFamily="monospace" fontSize="20" fontWeight="bold" fill="white" textAnchor="middle">C</text>
            </svg>
            <h1 className="text-xl font-bold text-black">Compr</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        {!result && (
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">
              Compare prices across eBay and Mercari
            </h2>
            <p className="text-lg text-gray-600">
              See which platform gives you the best profit after fees. Real market data from active listings.
            </p>
          </div>
        )}

        {/* Search Form */}
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter item name"
              className="flex-1 px-4 py-3 border-2 border-gray-300 focus:border-black focus:outline-none text-black placeholder-gray-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Searching...' : 'Compare'}
            </button>
          </form>

          {/* Search Counter */}
          {(remainingSearches !== null || (tokenSearches !== null && tokenSearches > 0)) && (
            <div className="mt-3 text-center">
              {tokenSearches !== null && tokenSearches > 0 ? (
                <p className="text-sm text-green-600 font-medium">
                  ✓ {tokenSearches} paid {tokenSearches === 1 ? 'search' : 'searches'} remaining
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  {remainingSearches} free {remainingSearches === 1 ? 'search' : 'searches'} remaining today
                </p>
              )}
            </div>
          )}
        </div>

        {/* Features (only show when no results) */}
        {!result && !loading && (
          <div className="max-w-3xl mx-auto">
            <div className="border-2 border-gray-200 p-6">
              <ul className="space-y-2 text-gray-700">
                <li>• 200+ active listings analyzed per platform</li>
                <li>• Net profit calculated after all fees</li>
                <li>• Results in under 10 seconds</li>
              </ul>
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                {tokenSearches !== null && tokenSearches > 0 ? (
                  <span className="text-green-600 font-medium">
                    ✓ {tokenSearches} paid {tokenSearches === 1 ? 'search' : 'searches'} remaining
                  </span>
                ) : remainingSearches !== null ? (
                  <>
                    {remainingSearches} free {remainingSearches === 1 ? 'search' : 'searches'} remaining today
                  </>
                ) : (
                  '3 free searches/day'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="border-2 border-red-600 bg-red-50 p-4">
              <p className="text-red-900 mb-3">{error}</p>
              {remainingSearches === 0 && (
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {checkoutLoading ? 'Loading...' : 'Get 10 More Searches'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <button
                onClick={() => setResult(null)}
                className="text-gray-600 hover:text-black mb-4"
              >
                ← New search
              </button>
              <h3 className="text-2xl font-bold text-black">
                {result.query}
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* eBay Results */}
              {result.ebay && (
                <div className="border-2 border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-black mb-4">eBay</h4>

                  {result.ebay.itemCount === 0 ? (
                    <p className="text-gray-500">No listings found</p>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Listings</span>
                          <span className="font-mono text-black">{result.ebay.itemCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average</span>
                          <span className="font-mono text-black">${result.ebay.average.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median</span>
                          <span className="font-mono text-black">${result.ebay.median.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Range</span>
                          <span className="font-mono text-black">${result.ebay.min.toFixed(2)} – ${result.ebay.max.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-3">
                          <span className="text-gray-600">Fees</span>
                          <span className="font-mono text-red-600">-${result.ebay.fees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-black pt-3">
                          <span className="font-bold text-black">Net profit</span>
                          <span className="font-mono font-bold text-black text-lg">${result.ebay.netProfit.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Sample listings dropdown */}
                      {result.ebay.listings && result.ebay.listings.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => setShowEbayListings(!showEbayListings)}
                            className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
                          >
                            {showEbayListings ? '▼' : '▶'} View sample listings
                          </button>

                          {showEbayListings && (
                            <div className="mt-3 space-y-2">
                              {result.ebay.listings.slice(0, 5).map((listing, i) => (
                                <div key={i} className="text-xs border-l-2 border-gray-300 pl-2">
                                  <div className="font-mono text-black">${listing.price.toFixed(2)}</div>
                                  <a
                                    href={listing.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-black truncate block"
                                  >
                                    {listing.title}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Mercari Results */}
              {result.mercari && (
                <div className="border-2 border-gray-200 p-6">
                  <h4 className="text-lg font-bold text-black mb-4">Mercari</h4>

                  {result.mercari.itemCount === 0 ? (
                    <p className="text-gray-500">No listings found</p>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Listings</span>
                          <span className="font-mono text-black">{result.mercari.itemCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Average</span>
                          <span className="font-mono text-black">${result.mercari.average.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median</span>
                          <span className="font-mono text-black">${result.mercari.median.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Range</span>
                          <span className="font-mono text-black">${result.mercari.min.toFixed(2)} – ${result.mercari.max.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-3">
                          <span className="text-gray-600">Fees</span>
                          <span className="font-mono text-red-600">-${result.mercari.fees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-black pt-3">
                          <span className="font-bold text-black">Net profit</span>
                          <span className="font-mono font-bold text-black text-lg">${result.mercari.netProfit.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Sample listings dropdown */}
                      {result.mercari.listings && result.mercari.listings.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => setShowMercariListings(!showMercariListings)}
                            className="text-sm text-gray-600 hover:text-black flex items-center gap-1"
                          >
                            {showMercariListings ? '▼' : '▶'} View sample listings
                          </button>

                          {showMercariListings && (
                            <div className="mt-3 space-y-2">
                              {result.mercari.listings.slice(0, 5).map((listing, i) => (
                                <div key={i} className="text-xs border-l-2 border-gray-300 pl-2">
                                  <div className="font-mono text-black">${listing.price.toFixed(2)}</div>
                                  <a
                                    href={listing.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-black truncate block"
                                  >
                                    {listing.title}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Recommendation */}
            {result.recommendation && (
              <div className="border-2 border-black bg-white p-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-black mb-2">
                    Best platform: {result.recommendation.platform === 'ebay' ? 'eBay' : 'Mercari'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    ${result.recommendation.profitDifference.toFixed(2)} more profit than {result.recommendation.platform === 'ebay' ? 'Mercari' : 'eBay'}
                  </p>
                </div>
              </div>
            )}

            {/* No recommendation if only one platform has data */}
            {!result.recommendation && ((result.ebay && result.ebay.itemCount > 0) || (result.mercari && result.mercari.itemCount > 0)) && (
              <div className="border-2 border-gray-200 bg-white p-6">
                <p className="text-center text-gray-600">
                  {result.ebay && result.ebay.itemCount > 0 && (!result.mercari || result.mercari.itemCount === 0) && (
                    <>Only eBay data found. Average: <span className="font-mono text-black">${result.ebay.average.toFixed(2)}</span></>
                  )}
                  {result.mercari && result.mercari.itemCount > 0 && (!result.ebay || result.ebay.itemCount === 0) && (
                    <>Only Mercari data found. Average: <span className="font-mono text-black">${result.mercari.average.toFixed(2)}</span></>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black animate-spin"></div>
            <p className="mt-6 text-gray-600">Analyzing market data...</p>
            <p className="mt-2 text-gray-500 text-sm">Comparing 400+ listings across platforms</p>
          </div>
        )}
      </main>
    </div>
  );
}
