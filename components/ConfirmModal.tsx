'use client';

import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
}: ConfirmModalProps) {
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

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: isAnimating ? 'auto' : 'none' }}
    >
      <div
        className={`bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden transition-all duration-200 ease-out ${
          isAnimating ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${isDangerous ? 'from-red-500/10 via-red-500/5' : 'from-accent/10 via-accent/5'} to-transparent p-6 border-b border-border`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${isDangerous ? 'bg-red-500/20' : 'bg-accent/20'} flex items-center justify-center`}>
              <svg
                className={`w-6 h-6 ${isDangerous ? 'text-red-500' : 'text-accent'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Please confirm your action
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-muted-foreground">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/50 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 font-semibold rounded-lg transition-colors ${
              isDangerous
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-accent text-accent-foreground hover:bg-accent/90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
