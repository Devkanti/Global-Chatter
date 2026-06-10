import { io } from 'socket.io-client';

// Connect to the backend socket server
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: false // We will connect manually once the user enters a username
});
