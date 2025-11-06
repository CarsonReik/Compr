'use client';

import { useEffect, useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
}: SuccessModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay to allow the transition to work
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: isAnimating ? 'auto' : 'none' }}
    >
      <div
        className={`bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connection successful
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/50 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
