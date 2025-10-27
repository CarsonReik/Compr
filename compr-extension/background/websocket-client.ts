/**
 * WebSocket client for maintaining connection to Compr backend
 */

import { WS_CONFIG, STORAGE_KEYS } from '../lib/constants';
import { ExtensionMessage, ConnectionStatus } from '../lib/types';
import { createMessage, isValidMessage, logger } from '../lib/messaging';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;
  private pongTimeout: number | null = null;
  private messageHandlers: Map<string, (message: ExtensionMessage) => void> = new Map();
  private isConnected = false;
  private userId: string | null = null;
  private authToken: string | null = null;

  constructor() {
    this.loadSettings();
  }

  /**
   * Load settings from extension storage
   */
  private async loadSettings(): Promise<void> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.AUTH_TOKEN,
    ]);

    this.userId = result[STORAGE_KEYS.USER_ID] || null;
    this.authToken = result[STORAGE_KEYS.AUTH_TOKEN] || null;

    logger.debug('WebSocket settings loaded', {
      hasUserId: !!this.userId,
      hasAuthToken: !!this.authToken,
    });
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(): string {
    // Check if we're in dev mode (localhost)
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? WS_CONFIG.DEV_URL : WS_CONFIG.PROD_URL;
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.debug('Already connected to WebSocket');
      return;
    }

    await this.loadSettings();

    if (!this.userId || !this.authToken) {
      logger.warn('Cannot connect: missing userId or authToken');
      return;
    }

    const url = this.getWebSocketUrl();
    logger.info('Connecting to WebSocket:', url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    logger.info('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Send authentication message
    this.authenticate();

    // Start heartbeat
    this.startHeartbeat();

    // Notify extension that connection is established
    this.broadcastConnectionStatus(true);
  }

  /**
   * Authenticate with server
   */
  private authenticate(): void {
    const authMessage = createMessage('CONNECTION_STATUS', {
      userId: this.userId,
      authToken: this.authToken,
      extensionVersion: chrome.runtime.getManifest().version,
    });

    this.send(authMessage);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (!isValidMessage(data)) {
        logger.warn('Received invalid message format:', data);
        return;
      }

      logger.debug('Received message:', data.type, data);

      // Handle pong responses
      if (data.type === 'pong') {
        this.handlePong();
        return;
      }

      // Check if there's a handler for this request ID
      const handler = this.messageHandlers.get(data.requestId);
      if (handler) {
        handler(data);
        this.messageHandlers.delete(data.requestId);
        return;
      }

      // Broadcast to all listeners (background script will handle)
      this.notifyMessageReceived(data);
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Event): void {
    logger.error('WebSocket error:', error);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    logger.info('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;

    this.stopHeartbeat();
    this.broadcastConnectionStatus(false);

    // Attempt to reconnect
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    const delay =
      WS_CONFIG.RECONNECT_INTERVAL *
      Math.pow(WS_CONFIG.RECONNECT_BACKOFF_MULTIPLIER, this.reconnectAttempts);

    this.reconnectAttempts++;

    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.pingInterval = window.setInterval(() => {
      this.sendPing();
    }, WS_CONFIG.PING_INTERVAL);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Send ping to server
   */
  private sendPing(): void {
    if (!this.isConnected) return;

    const pingMessage = createMessage('ping', {});
    this.send(pingMessage);

    // Set timeout for pong response
    this.pongTimeout = window.setTimeout(() => {
      logger.warn('Pong timeout - connection may be dead');
      this.disconnect();
      this.scheduleReconnect();
    }, WS_CONFIG.PONG_TIMEOUT);
  }

  /**
   * Handle pong response
   */
  private handlePong(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Send message to server
   */
  public send(message: ExtensionMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug('Sent message:', message.type);
    } catch (error) {
      logger.error('Error sending message:', error);
    }
  }

  /**
   * Send message and wait for response
   */
  public async sendAndWait<T = any>(
    message: ExtensionMessage,
    timeout: number = 60000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(message.requestId);
        reject(new Error('Message timeout'));
      }, timeout);

      this.messageHandlers.set(message.requestId, (response) => {
        clearTimeout(timeoutId);

        if (response.type === 'ERROR') {
          reject(new Error(response.payload.message || 'Unknown error'));
        } else {
          resolve(response.payload);
        }
      });

      this.send(message);
    });
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  public get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Update authentication credentials
   */
  public async updateAuth(userId: string, authToken: string): Promise<void> {
    this.userId = userId;
    this.authToken = authToken;

    await chrome.storage.local.set({
      [STORAGE_KEYS.USER_ID]: userId,
      [STORAGE_KEYS.AUTH_TOKEN]: authToken,
    });

    // Reconnect with new credentials
    this.disconnect();
    await this.connect();
  }

  /**
   * Broadcast connection status to extension
   */
  private broadcastConnectionStatus(connected: boolean): void {
    chrome.runtime.sendMessage(
      createMessage('CONNECTION_STATUS', {
        connected,
        userId: this.userId,
      })
    );
  }

  /**
   * Notify that a message was received
   */
  private notifyMessageReceived(message: ExtensionMessage): void {
    chrome.runtime.sendMessage({
      type: 'WS_MESSAGE_RECEIVED',
      message,
    });
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
