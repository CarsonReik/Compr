'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // Generate access token from the session and save to localStorage
      fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          // Store token in localStorage for auto-activation
          localStorage.setItem('compr_access_token', data.token);
          // Redirect to homepage
          router.push('/');
        })
        .catch((err) => {
          console.error('Error generating token:', err);
          // Redirect anyway
          router.push('/');
        });
    } else {
      // No session ID, redirect to homepage
      router.push('/');
    }
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Processing your payment...</p>
      </div>
    </div>
  );
}
