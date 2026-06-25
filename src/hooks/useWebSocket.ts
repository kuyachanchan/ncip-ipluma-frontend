// hooks/useWebSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService } from '../services/websocket.service';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  topics?: string[];
  onMessage?: (topic: string, message: any) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, topics = [], onMessage, onConnect, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  // ✅ Store latest callbacks in refs to avoid stale closures
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onErrorRef = useRef(onError);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onConnectRef.current = onConnect; }, [onConnect]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // ✅ Stable handler — uses ref so it never goes stale
  const handleMessage = useCallback((topic: string, message: any) => {
    onMessageRef.current?.(topic, message);
  }, []); // empty deps — intentional

  // Subscribe to topics when connected
  useEffect(() => {
    if (!isConnected || topics.length === 0) return;

    topics.forEach(topic => {
      webSocketService.subscribe(topic, (message) => {
        handleMessage(topic, message);
      });
    });

    return () => {
      topics.forEach(topic => {
        webSocketService.unsubscribe(topic);
      });
    };
  // ✅ Use JSON.stringify to deep-compare topics array
  }, [isConnected, JSON.stringify(topics), handleMessage]);

  useEffect(() => {
    if (!autoConnect) return;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      onConnectRef.current?.();
    };

    const handleError = (error: Event) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      onErrorRef.current?.(error);
    };

    webSocketService.connect(handleConnect, handleError);

    const interval = setInterval(() => {
      setConnectionStatus(webSocketService.getConnectionStatus());
      setIsConnected(webSocketService.isConnected());
    }, 1000);

    return () => {
      clearInterval(interval);
      // ✅ Don't disconnect here — shared service used across components
      // webSocketService.disconnect(); 
    };
  }, [autoConnect]); // ✅ No more onConnect/onError in deps

  const sendMessage = useCallback((destination: string, body: any) => {
    webSocketService.sendMessage(destination, body);
  }, []);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
  };
};