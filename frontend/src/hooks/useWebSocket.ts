import { useEffect, useRef } from 'react';

type WSEvent = {
  type: string;
  project_id: string;
  payload: any;
};

export const useWebSocket = (projectId: string | undefined, onEvent: (event: WSEvent) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!projectId) return;


    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const host = apiUrl.replace(/^https?:\/\//, '');
    const url = `${protocol}//${host}/ws/${projectId}`;

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('connected to websocket');
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WSEvent = JSON.parse(event.data);
          onEvent(data);
        } catch (err) {
          console.error('failed to parse ws message', err);
        }
      };

      ws.current.onclose = () => {
        console.log('websocket disconnected, retrying in 3s...');
        setTimeout(connect, 3000);
      };

      ws.current.onerror = (err) => {
        console.error('websocket error', err);
        ws.current?.close();
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect on unmount
        ws.current.close();
      }
    };
  }, [projectId, onEvent]);

  return ws.current;
};

