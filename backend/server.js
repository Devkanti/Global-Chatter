const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// In-memory datastore 
const socketUsers = new Map(); // socket.id -> { username, roomId }
const roomUsers = new Map(); // roomId -> Set of usernames
const globalUsers = new Set(); // All unique usernames connected to the website
const userProfiles = new Map(); // username -> base64 image string
const userStatuses = new Map(); // username -> 'online' | 'dnd' | 'invisible'
const userStats = new Map(); // username -> { slangCount: 0, suspendedUntil: null }
const userFriends = new Map(); // username -> Set of friends
const userPrivacyMode = new Map(); // username -> boolean
const userPublicKeys = new Map(); // username -> JWK Public Key
const roomMessages = new Map(); // roomId -> Array of message objects
const friendRequests = new Map(); // username -> Set of usernames who requested them

const getStats = (username) => {
  if (!userStats.has(username)) {
    userStats.set(username, { slangCount: 0, suspendedUntil: null });
  }
  return userStats.get(username);
};

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle global login (when they enter username but haven't picked a room yet)
  socket.on('user:login', ({ username, publicKey }) => {
    socket.username = username;
    socket.roomId = 'global';
    
    if (publicKey) {
      userPublicKeys.set(username, publicKey);
    }
    
    if (!userStatuses.has(username)) userStatuses.set(username, 'online');
    if (!userFriends.has(username)) userFriends.set(username, new Set());
    if (!friendRequests.has(username)) friendRequests.set(username, new Set());
    if (!userPrivacyMode.has(username)) userPrivacyMode.set(username, false);
    
    globalUsers.add(username);
    io.emit('global:presence', Array.from(globalUsers));
    socket.emit('profiles:sync', Object.fromEntries(userProfiles));
    socket.emit('user:stats', getStats(username));
    io.emit('statuses:sync', Object.fromEntries(userStatuses));
    socket.emit('friends:sync', Array.from(userFriends.get(username)));
    socket.emit('friend_requests:sync', Array.from(friendRequests.get(username)));
    io.emit('privacy:sync', Object.fromEntries(userPrivacyMode));
    io.emit('keys:sync', Object.fromEntries(userPublicKeys));
  });

  // Handle status update
  socket.on('user:update_status', (status) => {
    if (socket.username) {
      userStatuses.set(socket.username, status);
      io.emit('statuses:sync', Object.fromEntries(userStatuses));
    }
  });

  // Handle display name change
  socket.on('user:change_name', (newName) => {
    if (socket.username && newName && newName.trim() !== '' && newName !== socket.username) {
      if (globalUsers.has(newName)) {
        socket.emit('system:warning', 'Username is already taken.');
        return;
      }

      const oldName = socket.username;
      
      // Update globalUsers
      globalUsers.delete(oldName);
      globalUsers.add(newName);
      
      // Update socketUsers
      const userData = socketUsers.get(socket.id);
      if (userData) {
        userData.username = newName;
      }
      
      // Update roomUsers
      if (socket.roomId && roomUsers.has(socket.roomId)) {
        const roomSet = roomUsers.get(socket.roomId);
        if (roomSet.has(oldName)) {
          roomSet.delete(oldName);
          roomSet.add(newName);
        }
      }

      // Migrate Profiles, Stats, Statuses
      if (userProfiles.has(oldName)) {
        userProfiles.set(newName, userProfiles.get(oldName));
        userProfiles.delete(oldName);
      }
      if (userStats.has(oldName)) {
        userStats.set(newName, userStats.get(oldName));
        userStats.delete(oldName);
      }
      if (userStatuses.has(oldName)) {
        userStatuses.set(newName, userStatuses.get(oldName));
        userStatuses.delete(oldName);
      } else {
        userStatuses.set(newName, 'online');
      }
      
      if (userFriends.has(oldName)) {
        userFriends.set(newName, userFriends.get(oldName));
        userFriends.delete(oldName);
      } else {
        userFriends.set(newName, new Set());
      }
      
      if (friendRequests.has(oldName)) {
        friendRequests.set(newName, friendRequests.get(oldName));
        friendRequests.delete(oldName);
      } else {
        friendRequests.set(newName, new Set());
      }
      
      if (userPrivacyMode.has(oldName)) {
        userPrivacyMode.set(newName, userPrivacyMode.get(oldName));
        userPrivacyMode.delete(oldName);
      } else {
        userPrivacyMode.set(newName, false);
      }

      if (userPublicKeys.has(oldName)) {
        userPublicKeys.set(newName, userPublicKeys.get(oldName));
        userPublicKeys.delete(oldName);
      }
      
      // Update this user's name in everyone else's friend list and friend requests!
      for (const [uName, fSet] of userFriends.entries()) {
        if (fSet.has(oldName)) {
          fSet.delete(oldName);
          fSet.add(newName);
        }
      }
      for (const [uName, rSet] of friendRequests.entries()) {
        if (rSet.has(oldName)) {
          rSet.delete(oldName);
          rSet.add(newName);
        }
      }

      // Update socket.username
      socket.username = newName;

      // Broadcast everything
      socket.emit('name_changed:success', newName);
      io.emit('global:presence', Array.from(globalUsers));
      io.emit('profiles:sync', Object.fromEntries(userProfiles));
      io.emit('statuses:sync', Object.fromEntries(userStatuses));
      io.emit('privacy:sync', Object.fromEntries(userPrivacyMode));
      io.emit('keys:sync', Object.fromEntries(userPublicKeys));
      
      // Push updated friends list to all connected sockets
      for (const [sId, sData] of socketUsers.entries()) {
        const uName = sData.username;
        if (userFriends.has(uName)) {
          io.to(sId).emit('friends:sync', Array.from(userFriends.get(uName)));
        }
        if (friendRequests.has(uName)) {
          io.to(sId).emit('friend_requests:sync', Array.from(friendRequests.get(uName)));
        }
      }
      
      if (socket.roomId) {
        io.to(socket.roomId).emit('presence:update', Array.from(roomUsers.get(socket.roomId) || []));
        io.to(socket.roomId).emit('message:receive', {
          id: generateId(),
          type: 'system',
          text: `${oldName} changed their name to ${newName}.`,
          timestamp: Date.now()
        });
      }
    }
  });

  // Handle profile picture update
  socket.on('user:update_profile', (base64Image) => {
    if (socket.username) {
      userProfiles.set(socket.username, base64Image);
      // Broadcast new profile to everyone
      io.emit('profile:updated', { username: socket.username, avatarUrl: base64Image });
    }
  });

  // Handle Privacy Mode
  socket.on('user:toggle_privacy', () => {
    if (socket.username) {
      const current = userPrivacyMode.get(socket.username) || false;
      userPrivacyMode.set(socket.username, !current);
      io.emit('privacy:sync', Object.fromEntries(userPrivacyMode));
    }
  });

  // Handle Friends and Friend Requests
  const sendRequestSync = (targetUser) => {
    const sockets = Array.from(socketUsers.entries()).filter(([id, data]) => data.username === targetUser);
    for (const [id] of sockets) {
      io.to(id).emit('friend_requests:sync', Array.from(friendRequests.get(targetUser) || []));
    }
  };

  socket.on('user:send_friend_request', (friendName) => {
    if (socket.username && friendName && friendName !== socket.username) {
      if (userPrivacyMode.get(friendName)) {
        socket.emit('system:warning', `Cannot send request to ${friendName}. They have privacy mode enabled.`);
        return;
      }
      if (!friendRequests.has(friendName)) friendRequests.set(friendName, new Set());
      friendRequests.get(friendName).add(socket.username);
      sendRequestSync(friendName);
    }
  });

  socket.on('user:cancel_friend_request', (friendName) => {
    if (socket.username && friendName) {
      if (friendRequests.has(friendName)) {
        friendRequests.get(friendName).delete(socket.username);
        sendRequestSync(friendName);
      }
    }
  });

  socket.on('user:accept_friend_request', (friendName) => {
    if (socket.username && friendName) {
      if (friendRequests.has(socket.username) && friendRequests.get(socket.username).has(friendName)) {
        // Remove request
        friendRequests.get(socket.username).delete(friendName);
        sendRequestSync(socket.username);

        // Add to both friends lists
        if (!userFriends.has(socket.username)) userFriends.set(socket.username, new Set());
        if (!userFriends.has(friendName)) userFriends.set(friendName, new Set());
        
        userFriends.get(socket.username).add(friendName);
        userFriends.get(friendName).add(socket.username);
        
        // Sync my friends
        socket.emit('friends:sync', Array.from(userFriends.get(socket.username)));
        
        // Sync their friends
        const theirSockets = Array.from(socketUsers.entries()).filter(([id, data]) => data.username === friendName);
        for (const [id] of theirSockets) {
          io.to(id).emit('friends:sync', Array.from(userFriends.get(friendName)));
        }
      }
    }
  });

  socket.on('user:decline_friend_request', (friendName) => {
    if (socket.username && friendName) {
      if (friendRequests.has(socket.username)) {
        friendRequests.get(socket.username).delete(friendName);
        sendRequestSync(socket.username);
      }
    }
  });

  socket.on('user:remove_friend', (friendName) => {
    if (socket.username && friendName) {
      if (userFriends.has(socket.username)) {
        userFriends.get(socket.username).delete(friendName);
        socket.emit('friends:sync', Array.from(userFriends.get(socket.username)));
      }
      // Also remove me from their list
      if (userFriends.has(friendName)) {
        userFriends.get(friendName).delete(socket.username);
        const theirSockets = Array.from(socketUsers.entries()).filter(([id, data]) => data.username === friendName);
        for (const [id] of theirSockets) {
          io.to(id).emit('friends:sync', Array.from(userFriends.get(friendName)));
        }
      }
    }
  });

  // Handle user joining a specific room
  socket.on('user:join', ({ username, roomId }) => {
    if (!roomId) roomId = 'global'; // fallback
    
    if (socket.roomId && socket.roomId !== roomId) {
      socket.leave(socket.roomId);
      if (roomUsers.has(socket.roomId)) {
        roomUsers.get(socket.roomId).delete(username);
        if (roomUsers.get(socket.roomId).size === 0 && socket.roomId !== 'global') {
          roomUsers.delete(socket.roomId);
        } else {
          io.to(socket.roomId).emit('presence:update', Array.from(roomUsers.get(socket.roomId) || []));
        }
        if (socket.roomId !== 'global') {
          io.to(socket.roomId).emit('message:receive', {
            id: generateId(),
            type: 'system',
            text: `${username} left the chat.`,
            timestamp: Date.now()
          });
        }
      }
    }

    socket.username = username;
    socket.roomId = roomId;
    socket.join(roomId);
    
    // Ensure they are in global tracking
    globalUsers.add(username);
    if (!userStatuses.has(username)) userStatuses.set(username, 'online');
    if (!userFriends.has(username)) userFriends.set(username, new Set());
    if (!friendRequests.has(username)) friendRequests.set(username, new Set());
    if (!userPrivacyMode.has(username)) userPrivacyMode.set(username, false);
    io.emit('global:presence', Array.from(globalUsers));
    socket.emit('profiles:sync', Object.fromEntries(userProfiles));
    socket.emit('user:stats', getStats(username));
    io.emit('statuses:sync', Object.fromEntries(userStatuses));
    socket.emit('friends:sync', Array.from(userFriends.get(username)));
    socket.emit('friend_requests:sync', Array.from(friendRequests.get(username)));
    io.emit('privacy:sync', Object.fromEntries(userPrivacyMode));
    
    // Store user data
    socketUsers.set(socket.id, { username, roomId });
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Set());
    }
    roomUsers.get(roomId).add(username);

    const onlineUsersInRoom = Array.from(roomUsers.get(roomId));

    // Broadcast updated online presence to THIS room only
    io.to(roomId).emit('presence:update', onlineUsersInRoom);
    
    // Emit system message to THIS room (skip global room)
    if (roomId !== 'global') {
      io.to(roomId).emit('message:receive', {
        id: generateId(),
        type: 'system',
        text: `${username} joined the chat.`,
        timestamp: Date.now()
      });
    }
    
    console.log(`${username} joined room ${roomId}. Online in room:`, onlineUsersInRoom);
  });

  socket.on('room:request_history', (roomId) => {
    let history = [];
    try {
      history = roomMessages.get(roomId) || [];
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
    socket.emit('room:history', history);
  });

  // Handle slang report from client (since server can't read E2EE messages)
  socket.on('user:report_slang', () => {
    if (socket.username) {
      const stats = getStats(socket.username);
      stats.slangCount += 1;
      
      let warningMsg = `Warning: You used slang. Your score is now ${Math.max(0, 100 - stats.slangCount * 2.5)}%`;
      
      if (stats.slangCount >= 20) { // 50% score
        stats.suspendedUntil = Date.now() + 60 * 60 * 1000;
        warningMsg = 'You have been suspended for 1 hour due to excessive slang usage.';
        userStats.set(socket.username, stats);
        socket.emit('user:stats', stats);
        socket.emit('system:warning', warningMsg);
        return;
      }
      
      userStats.set(socket.username, stats);
      socket.emit('user:stats', stats);
      socket.emit('system:warning', warningMsg);
    }
  });

  // Handle messages
  socket.on('message:send', (messageData) => {
    if (!socket.username) return;

    const stats = getStats(socket.username);
    if (stats.suspendedUntil && Date.now() < stats.suspendedUntil) {
      socket.emit('system:warning', 'You are currently suspended from chatting.');
      return;
    }

    // Since message is E2EE (except global), we broadcast it
    const roomId = socket.roomId || 'global';
    
    // Save history
    (async () => {
      try {
        if (!roomMessages.has(roomId)) {
          roomMessages.set(roomId, []);
        }
        roomMessages.get(roomId).push(messageData);
        
        // Trim history for global to last 500 messages to prevent memory leak
        if (roomId === 'global') {
          const msgs = roomMessages.get(roomId);
          if (msgs.length > 500) {
            msgs.shift();
          }
        }
      } catch (err) {
        console.error('History save error:', err);
      }
    })();
    
    // Broadcast back to the room
    io.to(roomId).emit('message:receive', messageData);
  });

  // Handle typing indicators
  socket.on('typing:start', () => {
    if (socket.username && socket.roomId) {
      socket.to(socket.roomId).emit('typing:update', { username: socket.username, isTyping: true });
    }
  });

  socket.on('typing:stop', () => {
    if (socket.username && socket.roomId) {
      socket.to(socket.roomId).emit('typing:update', { username: socket.username, isTyping: false });
    }
  });

  // Handle read receipts
  socket.on('message:read', (messageId) => {
    if (socket.username && socket.roomId) {
      // Broadcast to room that this user has read this specific message
      io.to(socket.roomId).emit('message:receipt', { messageId, reader: socket.username });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const userData = socketUsers.get(socket.id);
    if (userData) {
      const { username, roomId } = userData;
      socketUsers.delete(socket.id);
      
      // Check if user has other active sockets in THIS room before removing from online set
      const allSocketsInRoom = Array.from(socketUsers.values()).filter(u => u.roomId === roomId);
      const isUserStillInRoom = allSocketsInRoom.some(u => u.username === username);
      
      if (!isUserStillInRoom && roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(username);
        
        // Clean up empty rooms
        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
        }
      }
      
      const onlineUsersInRoom = roomUsers.has(roomId) ? Array.from(roomUsers.get(roomId)) : [];
      
      // Broadcast updated presence to room
      io.to(roomId).emit('presence:update', onlineUsersInRoom);

      // Emit system message to room (skip global room)
      if (roomId !== 'global') {
        io.to(roomId).emit('message:receive', {
          id: generateId(),
          type: 'system',
          text: `${username} left the chat.`,
          timestamp: Date.now()
        });
      }

      console.log(`${username} left room ${roomId}. Online in room:`, onlineUsersInRoom);
    }
    
    // Clean up global presence if no other sockets are open for this user
    if (socket.username) {
      const isStillConnected = Array.from(io.sockets.sockets.values()).some(s => s.username === socket.username && s.id !== socket.id);
      if (!isStillConnected) {
        globalUsers.delete(socket.username);
        io.emit('global:presence', Array.from(globalUsers));
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat backend server listening on port ${PORT}`);
  console.log(`Running in memory-mode with Strict Dictionary Filtering`);
});
