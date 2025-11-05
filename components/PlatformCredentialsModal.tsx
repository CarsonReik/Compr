'use client';

import { useState } from 'react';

interface PlatformCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  platformName: string;
  onVerify: () => Promise<void>;
}

export default function PlatformCredentialsModal({
  isOpen,
  onClose,
  platform,
  platformName,
  onVerify,
}: PlatformCredentialsModalProps) {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    setVerifying(true);

    try {
      await onVerify();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify connection');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    if (!verifying) {
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-6 border-b border-border">
          <h3 className="text-xl font-bold text-foreground">
            Connect {platformName}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Verify your {platformName} login session
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-foreground mb-2">Instructions</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>A new tab has opened to {platformName}</li>
                  <li>Log in to your {platformName} account if not already logged in</li>
                  <li>Come back to this page and click "Verify Connection" below</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">⚠️ Terms of Service</p>
            <p>Automated posting may violate {platformName}'s Terms of Service. Use at your own risk. You are responsible for compliance with platform policies.</p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={verifying}
              className="flex-1 px-4 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="flex-1 px-4 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? 'Verifying...' : 'Verify Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
