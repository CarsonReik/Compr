'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  category: string | null;
  brand: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  weight_oz: number | null;
  photo_urls: string[];
  status: 'draft' | 'active' | 'sold' | 'archived';
  created_at: string;
  platform_listings?: {
    platform: string;
    status: string;
    platform_url: string | null;
    platform_listing_id: string;
  }[];
}

export default function ListingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [crosslisting, setCrosslisting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successResults, setSuccessResults] = useState<string[]>([]);
  const [errorResults, setErrorResults] = useState<string[]>([]);

  const platforms = [
    { id: 'ebay', name: 'eBay', fee: 0.1325, color: 'blue' },
    { id: 'etsy', name: 'Etsy', fee: 0.095, color: 'orange' },
    { id: 'poshmark', name: 'Poshmark', fee: 0.20, color: 'purple' },
    { id: 'mercari', name: 'Mercari', fee: 0.128, color: 'red' },
    { id: 'depop', name: 'Depop', fee: 0.10, color: 'pink' },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchListing();
    }
  }, [userId]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchListing = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          platform_listings (
            platform,
            status,
            platform_url,
            platform_listing_id
          )
        `)
        .eq('id', listingId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      router.push('/seller/listings');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleCrosslist = async () => {
    if (selectedPlatforms.length === 0) return;

    setCrosslisting(true);
    try {
      const results: string[] = [];
      const errors: string[] = [];

      // Process each platform
      for (const platform of selectedPlatforms) {
        try {
          if (platform === 'ebay') {
            const response = await fetch('/api/listings/publish-to-ebay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                listingId,
                userId,
                // categoryId removed - will use eBay Category Suggestion API to auto-detect
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              errors.push(`eBay: ${data.error}`);
            } else {
              results.push(`eBay: Successfully posted!`);
            }
          } else {
            // Other platforms not yet implemented
            errors.push(`${platform}: Not yet implemented`);
          }
        } catch (error) {
          console.error(`Error posting to ${platform}:`, error);
          errors.push(`${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Show results in modal
      setSuccessResults(results);
      setErrorResults(errors);
      setShowSuccessModal(true);

      // Refresh listing to show updated platform_listings
      await fetchListing();
      setSelectedPlatforms([]);
    } catch (error) {
      console.error('Crosslisting error:', error);
      setSuccessResults([]);
      setErrorResults(['An error occurred while crosslisting. Please try again.']);
      setShowSuccessModal(true);
    } finally {
      setCrosslisting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      router.push('/seller/listings');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
    }
  };

  const getPlatformColor = (platformId: string) => {
    const colors: Record<string, string> = {
      ebay: 'text-blue-700 bg-blue-100',
      etsy: 'text-orange-700 bg-orange-100',
      poshmark: 'text-purple-700 bg-purple-100',
      mercari: 'text-red-700 bg-red-100',
      depop: 'text-pink-700 bg-pink-100',
    };
    return colors[platformId] || 'text-gray-700 bg-gray-100';
  };

  const isPostedToPlatform = (platformId: string) => {
    return listing?.platform_listings?.some(
      pl => pl.platform === platformId && pl.status === 'active'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Listing not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-accent-foreground font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold text-foreground">Compr</h1>
              </Link>
              <Link
                href="/seller/listings"
                className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                ← Back to Listings
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Photos and Details */}
            <div>
              {/* Main Photo */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden mb-4">
                  {listing.photo_urls && listing.photo_urls.length > 0 ? (
                    <Image
                      src={listing.photo_urls[0]}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-24 h-24 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {listing.photo_urls && listing.photo_urls.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.photo_urls.slice(1, 5).map((url, idx) => (
                      <div key={idx} className="relative aspect-square bg-muted rounded overflow-hidden">
                        <Image
                          src={url}
                          alt={`${listing.title} - ${idx + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{listing.title}</h2>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-foreground">${listing.price.toFixed(2)}</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      listing.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      listing.status === 'sold' ? 'bg-muted text-muted-foreground' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold text-foreground mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
                </div>

                <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Condition:</span>
                    <span className="ml-2 text-foreground font-medium capitalize">{listing.condition.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="ml-2 text-foreground font-medium">{listing.quantity}</span>
                  </div>
                  {listing.brand && (
                    <div>
                      <span className="text-muted-foreground">Brand:</span>
                      <span className="ml-2 text-foreground font-medium">{listing.brand}</span>
                    </div>
                  )}
                  {listing.size && (
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <span className="ml-2 text-foreground font-medium">{listing.size}</span>
                    </div>
                  )}
                  {listing.color && (
                    <div>
                      <span className="text-muted-foreground">Color:</span>
                      <span className="ml-2 text-foreground font-medium">{listing.color}</span>
                    </div>
                  )}
                  {listing.material && (
                    <div>
                      <span className="text-muted-foreground">Material:</span>
                      <span className="ml-2 text-foreground font-medium">{listing.material}</span>
                    </div>
                  )}
                  {listing.category && (
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <span className="ml-2 text-foreground font-medium">{listing.category}</span>
                    </div>
                  )}
                  {listing.weight_oz && (
                    <div>
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="ml-2 text-foreground font-medium">{listing.weight_oz} oz</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 flex gap-3">
                  <Link
                    href={`/seller/listings/${listing.id}/edit`}
                    className="flex-1 px-4 py-2 bg-accent text-accent-foreground text-center font-medium rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Edit Listing
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-destructive/50 text-destructive font-medium rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Crosslisting */}
            <div>
              {/* Platform Status */}
              {listing.platform_listings && listing.platform_listings.length > 0 && (
                <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Posted To</h3>
                  <div className="space-y-3">
                    {listing.platform_listings.map((pl, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getPlatformColor(pl.platform)}`}>
                            {pl.platform}
                          </span>
                          <span className={`text-xs ${
                            pl.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          }`}>
                            {pl.status}
                          </span>
                        </div>
                        {pl.platform_url && (
                          <a
                            href={pl.platform_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-accent hover:text-accent/80 transition-colors"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Crosslist Section */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Crosslist to Platforms</h3>

                <div className="space-y-3 mb-6">
                  {platforms.map((platform) => {
                    const isPosted = isPostedToPlatform(platform.id);
                    const netProfit = listing.price - (listing.price * platform.fee);

                    return (
                      <div
                        key={platform.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isPosted
                            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
                            : selectedPlatforms.includes(platform.id)
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedPlatforms.includes(platform.id)}
                              onChange={() => togglePlatform(platform.id)}
                              disabled={isPosted}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">{platform.name}</span>
                                {isPosted && (
                                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    Posted ✓
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Fee: {(platform.fee * 100).toFixed(1)}%
                                {' • '}
                                Net: ${netProfit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleCrosslist}
                  disabled={selectedPlatforms.length === 0 || crosslisting}
                  className="w-full px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {crosslisting ? 'Posting...' : `Post to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
                </button>

                <p className="mt-4 text-xs text-muted-foreground text-center">
                  Connect your platform accounts in Settings before posting
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {errorResults.length === 0 ? (
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {errorResults.length === 0 ? 'Success!' : 'Completed with Warnings'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {errorResults.length === 0
                      ? `Posted to ${successResults.length} platform${successResults.length !== 1 ? 's' : ''}`
                      : 'Some platforms encountered issues'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              {successResults.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Successfully Posted:</h4>
                  <ul className="space-y-2">
                    {successResults.map((result, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-foreground">{result}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {errorResults.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-destructive mb-2">Errors:</h4>
                  <ul className="space-y-2">
                    {errorResults.map((error, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-muted-foreground">{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-muted/50 border-t border-border">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessResults([]);
                  setErrorResults([]);
                }}
                className="w-full px-4 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
