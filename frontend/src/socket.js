import { io } from 'socket.io-client';

// Connect to the backend socket server
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const socket = io(BACKEND_URL, {
  autoConnect: false // We will connect manually once the user enters a username
});
