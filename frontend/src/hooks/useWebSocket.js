/**
 * useWebSocket — Native WebSocket hook with exponential backoff reconnect.
 *
 * @param {string} url - WebSocket URL
 * @param {object} options
 *   @param {function} options.onMessage - Called with parsed JSON data on each message
 *   @param {number}   options.reconnectDelay - Base delay in ms (default 3000)
 *   @param {number}   options.maxRetries - Max reconnect attempts (default 10)
 *   @param {boolean}  options.enabled - Connect only when true (default true)
 */
import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url, options = {}) {
  const {
    onMessage,
    reconnectDelay = 3000,
    maxRetries = 10,
    enabled = true,
  } = options;

  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState("idle"); // idle|connecting|open|closed|error

  // Keep onMessage ref current without re-triggering connect
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled || !url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("open");
      retryRef.current = 0;
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("closed");

      if (retryRef.current < maxRetries) {
        retryRef.current += 1;
        // Exponential backoff: 3s, 6s, 12s, 24s, 48s (max)
        const delay =
          reconnectDelay * Math.pow(2, Math.min(retryRef.current - 1, 4));
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("error");
    };

    wsRef.current = ws;
  }, [url, enabled, reconnectDelay, maxRetries]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect, enabled]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}
