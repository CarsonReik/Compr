/**
 * React hook to automatically connect the Chrome extension
 * when user is logged into Compr
 */

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useExtensionConnection() {
  const [extensionReady, setExtensionReady] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  useEffect(() => {
    // Listen for extension ready message
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'EXTENSION_READY') {
        console.log('Extension is ready');
        setExtensionReady(true);
      } else if (event.data.type === 'EXTENSION_CONNECTED') {
        console.log('Extension connected:', event.data.payload);
        setExtensionConnected(event.data.payload.success);
      }
    };

    window.addEventListener('message', handleMessage);

    // Immediately trigger connection in case extension loaded before this hook
    // (race condition where content script runs at document_start but React loads later)
    console.log('Checking if extension is already ready...');

    // Small delay to let content script initialize
    setTimeout(() => {
      console.log('Triggering extension connection attempt...');
      setExtensionReady(true);
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!extensionReady) {
      return;
    }

    // Get user session and connect extension
    const connectExtension = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('No session, skipping extension connection');
          return;
        }

        const userId = session.user.id;
        const authToken = session.access_token;

        console.log('Connecting extension with userId:', userId);

        // Send message to content script
        window.postMessage(
          {
            type: 'CONNECT_EXTENSION',
            payload: {
              userId,
              authToken,
            },
          },
          window.location.origin
        );
      } catch (error) {
        console.error('Failed to connect extension:', error);
      }
    };

    connectExtension();
  }, [extensionReady]);

  return {
    extensionReady,
    extensionConnected,
  };
}
