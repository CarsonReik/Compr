'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExtensionInstallPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [extensionConnected, setExtensionConnected] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      checkExtensionStatus();
      // Poll for extension connection every 3 seconds
      const interval = setInterval(checkExtensionStatus, 3000);
      return () => clearInterval(interval);
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
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const checkExtensionStatus = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('extension_connected, extension_last_seen')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Consider extension connected if it was seen in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const lastSeen = data?.extension_last_seen ? new Date(data.extension_last_seen) : null;
      const isRecent = lastSeen && lastSeen > fiveMinutesAgo;

      setExtensionConnected(data?.extension_connected && isRecent);
    } catch (error) {
      console.error('Error checking extension status:', error);
    }
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
              <Link
                href="/seller/connections"
                className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Connections
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Success State */}
        {extensionConnected ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Extension Connected!</h2>
            <p className="text-muted-foreground mb-6">
              Your Chrome extension is installed and connected. You can now use Poshmark, Mercari, and Depop.
            </p>
            <Link
              href="/seller/connections"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Go to Connections
            </Link>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-purple-500 rounded-2xl flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-lg">
                ⚡
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Install the Compr Chrome Extension
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Enable seamless crosslisting to Poshmark, Mercari, and Depop with browser automation
              </p>
            </div>

            {/* Installation Steps */}
            <div className="bg-card border border-border rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Installation Steps</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Download from Chrome Web Store</h3>
                    <p className="text-muted-foreground mb-3">
                      Click the button below to visit the Chrome Web Store and install the extension.
                    </p>
                    <a
                      href="https://chrome.google.com/webstore/detail/compr-extension/YOUR_EXTENSION_ID"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-6 py-3 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Install from Chrome Web Store
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Pin the Extension</h3>
                    <p className="text-muted-foreground">
                      After installation, click the puzzle piece icon in your Chrome toolbar and pin the Compr extension for easy access.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Connect Your Account</h3>
                    <p className="text-muted-foreground">
                      Click the extension icon and log in with your Compr account. The extension will automatically connect.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">You're Ready!</h3>
                    <p className="text-muted-foreground">
                      Once connected, you can crosslist to Poshmark, Mercari, and Depop with a single click.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Waiting for Connection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="animate-pulse mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto"></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for extension to connect...
              </p>
            </div>

            {/* Features */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-semibold text-foreground mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Crosslist items in seconds with automated form filling and image uploads
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-semibold text-foreground mb-2">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Uses your own browser session - no credentials stored on our servers
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-foreground mb-2">Works Seamlessly</h3>
                <p className="text-sm text-muted-foreground">
                  Runs in the background - crosslist while you browse or work on other tasks
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
