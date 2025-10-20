'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Listing {
  id: string;
  title: string;
  price: number;
  photo_urls: string[];
  status: 'draft' | 'active' | 'sold' | 'archived';
  created_at: string;
  platform_listings?: {
    platform: string;
    status: string;
    platform_url: string;
  }[];
}

type FilterStatus = 'all' | 'draft' | 'active' | 'sold';
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'title';

export default function ListingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchListings();
    }
  }, [userId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [listings, searchQuery, filterStatus, sortBy]);

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

  const fetchListings = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch listings with platform_listings joined
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          photo_urls,
          status,
          created_at,
          platform_listings (
            platform,
            status,
            platform_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...listings];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(listing => listing.status === filterStatus);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Pagination
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPlatformBadgeColor = (platform: string) => {
    const colors: Record<string, string> = {
      ebay: 'bg-blue-100 text-blue-700',
      etsy: 'bg-orange-100 text-orange-700',
      poshmark: 'bg-purple-100 text-purple-700',
      mercari: 'bg-red-100 text-red-700',
      depop: 'bg-pink-100 text-pink-700',
    };
    return colors[platform] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-accent-foreground font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold text-foreground">Compr</h1>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/seller"
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Your Listings</h2>
              <p className="text-muted-foreground mt-1">
                {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'}
              </p>
            </div>
            <Link
              href="/seller/listings/new"
              className="px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Listing
            </Link>
          </div>

          {/* Filters and Search */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                >
                  <option value="all">All Listings</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search listings..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                />
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          {paginatedListings.length === 0 ? (
            <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {listings.length === 0 ? 'No listings yet' : 'No listings match your filters'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {listings.length === 0
                    ? 'Create your first listing to get started with crosslisting.'
                    : 'Try adjusting your filters or search query.'}
                </p>
                {listings.length === 0 && (
                  <Link
                    href="/seller/listings/new"
                    className="inline-block px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-all shadow-sm"
                  >
                    Create Your First Listing
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {paginatedListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Listing Image */}
                    <Link href={`/seller/listings/${listing.id}`} className="block relative aspect-square bg-muted">
                      {listing.photo_urls && listing.photo_urls.length > 0 ? (
                        <Image
                          src={listing.photo_urls[0]}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    {/* Listing Info */}
                    <div className="p-4">
                      <Link href={`/seller/listings/${listing.id}`}>
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-2 hover:text-accent transition-colors">
                          {listing.title}
                        </h3>
                      </Link>
                      <p className="text-xl font-bold text-foreground mb-3">
                        ${listing.price.toFixed(2)}
                      </p>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${
                          listing.status === 'active' ? 'bg-green-100 text-green-700' :
                          listing.status === 'sold' ? 'bg-slate-100 text-slate-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {listing.status}
                        </span>
                      </div>

                      {/* Platform Badges */}
                      {listing.platform_listings && listing.platform_listings.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {listing.platform_listings.map((pl, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${getPlatformBadgeColor(pl.platform)}`}
                            >
                              {pl.platform}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Link
                          href={`/seller/listings/${listing.id}`}
                          className="flex-1 px-3 py-2 text-sm bg-secondary text-secondary-foreground font-medium rounded hover:bg-muted transition-colors text-center"
                        >
                          View
                        </Link>
                        <Link
                          href={`/seller/listings/${listing.id}/edit`}
                          className="flex-1 px-3 py-2 text-sm bg-accent/10 text-accent font-medium rounded hover:bg-accent/20 transition-colors text-center"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-border rounded text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border rounded font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-border rounded text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
