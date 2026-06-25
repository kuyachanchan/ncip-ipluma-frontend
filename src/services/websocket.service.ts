// services/websocket.service.ts
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private messageHandlers: Map<string, (message: any) => void> = new Map();
  private pendingMessages: Array<{ destination: string; body: any }> = []; // Queue for pending messages
  private connectCallbacks: Array<() => void> = [];

  connect(onConnected?: () => void, onError?: (error: Event) => void): void {
    if (this.client?.connected) {
      console.log('WebSocket already connected');
      onConnected?.();
      return;
    }

    // Store callbacks to execute when connected
    if (onConnected) {
      this.connectCallbacks.push(onConnected);
    }

    // TEST
    /*const WS_URL = import.meta.env.VITE_WS_URL || 'http://172.17.5.70:7777';
    const socket = new SockJS(`${WS_URL}/ws`);
    
    this.client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log('STOMP debug:', str);
        }
      },
    });*/

      // PROD: Apache will proxy to backend
      const WS_URL = import.meta.env.VITE_WS_URL || ''; // Empty means use same origin
      const baseUrl = WS_URL || `${window.location.protocol}//${window.location.host}`;
      
      console.log(`Connecting to WebSocket at: ${baseUrl}/ws`);
      const socket = new SockJS(`${baseUrl}/ws`);
      
      this.client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: (str) => {
          if (import.meta.env.DEV) {
            console.log('STOMP debug:', str);
          }
        },
      });



    this.client.onConnect = () => {
      console.log('✅ Successfully connected to WebSocket');
      this.connectionStatus = 'connected';
      
      // Process any pending messages
      if (this.pendingMessages.length > 0) {
        console.log(`📤 Sending ${this.pendingMessages.length} pending messages...`);
        this.pendingMessages.forEach(msg => {
          this.client?.publish({
            destination: msg.destination,
            body: JSON.stringify(msg.body),
          });
        });
        this.pendingMessages = [];
      }
      
      // Execute all queued connect callbacks
      this.connectCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in connect callback:', error);
        }
      });
      this.connectCallbacks = [];
    };

    this.client.onStompError = (frame) => {
      console.error('❌ STOMP error:', frame);
      this.connectionStatus = 'disconnected';
    };

    this.client.onWebSocketError = (event) => {
      console.error('❌ WebSocket error:', event);
      this.connectionStatus = 'disconnected';
      onError?.(event as Event);
    };

    this.client.onDisconnect = () => {
      console.log('🔌 Disconnected from WebSocket');
      this.connectionStatus = 'disconnected';
    };

    this.client.activate();
  }

  disconnect(): void {
    if (this.client?.connected) {
      this.client.deactivate();
      this.client = null;
      this.subscriptions.clear();
      this.connectionStatus = 'disconnected';
      this.pendingMessages = [];
      this.connectCallbacks = [];
    }
  }

// services/websocket.service.ts - Add logging for all messages
subscribe(topic: string, callback: (message: any) => void): void {
  if (!this.client?.connected) {
    console.warn(`Cannot subscribe to ${topic}: Not connected, will retry...`);
    this.messageHandlers.set(topic, callback);
    
    const trySubscribe = () => {
      if (this.client?.connected) {
        this.subscribe(topic, callback);
      } else {
        setTimeout(trySubscribe, 1000);
      }
    };
    setTimeout(trySubscribe, 1000);
    return;
  }

  const subscription = this.client.subscribe(topic, (message: IMessage) => {
    console.log(`📨 Raw message received on ${topic}:`, message.body);
    try {
      const body = JSON.parse(message.body);
      console.log(`📨 Parsed message on ${topic}:`, body);
      callback(body);
    } catch (error) {
      console.error('Error parsing message:', error);
      callback(message.body);
    }
  });

  this.subscriptions.set(topic, subscription);
  console.log(`📡 Subscribed to ${topic}`);
}

  unsubscribe(topic: string): void {
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
      console.log(`Unsubscribed from ${topic}`);
    }
  }

  sendMessage(destination: string, body: any): void {
    if (!this.client?.connected) {
      console.warn(`⚠️ Cannot send message to ${destination}: Not connected, queuing...`);
      // Queue the message to send when connected
      this.pendingMessages.push({ destination, body });
      
      // Try to reconnect if not connecting
      if (this.connectionStatus !== 'connecting' && !this.client) {
        console.log('Attempting to reconnect...');
        this.connect();
      }
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
    console.log(`📤 Message sent to ${destination}:`, body);
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }
}

export const webSocketService = new WebSocketService();