import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const getWsUrl = () => {
  const host =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "localhost";
  const protocol =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss:"
      : "ws:";
  return `${protocol}//${host}:8000/ws/chat/`;
};

type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

type MessageHandler = (msg: WebSocketMessage) => void;

/**
 * Singleton WebSocket manager.
 * Maintains a single WebSocket connection shared across all hooks.
 * Auto-reconnects with exponential backoff.
 */
class WebSocketManager {
  private static instance: WebSocketManager | null = null;

  private ws: WebSocket | null = null;
  private status: WebSocketStatus = "disconnected";
  private handlers: Set<MessageHandler> = new Set();
  private statusListeners: Set<(s: WebSocketStatus) => void> = new Set();
  private subscribedChannels: Map<string, number> = new Map(); // channel -> refcount
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;
  private token: string | null = null;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      this.setStatus("error");
      return;
    }

    // Already connected or connecting with same token
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING) &&
      this.token === token
    ) {
      return;
    }

    this.token = token;
    this.cleanup();
    this.setStatus("connecting");

    const wsUrl = `${getWsUrl()}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.setStatus("connected");

      // Re-subscribe to all channels that were tracked
      for (const channel of this.subscribedChannels.keys()) {
        this.sendRaw({ action: "subscribe", channel });
      }
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        this.handlers.forEach((handler) => handler(data));
      } catch {
        console.warn("[WS] Failed to parse message:", event.data);
      }
    };

    ws.onclose = (event) => {
      this.ws = null;
      if (event.code === 4001 || event.code === 4002 || event.code === 4003) {
        // Auth failure, don't reconnect
        this.setStatus("error");
        return;
      }
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };

    this.ws = ws;
  }

  disconnect() {
    this.cleanup();
    this.setStatus("disconnected");
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      this.maxReconnectDelay
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setStatus(status: WebSocketStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }

  private sendRaw(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribe(channel: string) {
    const count = this.subscribedChannels.get(channel) || 0;
    this.subscribedChannels.set(channel, count + 1);
    if (count === 0) {
      this.sendRaw({ action: "subscribe", channel });
    }
  }

  unsubscribe(channel: string) {
    const count = this.subscribedChannels.get(channel) || 0;
    if (count <= 1) {
      this.subscribedChannels.delete(channel);
      this.sendRaw({ action: "unsubscribe", channel });
    } else {
      this.subscribedChannels.set(channel, count - 1);
    }
  }

  send(action: string, channel: string, data: Record<string, unknown> = {}) {
    this.sendRaw({ action, channel, data });
  }

  addHandler(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  removeHandler(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  addStatusListener(listener: (s: WebSocketStatus) => void) {
    this.statusListeners.add(listener);
  }

  removeStatusListener(listener: (s: WebSocketStatus) => void) {
    this.statusListeners.delete(listener);
  }
}

/**
 * Core hook that connects to the WebSocket and listens for messages.
 * Should be mounted once at a high level in the app (e.g. EspaceLayout).
 * All child hooks (useNotifications, useMessage) listen to the same singleton.
 */
export function useWebSocket() {
  const managerRef = useRef(WebSocketManager.getInstance());
  const [status, setStatus] = useState<WebSocketStatus>(
    managerRef.current.getStatus()
  );

  useEffect(() => {
    const manager = managerRef.current;

    manager.addStatusListener(setStatus);
    manager.connect();

    return () => {
      manager.removeStatusListener(setStatus);
    };
  }, []);

  const subscribe = useCallback((channel: string) => {
    managerRef.current.subscribe(channel);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    managerRef.current.unsubscribe(channel);
  }, []);

  const send = useCallback(
    (action: string, channel: string, data?: Record<string, unknown>) => {
      managerRef.current.send(action, channel, data);
    },
    []
  );

  const addHandler = useCallback((handler: MessageHandler) => {
    managerRef.current.addHandler(handler);
  }, []);

  const removeHandler = useCallback((handler: MessageHandler) => {
    managerRef.current.removeHandler(handler);
  }, []);

  return { status, subscribe, unsubscribe, send, addHandler, removeHandler };
}

/**
 * Hook that auto-invalidates React Query caches when WebSocket events arrive.
 * Mount this once alongside useWebSocket at a high level.
 */
export function useWebSocketQuerySync() {
  const queryClient = useQueryClient();
  const { status } = useWebSocket();

  // Failsafe fallback: if WebSocket drops or is connecting, poll every 6s so data is never stuck
  useEffect(() => {
    if (status !== "connected") {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
      }, 6000);

      return () => clearInterval(interval);
    }
  }, [status, queryClient]);

  useEffect(() => {
    const manager = WebSocketManager.getInstance();

    const handler: MessageHandler = (msg) => {
      // Refresh messages, conversations, notifications, propositions, missions in real-time
      if (
        msg.type === "new_message" ||
        msg.type === "notification" ||
        msg.type === "message_read"
      ) {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
        queryClient.invalidateQueries({ queryKey: ["propositions"] });
        queryClient.invalidateQueries({ queryKey: ["propositions-freelance-espace"] });
        queryClient.invalidateQueries({ queryKey: ["propositions-announcer-espace"] });
        queryClient.invalidateQueries({ queryKey: ["missions"] });
        queryClient.invalidateQueries({ queryKey: ["available-missions"] });
      }
    };

    manager.addHandler(handler);
    return () => {
      manager.removeHandler(handler);
    };
  }, [queryClient]);
}

export { WebSocketManager };
export type { WebSocketStatus, WebSocketMessage, MessageHandler };
