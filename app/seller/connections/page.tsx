'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PlatformCredentialsModal from '@/components/PlatformCredentialsModal';
import SuccessModal from '@/components/SuccessModal';
import ConfirmModal from '@/components/ConfirmModal';

interface PlatformConnection {
  id: string;
  platform: string;
  platform_username: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type Platform = 'ebay' | 'etsy' | 'poshmark' | 'mercari' | 'depop';

const platformInfo: Record<Platform, { name: string; color: string; description: string; hasOAuth: boolean }> = {
  ebay: {
    name: 'eBay',
    color: 'bg-blue-500',
    description: 'Connect your eBay seller account to list items',
    hasOAuth: true,
  },
  etsy: {
    name: 'Etsy',
    color: 'bg-orange-500',
    description: 'Connect your Etsy shop to list handmade and vintage items',
    hasOAuth: true,
  },
  poshmark: {
    name: 'Poshmark',
    color: 'bg-purple-500',
    description: 'Connect with credentials - Browser automation for Poshmark listings',
    hasOAuth: false,
  },
  mercari: {
    name: 'Mercari',
    color: 'bg-red-500',
    description: 'Coming soon - Browser automation for Mercari listings',
    hasOAuth: false,
  },
  depop: {
    name: 'Depop',
    color: 'bg-pink-500',
    description: 'Coming soon - CSV upload or browser automation',
    hasOAuth: false,
  },
};

export default function ConnectionsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [hasExtension, setHasExtension] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [platformToDisconnect, setPlatformToDisconnect] = useState<Platform | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchConnections();
      checkExtensionStatus();
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

  const fetchConnections = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
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

