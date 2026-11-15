import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../api/client';

const SOCKET_URL = API_URL.replace(/\/api$/, '');

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const instance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, []);

  return socket;
}
