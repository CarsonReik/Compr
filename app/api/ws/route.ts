/**
 * WebSocket server for Chrome Extension communication
 *
 * Note: Next.js doesn't natively support WebSocket in API routes.
 * This is a custom implementation using the Web Streams API.
 *
 * For production, you may want to use a separate WebSocket server
 * (e.g., with ws library on a Node.js server) or a service like Ably/Pusher.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store active connections
const connections = new Map<string, {
  userId: string;
  send: (message: any) => void;
}>();

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');

  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  // Note: This is a placeholder implementation
  // Next.js 15 doesn't support WebSocket upgrades in Edge Runtime
  //
  // For production, you have several options:
  //
  // 1. Use Server-Sent Events (SSE) instead:
  //    - Extension initiates connection to /api/ws/stream
  //    - Backend sends events via SSE
  //    - Extension sends messages via POST to /api/ws/message
  //
  // 2. Use a third-party WebSocket service:
  //    - Pusher, Ably, Socket.io Cloud
  //
  // 3. Deploy a separate WebSocket server:
  //    - On the same VPS as your automation worker
  //    - Use ws or socket.io library
  //
  // 4. Use Chrome Extension native messaging:
  //    - Web app uses chrome.runtime.sendMessage()
  //    - Only works when user is on compr.co

  return new Response(
    JSON.stringify({
      error: 'WebSocket not supported in this environment',
      alternatives: [
        'Server-Sent Events (SSE) for server->client',
        'HTTP POST for client->server',
        'Third-party WebSocket service (Pusher, Ably)',
        'Separate WebSocket server',
      ],
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Alternative: SSE implementation
 * Extension can use this for receiving messages from backend
 */
export async function POST(request: NextRequest) {
  // This would be the endpoint for extension to send messages to backend
  const body = await request.json();
  const { userId, authToken, message } = body;

  // Validate auth
  if (!userId || !authToken) {
    return Response.json({ error: 'Missing authentication' }, { status: 401 });
  }

  // Validate user exists
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return Response.json({ error: 'Invalid user' }, { status: 401 });
  }

  // Handle message
  console.log('Received message from extension:', message);

  // Process message based on type
  switch (message.type) {
    case 'CONNECTION_STATUS':
      // Store connection info
      return Response.json({ success: true, connected: true });

    case 'SUCCESS':
    case 'ERROR':
      // Update listing status in database
      await handleListingResult(message.payload);
      return Response.json({ success: true });

    case 'LISTING_PROGRESS':
      // Update progress (could broadcast via SSE to web app)
      return Response.json({ success: true });

    default:
      return Response.json({ error: 'Unknown message type' }, { status: 400 });
  }
}

async function handleListingResult(payload: any) {
  const { listingId, platform, platformListingId, platformUrl, error } = payload;

  if (error) {
    // Update job as failed
    await supabase
      .from('crosslisting_jobs')
      .update({
        status: 'failed',
        error_message: error,
        completed_at: new Date().toISOString(),
      })
      .eq('listing_id', listingId)
      .eq('platform', platform);
  } else {
    // Create platform_listing record
    await supabase.from('platform_listings').upsert({
      listing_id: listingId,
      platform,
      platform_listing_id: platformListingId,
      platform_url: platformUrl,
      status: 'active',
      listed_at: new Date().toISOString(),
    });

    // Update job as completed
    await supabase
      .from('crosslisting_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('listing_id', listingId)
      .eq('platform', platform);
  }
}