      setHasExtension(data?.extension_connected && isRecent);
    } catch (error) {
      console.error('Error checking extension status:', error);
      setHasExtension(false);
    }
  };

  const isConnected = (platform: Platform): boolean => {
    return connections.some(conn => conn.platform === platform && conn.is_active);
  };

  const getConnection = (platform: Platform): PlatformConnection | undefined => {
    return connections.find(conn => conn.platform === platform);
  };

  const handleConnect = async (platform: Platform) => {
    if (!userId) return;

    setConnecting(platform);

    try {
      if (platform === 'ebay') {
        // Get auth token to pass to API
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          alert('Please log in again');
          router.push('/login');
          return;
        }

        // Redirect to eBay OAuth
        const response = await fetch('/api/auth/ebay/authorize', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          alert('Failed to initiate eBay connection: ' + (data.error || 'Unknown error'));
          setConnecting(null);
        }
      } else if (platform === 'etsy') {
        // Redirect to Etsy OAuth
        alert('Etsy OAuth coming soon!');
        setConnecting(null);
      } else if (platform === 'poshmark' || platform === 'mercari' || platform === 'depop') {
        // Show verification modal first, then user can open the platform
        setSelectedPlatform(platform);
        setShowCredentialsModal(true);
        setConnecting(null);
      } else {
        // Not yet implemented
        alert(`${platformInfo[platform].name} connection coming soon!`);
        setConnecting(null);
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Please try again.');
      setConnecting(null);
    }
  };

  const handleDisconnect = (platform: Platform) => {
    setPlatformToDisconnect(platform);
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    if (!userId || !platformToDisconnect) return;

    try {
      const connection = getConnection(platformToDisconnect);
      if (!connection) return;

      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;

      // Refresh connections
      await fetchConnections();
    } catch (error) {
      console.error('Disconnect error:', error);
      // Could show an error modal here too
    }
  };

  const handleVerifyConnection = async () => {
    if (!userId || !selectedPlatform) return;

    try {
      // Check if extension is available
      if (!hasExtension) {
        throw new Error('Chrome extension is not installed or connected. Please install the extension first.');
      }

      // Send verification request to extension
      const verificationResult = await new Promise<{success: boolean; error?: string}>((resolve) => {
        // Set up listener for extension response
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'SESSION_VERIFIED') {
            window.removeEventListener('message', handleMessage);
            resolve(event.data.payload);
          }
        };

        window.addEventListener('message', handleMessage);

        // Send verification request to extension via bridge
        window.postMessage({
          type: 'VERIFY_SESSION',
          payload: {
            platform: selectedPlatform,
          }
        }, window.location.origin);

        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          resolve({ success: false, error: 'Session verification timed out. Please try again.' });
        }, 30000);
      });

      if (!verificationResult.success) {
        throw new Error(verificationResult.error || 'Not logged in. Please log in to the platform first, then try again.');
      }

      // If verification successful, save connection to database
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/platform/verify-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          platform: selectedPlatform,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify connection');
      }

      // Refresh connections
      await fetchConnections();

      // Show success modal
      setSuccessMessage(`You can now crosslist items to ${platformInfo[selectedPlatform].name}.`);
      setShowCredentialsModal(false);
      setShowSuccessModal(true);
      setSelectedPlatform(null);
    } catch (error) {
      console.error('Error verifying connection:', error);
      throw error;
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
                <Link
                  href="/seller/listings"
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Listings
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
        <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">Connect Platforms</h2>
            <p className="text-muted-foreground mt-2">
              Connect your seller accounts to start cross-listing. You'll be redirected to each platform to authorize Compr.
            </p>
          </div>

          {/* Connection Status Banner */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {connections.filter(c => c.is_active).length} platform{connections.filter(c => c.is_active).length !== 1 ? 's' : ''} connected
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connect at least one platform to start listing items
                </p>
              </div>
              {connections.filter(c => c.is_active).length === 0 && (
                <div className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
                  No platforms connected
                </div>
              )}
            </div>
          </div>

          {/* Extension Required Banner */}
          {!hasExtension && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    ⚡
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground mb-2">Chrome Extension Required</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    To connect to Poshmark, Mercari, and Depop, you'll need to install our Chrome extension.
                    The extension enables browser automation to crosslist your items seamlessly.
                  </p>
                  <a
                    href="/extension-install"
                    className="inline-block px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Install Chrome Extension
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Platform Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {(Object.keys(platformInfo) as Platform[])
              .filter((platform) => {
                // Show OAuth platforms (eBay, Etsy) always
                if (platformInfo[platform].hasOAuth) return true;
                // Only show non-OAuth platforms if extension is installed
                return hasExtension;
              })
              .map((platform) => {
              const info = platformInfo[platform];
              const connection = getConnection(platform);
              const connected = isConnected(platform);

              return (
                <div
                  key={platform}
                  className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  {/* Platform Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${info.color} rounded-lg flex items-center justify-center text-white font-bold text-xl`}>
                        {info.name[0]}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{info.name}</h3>
                        {connected && connection?.platform_username && (
                          <p className="text-sm text-muted-foreground">@{connection.platform_username}</p>
                        )}
                      </div>
                    </div>
                    {connected && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        Connected ✓
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground text-sm mb-6">
                    {info.description}
                  </p>

                  {/* Connection Info */}
                  {connected && connection && (
                    <div className="bg-muted rounded-lg p-3 mb-4 text-sm">
                      <p className="text-muted-foreground">
                        Connected on {new Date(connection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {connected ? (
                    <button
                      onClick={() => handleDisconnect(platform)}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : info.hasOAuth ? (
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={connecting === platform}
                      className="w-full px-4 py-2 bg-accent text-accent-foreground font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting === platform ? 'Connecting...' : `Connect ${info.name}`}
                    </button>
                  ) : platform === 'poshmark' || platform === 'mercari' || platform === 'depop' ? (
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={connecting === platform}
                      className="w-full px-4 py-2 bg-accent text-accent-foreground font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting === platform ? 'Connecting...' : `Connect ${info.name}`}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-muted text-muted-foreground font-medium rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Help Text */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-foreground mb-2">What happens when you connect?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• You'll be redirected to the platform's authorization page</li>
              <li>• Log in with your seller account credentials</li>
              <li>• Authorize Compr to create and manage listings on your behalf</li>
              <li>• You'll be redirected back to Compr once connected</li>
              <li>• You can disconnect at any time from this page</li>
            </ul>
          </div>
        </main>
      </div>

      {/* Verification Modal */}
      {selectedPlatform && (
        <PlatformCredentialsModal
          isOpen={showCredentialsModal}
          onClose={() => {
            setShowCredentialsModal(false);
            setSelectedPlatform(null);
          }}
          platform={selectedPlatform}
          platformName={platformInfo[selectedPlatform].name}
          onVerify={handleVerifyConnection}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Platform Connected"
        message={successMessage}
      />

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => {
          setShowDisconnectModal(false);
          setPlatformToDisconnect(null);
        }}
        onConfirm={confirmDisconnect}
        title="Disconnect Platform"
        message={platformToDisconnect ? `Are you sure you want to disconnect ${platformInfo[platformToDisconnect].name}? You'll need to reconnect to post new listings.` : ''}
        confirmText="Disconnect"
        cancelText="Cancel"
        isDangerous={true}
      />
    </div>
  );
}
