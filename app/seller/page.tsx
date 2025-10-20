'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserData {
  email: string;
  subscription_tier: string;
}

interface UsageData {
  listings_added: number;
}

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      // Redirect to listings page
      router.push('/seller/listings');
      return;

      // Fetch usage data for current month
      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      const periodStart = currentPeriod.toISOString().split('T')[0];

      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('listings_added')
        .eq('user_id', session.user.id)
        .eq('period_start', periodStart)
        .single();

      if (usageError) {
        // If no usage record exists, create one
        if (usageError.code === 'PGRST116') {
          const { data: newUsage } = await supabase
            .from('usage_tracking')
            .insert({
              user_id: session.user.id,
              period_start: periodStart,
              searches_used: 0,
              listings_added: 0,
            })
            .select('listings_added')
            .single();

          setUsage(newUsage || { listings_added: 0 });
        }
      } else {
        setUsage(usageData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  const listingsRemaining = user?.subscription_tier === 'free'
    ? 10 - (usage?.listings_added || 0)
    : user?.subscription_tier === 'starter'
    ? 50 - (usage?.listings_added || 0)
    : 200 - (usage?.listings_added || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTQwYWYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0xMCA0MGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">Compr</h1>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">{user?.email}</div>
              <button
                onClick={handleLogout}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Seller Dashboard</h2>
          <p className="text-lg text-slate-600">Cross-list your items to all major marketplaces</p>
        </div>

        {/* Usage Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-slate-900">This Month's Usage</h3>
            <span className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full text-sm font-medium capitalize">
              {user?.subscription_tier} Plan
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Listings Added</p>
              <p className="text-3xl font-bold text-slate-900">{usage?.listings_added || 0}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Remaining This Month</p>
              <p className="text-3xl font-bold text-slate-900">{listingsRemaining}</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Cross-Listing Tool Coming Soon</h3>
            <p className="text-lg text-slate-600 mb-6">
              We're building an amazing tool to help you cross-list your items to eBay, Mercari, Poshmark, Depop, and Etsy in one click.
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-slate-900 mb-3">What to expect:</h4>
              <ul className="text-left space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Upload item photos and details once</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Automatically post to all selected platforms</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>See profit estimates after fees for each platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Manage all listings from one dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>Track which platforms sell fastest</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-slate-500">
              In the meantime, check out the buyer side to find the best deals across marketplaces
            </p>
          </div>
        </div>

        {/* Subscription Options */}
        {user?.subscription_tier === 'free' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-slate-900 mb-3">Upgrade Your Plan</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-medium text-slate-900">Starter</span>
                  <span className="text-2xl font-bold text-slate-900">$15<span className="text-sm text-slate-600">/mo</span></span>
                </div>
                <p className="text-sm text-slate-600">50 listings per month</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-medium text-slate-900">Pro</span>
                  <span className="text-2xl font-bold text-slate-900">$30<span className="text-sm text-slate-600">/mo</span></span>
                </div>
                <p className="text-sm text-slate-600">200 listings per month</p>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
