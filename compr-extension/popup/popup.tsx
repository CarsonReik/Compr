/**
 * Extension popup UI
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Platform, PlatformConnection } from '../lib/types';
import { STORAGE_KEYS } from '../lib/constants';
import './styles.css';

interface PopupState {
  connected: boolean;
  userId: string | null;
  platforms: PlatformConnection[];
  autoDelete: boolean;
  checkInterval: number;
  notifications: boolean;
}

function Popup() {
  const [state, setState] = useState<PopupState>({
    connected: false,
    userId: null,
    platforms: [],
    autoDelete: true,
    checkInterval: 10,
    notifications: true,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState();

    // Listen for connection status updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'CONNECTION_STATUS') {
        setState((prev) => ({
          ...prev,
          connected: message.payload.connected,
          userId: message.payload.userId,
        }));
      }
    });
  }, []);

  const loadState = async () => {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.PLATFORM_CONNECTIONS,
        STORAGE_KEYS.SETTINGS,
      ]);

      const settings = result[STORAGE_KEYS.SETTINGS] || {};

      // Check connection status
      const response = await chrome.runtime.sendMessage({ type: 'CONNECTION_STATUS' });

      setState({
        connected: response?.connected || false,
        userId: result[STORAGE_KEYS.USER_ID] || null,
        platforms: result[STORAGE_KEYS.PLATFORM_CONNECTIONS] || [],
        autoDelete: settings.autoDelete !== undefined ? settings.autoDelete : true,
        checkInterval: settings.checkInterval || 10,
        notifications: settings.notifications !== undefined ? settings.notifications : true,
      });
    } catch (error) {
      console.error('Failed to load state:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPlatformStatus = async (platform: Platform) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PLATFORM_STATUS',
        payload: { platform },
      });

      // Update platform connection status
      setState((prev) => ({
        ...prev,
        platforms: prev.platforms.map((p) =>
          p.platform === platform
            ? { ...p, loggedIn: response.loggedIn, lastChecked: Date.now() }
            : p
        ),
      }));
    } catch (error) {
      console.error(`Failed to check ${platform} status:`, error);
    }
  };

  const triggerManualSaleCheck = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'MANUAL_SALE_CHECK' });
      alert('Sale detection check started!');
    } catch (error) {
      console.error('Failed to trigger sale check:', error);
      alert('Failed to start sale check');
    }
  };

  const updateSettings = async (updates: Partial<PopupState>) => {
    const newSettings = {
      autoDelete: updates.autoDelete !== undefined ? updates.autoDelete : state.autoDelete,
      checkInterval: updates.checkInterval !== undefined ? updates.checkInterval : state.checkInterval,
      notifications: updates.notifications !== undefined ? updates.notifications : state.notifications,
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: newSettings,
    });

    setState((prev) => ({ ...prev, ...updates }));
  };

  const openComprDashboard = () => {
    chrome.tabs.create({ url: 'https://compr.co/seller/listings' });
  };

  if (loading) {
    return (
      <div className="popup">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="popup">
      <header className="header">
        <h1>Compr Crosslisting</h1>
        <div className={`status ${state.connected ? 'connected' : 'disconnected'}`}>
          {state.connected ? '● Connected' : '○ Disconnected'}
        </div>
      </header>

      <main className="content">
        {!state.userId ? (
          <div className="setup-message">
            <p>Please log in to Compr to get started.</p>
            <button className="btn btn-primary" onClick={openComprDashboard}>
              Open Compr Dashboard
            </button>
          </div>
        ) : (
          <>
            <section className="section">
              <h2>Platform Connections</h2>
              <div className="platforms">
                {['poshmark', 'mercari', 'depop'].map((platform) => {
                  const connection = state.platforms.find((p) => p.platform === platform);
                  const loggedIn = connection?.loggedIn || false;

                  return (
                    <div key={platform} className="platform-item">
                      <div className="platform-info">
                        <span className="platform-name">
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </span>
                        <span className={`platform-status ${loggedIn ? 'active' : 'inactive'}`}>
                          {loggedIn ? '✓ Connected' : 'Not logged in'}
                        </span>
                      </div>
                      <button
                        className="btn btn-small"
                        onClick={() => checkPlatformStatus(platform as Platform)}
                      >
                        Check
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="help-text">
                Log in to each platform in your browser, then click "Check" to verify connection.
              </p>
            </section>

            <section className="section">
              <h2>Auto-Delete Settings</h2>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={state.autoDelete}
                    onChange={(e) => updateSettings({ autoDelete: e.target.checked })}
                  />
                  <span>Enable auto-delete when item sells</span>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <span>Check for sales every:</span>
                  <select
                    value={state.checkInterval}
                    onChange={(e) => updateSettings({ checkInterval: parseInt(e.target.value) })}
                    disabled={!state.autoDelete}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={state.notifications}
                    onChange={(e) => updateSettings({ notifications: e.target.checked })}
                  />
                  <span>Show notifications</span>
                </label>
              </div>
              <button
                className="btn btn-secondary"
                onClick={triggerManualSaleCheck}
                disabled={!state.autoDelete}
              >
                Check for Sales Now
              </button>
            </section>

            <section className="section">
              <button className="btn btn-primary btn-full" onClick={openComprDashboard}>
                Open Compr Dashboard
              </button>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <small>v1.0.0</small>
      </footer>
    </div>
  );
}

// Render popup
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Popup />);
