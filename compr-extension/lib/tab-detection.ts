/**
 * Tab Detection Utility
 *
 * Detects whether the current page is running in a background tab and provides
 * adaptive delay functions that skip unnecessary setTimeout delays in background tabs.
 *
 * Chrome throttles setTimeout to 1 second minimum in background tabs (when document.hidden === true),
 * which causes massive slowdowns in automation. This utility helps bypass those limitations.
 */

/**
 * Check if the current tab is in the background (not visible to the user)
 * @returns true if the tab is hidden/background, false if visible/foreground
 */
export function isBackgroundTab(): boolean {
  return document.hidden;
}

/**
 * Get adaptive delay based on tab visibility state
 *
 * In background tabs: Returns 0 (no delay) or minimal delay for event loop
 * In foreground tabs: Returns random delay between min and max for human-like behavior
 *
 * @param min Minimum delay in milliseconds (for foreground tabs)
 * @param max Maximum delay in milliseconds (for foreground tabs)
 * @param minimalDelay If true, use 10ms delay in background instead of 0 (for event loop processing)
 * @returns Promise that resolves after the appropriate delay
 */
export function getAdaptiveDelay(min: number, max: number, minimalDelay: boolean = false): Promise<void> {
  if (isBackgroundTab()) {
    // In background: skip delays to avoid Chrome's 1-second throttling
    const delay = minimalDelay ? 10 : 0;
    if (delay === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, delay));
  } else {
    // In foreground: use random delays for human-like behavior
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Wait for a specific amount of time, but only if necessary
 *
 * Some delays are essential (network operations, platform processing time).
 * This function respects those delays even in background tabs.
 *
 * @param ms Milliseconds to wait
 * @returns Promise that resolves after the specified time
 */
export function essentialDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log visibility state (useful for debugging)
 * @param context Context string to identify where the log is from
 */
export function logVisibilityState(context: string): void {
  const state = isBackgroundTab() ? 'BACKGROUND' : 'FOREGROUND';
  console.log(`[${context}] Tab state: ${state} (document.hidden=${document.hidden})`);
}

/**
 * Register a visibility change listener
 * @param callback Function to call when visibility changes
 * @returns Function to remove the listener
 */
export function onVisibilityChange(callback: (isBackground: boolean) => void): () => void {
  const handler = () => {
    callback(isBackgroundTab());
  };

  document.addEventListener('visibilitychange', handler);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handler);
  };
}
