'use client';

import { useState } from 'react';

interface Props {
  onDismiss: () => void;
  onRetry: () => void;
}

export default function PoshmarkVerificationAlert({ onDismiss, onRetry }: Props) {
  const [step, setStep] = useState<'instructions' | 'verifying'>('instructions');

  const handleVerified = () => {
    setStep('verifying');
    // Wait a moment for user to complete verification, then retry
    setTimeout(() => {
      onRetry();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {step === 'instructions' ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verification Required</h3>
                <p className="text-sm text-gray-600">One-time Poshmark verification needed</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-800 font-medium mb-3">
                Poshmark needs to verify this is really you. Follow these steps:
              </p>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Open <a href="https://poshmark.com/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">Poshmark.com</a> in a new tab</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Log in with your Poshmark credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Check your email for the verification code from Poshmark</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Enter the code on Poshmark to complete verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>Come back here and click "I've Verified"</span>
                </li>
              </ol>
            </div>

            {/* Info box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-green-800">
                <strong>Good news:</strong> You only need to do this once! After verification, all future crosslistings will work automatically.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerified}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                I've Verified ✓
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Verifying state */}
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Verifying and retrying...</h3>
              <p className="text-sm text-gray-600">
                We're attempting to post your listing again. This may take a moment.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
