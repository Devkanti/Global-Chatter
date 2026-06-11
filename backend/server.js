const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const connectDB = require('./db');
const webpush = require('web-push');

const User = require('./models/User');
const Message = require('./models/Message');
const Room = require('./models/Room');

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const pushRoutes = require('./routes/push');
app.use('/push', pushRoutes);

// Health check endpoint for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@devkantisarkar.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys are missing from environment variables. Push notifications will be disabled.');
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// In-memory datastore for active connections
const socketUsers = new Map(); // socket.id -> { userId, username, roomId }
const roomUsers = new Map(); // roomId -> Set of usernames
const globalUsers = new Set(); // All unique usernames connected
const userStatuses = new Map(); // username -> 'online' | 'dnd' | 'invisible'
// Removed in-memory userStats since we use MongoDB now

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// Socket.io Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    // Check if suspension has passed
    if (user.suspendedUntil && Date.now() > user.suspendedUntil.getTime()) {
      user.suspendedUntil = null;
      if (user.reputationScore === 0) {
        user.reputationScore = 100;
        user.suspensionStrikes = 0;
      } else if (user.reputationScore < 60) {
        user.reputationScore = 60;
      }
      await user.save();
    }

    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.userStats = {
      reputationScore: user.reputationScore,
      suspendedUntil: user.suspendedUntil ? user.suspendedUntil.getTime() : null
    };
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// Helper to broadcast sync events
const syncUserData = async () => {
  const users = await User.find({}, 'username avatar publicKey status friends friendRequests isVerified privacyMode');
  const profiles = {};
  const keys = {};
  const privacy = {}; 
  
  users.forEach(u => {
    if (u.avatar) profiles[u.username] = u.avatar;
    if (u.publicKey) keys[u.username] = u.publicKey;
    privacy[u.username] = u.privacyMode || false;
  });

  io.emit('profiles:sync', profiles);
  io.emit('keys:sync', keys);
  io.emit('privacy:sync', privacy);
  io.emit('statuses:sync', Object.fromEntries(userStatuses));
};

io.on('connection', async (socket) => {
  console.log('Authenticated client connected:', socket.username, socket.id);

  socket.on('user:login', async ({ publicKey }) => {
    socket.roomId = 'global';
    
    // Update public key in DB if provided
    if (publicKey) {
      await User.findByIdAndUpdate(socket.userId, { publicKey });
    }
    
    if (!userStatuses.has(socket.username)) userStatuses.set(socket.username, 'online');
    globalUsers.add(socket.username);
    
    io.emit('global:presence', Array.from(globalUsers));
    socket.emit('user:stats', socket.userStats);
    
    // Fetch user document for friends
    const userDoc = await User.findById(socket.userId).populate('friends', 'username').populate('friendRequests', 'username');
    const friendsList = userDoc.friends.map(f => f.username);
    const requestsList = userDoc.friendRequests.map(r => r.username);
    
    socket.emit('friends:sync', friendsList);
    socket.emit('friend_requests:sync', requestsList);

    await syncUserData();
  });

  socket.on('user:report_slang', async () => {
    try {
      const user = await User.findById(socket.userId);
      if (!user) return;
      
      // Deduct 2% per slang
      user.reputationScore = Math.max(0, user.reputationScore - 2);
      
      // Calculate threshold based on current strikes
      const currentStrike = user.suspensionStrikes || 0;
      const threshold = Math.max(0, 50 - (currentStrike * 10));
      
      // Apply suspension if threshold hit
      if (user.reputationScore <= threshold && !user.suspendedUntil) {
        user.suspensionStrikes += 1;
        
        let suspendHours = user.suspensionStrikes;
        if (user.reputationScore === 0) {
          suspendHours = 7 * 24; // 7 days
        }
        
        user.suspendedUntil = new Date(Date.now() + suspendHours * 60 * 60 * 1000);
      }
      
      await user.save();
      
      socket.userStats = {
        reputationScore: user.reputationScore,
        suspendedUntil: user.suspendedUntil ? user.suspendedUntil.getTime() : null
      };
      
      socket.emit('user:stats', socket.userStats);
      socket.emit('system:warning', 'Your message was flagged for inappropriate content. Your reputation score has decreased.');
    } catch (err) {
      console.log(err);
    }
  });

  socket.on('user:update_status', (status) => {
    userStatuses.set(socket.username, status);
    io.emit('statuses:sync', Object.fromEntries(userStatuses));
  });

  socket.on('user:typing', (roomId) => {
    socket.to(roomId).emit('user:typing', { username: socket.username, roomId });
  });

  socket.on('user:stop_typing', (roomId) => {
    socket.to(roomId).emit('user:stop_typing', { username: socket.username, roomId });
  });

  socket.on('messages:read', async ({ roomId }) => {
    try {
      await Message.updateMany(
        { roomId, readBy: { $ne: socket.username } },
        { $push: { readBy: socket.username } }
      );
      io.to(roomId).emit('messages:read_update', { roomId, reader: socket.username });
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('message:react', async ({ messageId, emoji }) => {
    try {
      const msg = await Message.findOne({ id: messageId });
      if (!msg) return;

      if (!msg.reactions) msg.reactions = new Map();
      let usersReacted = msg.reactions.get(emoji) || [];
      // Create a fresh copy of the array so Mongoose detects the change
      usersReacted = [...usersReacted];

      if (usersReacted.includes(socket.username)) {
        // Toggle off
        const index = usersReacted.indexOf(socket.username);
        usersReacted.splice(index, 1);
      } else {
        // Toggle on
        usersReacted.push(socket.username);
      }

      msg.reactions.set(emoji, usersReacted);
      msg.markModified('reactions');
      await msg.save();

      io.to(msg.roomId).emit('message:react_update', { 
        messageId, 
        reactions: Object.fromEntries(msg.reactions) 
      });
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('user:update_profile', async (base64Image) => {
    await User.findByIdAndUpdate(socket.userId, { avatar: base64Image });
    io.emit('profile:updated', { username: socket.username, avatarUrl: base64Image });
  });

  socket.on('user:toggle_privacy', async () => {
    const user = await User.findById(socket.userId);
    if (user) {
      user.privacyMode = !user.privacyMode;
      await user.save();
      await syncUserData();
    }
  });

  socket.on('user:change_name', async (newName) => {
    try {
      if (!newName || newName.length > 20) return;
      
      const existingUser = await User.findOne({ username: newName });
      if (existingUser) {
        socket.emit('system:warning', 'Username already taken.');
        return;
      }
      
      const oldName = socket.username;
      const user = await User.findById(socket.userId);
      if (!user) return;
      
      user.username = newName;
      await user.save();
      
      // Update in-memory states
      socket.username = newName;
      
      if (globalUsers.has(oldName)) {
        globalUsers.delete(oldName);
        globalUsers.add(newName);
      }
      
      if (userStatuses.has(oldName)) {
        const status = userStatuses.get(oldName);
        userStatuses.delete(oldName);
        userStatuses.set(newName, status);
      }
      
      if (socket.roomId && roomUsers.has(socket.roomId)) {
        roomUsers.get(socket.roomId).delete(oldName);
        roomUsers.get(socket.roomId).add(newName);
      }
      
      const userData = socketUsers.get(socket.id);
      if (userData) {
        userData.username = newName;
      }
      
      // Update historical messages so sender matches
      await Message.updateMany({ sender: oldName }, { $set: { sender: newName } });
      
      socket.emit('name_changed:success', { oldName, newName });
      
      io.emit('global:presence', Array.from(globalUsers));
      if (socket.roomId) {
        io.to(socket.roomId).emit('presence:update', Array.from(roomUsers.get(socket.roomId)));
      }
      
      await syncUserData();
    } catch (e) {
      console.error(e);
      socket.emit('system:warning', 'Failed to change name.');
    }
  });

  const sendRequestSync = async (targetUsername) => {
    const targetUser = await User.findOne({ username: targetUsername }).populate('friendRequests', 'username');
    if (!targetUser) return;
    const requestsList = targetUser.friendRequests.map(r => r.username);
    
    const sockets = Array.from(socketUsers.entries()).filter(([id, data]) => data.username === targetUsername);
    for (const [id] of sockets) {
      io.to(id).emit('friend_requests:sync', requestsList);
    }
  };

  socket.on('user:send_friend_request', async (friendName) => {
    if (friendName === socket.username) return;
    const targetUser = await User.findOne({ username: friendName });
    if (!targetUser) return;

    if (targetUser.privacyMode) {
      socket.emit('system:warning', `Cannot send request to ${friendName}. They have privacy mode enabled.`);
      return;
    }

    if (!targetUser.friendRequests.includes(socket.userId)) {
      targetUser.friendRequests.push(socket.userId);
      await targetUser.save();
      await sendRequestSync(friendName);
    }
  });

  socket.on('user:accept_friend_request', async (friendName) => {
    const me = await User.findById(socket.userId);
    const them = await User.findOne({ username: friendName });
    if (!me || !them) return;

    me.friendRequests = me.friendRequests.filter(id => id.toString() !== them._id.toString());
    if (!me.friends.includes(them._id)) me.friends.push(them._id);
    if (!them.friends.includes(me._id)) them.friends.push(me._id);

    await me.save();
    await them.save();

    await sendRequestSync(socket.username);
    
    // Sync my friends
    const myFriends = await User.find({ _id: { $in: me.friends } });
    socket.emit('friends:sync', myFriends.map(f => f.username));
    
    // Sync their friends
    const theirFriends = await User.find({ _id: { $in: them.friends } });
    const theirSockets = Array.from(socketUsers.entries()).filter(([id, data]) => data.username === friendName);
    for (const [id] of theirSockets) {
      io.to(id).emit('friends:sync', theirFriends.map(f => f.username));
    }
  });

  socket.on('user:join', async ({ roomId }) => {
    if (!roomId) roomId = 'global';
    
    if (socket.roomId === roomId) {
      return; // Already in this room, prevent duplicate join messages
    }
    
    if (socket.roomId && socket.roomId !== roomId) {
      socket.leave(socket.roomId);
      if (roomUsers.has(socket.roomId)) {
        roomUsers.get(socket.roomId).delete(socket.username);
        if (roomUsers.get(socket.roomId).size === 0 && socket.roomId !== 'global') {
          roomUsers.delete(socket.roomId);
        } else {
          io.to(socket.roomId).emit('presence:update', Array.from(roomUsers.get(socket.roomId) || []));
        }
        if (socket.roomId !== 'global') {
          io.to(socket.roomId).emit('message:receive', {
            id: generateId(),
            type: 'system',
            text: `${socket.username} left the chat.`,
            timestamp: Date.now()
          });
        }
      }
    }

    socket.roomId = roomId;
    socket.join(roomId);
    globalUsers.add(socket.username);
    if (!userStatuses.has(socket.username)) userStatuses.set(socket.username, 'online');
    
    socketUsers.set(socket.id, { userId: socket.userId, username: socket.username, roomId });
    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Set());
    roomUsers.get(roomId).add(socket.username);

    io.to(roomId).emit('presence:update', Array.from(roomUsers.get(roomId)));
    
    if (roomId !== 'global') {
      io.to(roomId).emit('message:receive', {
        id: generateId(),
        type: 'system',
        text: `${socket.username} joined the chat.`,
        timestamp: Date.now()
      });
    }
  });

  socket.on('room:request_history', async (roomId) => {
    try {
      const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(100);
      socket.emit('room:history', messages);
    } catch (err) {
      console.error('Failed to fetch history', err);
      socket.emit('room:history', []);
    }
  });

  socket.on('message:send', async (messageData) => {
    const roomId = socket.roomId || 'global';
    
    try {
      // Create new message in DB
      const newMsg = new Message({
        roomId,
        sender: socket.username,
        text: messageData.text,
        id: messageData.id,
        type: messageData.type,
        timestamp: messageData.timestamp,
        replyTo: messageData.replyTo || null,
        reactions: {},
        audioData: messageData.audioData || null
      });
      await newMsg.save();

      // Only keep last 500 messages for global chat
      if (roomId === 'global') {
        const count = await Message.countDocuments({ roomId: 'global' });
        if (count > 500) {
          const oldest = await Message.find({ roomId: 'global' }).sort({ timestamp: 1 }).limit(count - 500);
          const idsToDelete = oldest.map(m => m._id);
          await Message.deleteMany({ _id: { $in: idsToDelete } });
        }
      }
    } catch (err) {
      console.error('Message save error:', err);
    }
    
    io.to(roomId).emit('message:receive', messageData);

    // Push Notifications for offline users in private rooms
    if (roomId !== 'global') {
      try {
        const room = await Room.findOne({ roomId });
        if (room && room.participants) {
          const onlineInRoom = roomUsers.get(roomId) || new Set();
          const offlineUsers = room.participants.filter(p => !onlineInRoom.has(p) && p !== socket.username);
          
          for (const username of offlineUsers) {
            const u = await User.findOne({ username });
            if (u && u.pushSubscriptions && u.pushSubscriptions.length > 0) {
              const payload = JSON.stringify({
                title: `New message from ${socket.username}`,
                body: messageData.type === 'audio' ? '🎤 Voice Note' : '🔒 Encrypted Message',
                url: `${process.env.FRONTEND_URL}/`
              });
              
              const validSubs = [];
              for (const sub of u.pushSubscriptions) {
                try {
                  await webpush.sendNotification(sub, payload);
                  validSubs.push(sub);
                } catch (err) {
                  if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription has expired or is no longer valid
                  } else {
                    validSubs.push(sub);
                    console.error('Push error:', err);
                  }
                }
              }
              
              // Clean up expired subscriptions
              if (validSubs.length !== u.pushSubscriptions.length) {
                u.pushSubscriptions = validSubs;
                await u.save();
              }
            }
          }
        }
      } catch (err) {
        console.error('Push notification trigger error:', err);
      }
    }
  });

  socket.on('typing:start', () => {
    if (socket.roomId) socket.to(socket.roomId).emit('typing:update', { username: socket.username, isTyping: true });
  });

  socket.on('typing:stop', () => {
    if (socket.roomId) socket.to(socket.roomId).emit('typing:update', { username: socket.username, isTyping: false });
  });

  socket.on('message:read', async (messageId) => {
    if (socket.roomId) {
      try {
        await Message.findOneAndUpdate(
          { id: messageId },
          { $addToSet: { readBy: socket.username } }
        );
      } catch (err) { }
      io.to(socket.roomId).emit('message:receipt', { messageId, reader: socket.username });
    }
  });

  // WebRTC Call Signaling
  socket.on('call:initiate', ({ roomId, type }) => {
    socket.to(roomId).emit('call:incoming', { roomId, type, callerName: socket.username });
  });
  socket.on('call:accept', ({ roomId }) => {
    socket.to(roomId).emit('call:accepted');
  });
  socket.on('call:decline', ({ roomId }) => {
    socket.to(roomId).emit('call:declined');
  });
  socket.on('call:signal', ({ roomId, signal }) => {
    socket.to(roomId).emit('call:signal', { signal });
  });
  socket.on('call:end', ({ roomId }) => {
    socket.to(roomId).emit('call:ended');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const userData = socketUsers.get(socket.id);
    if (userData) {
      const { username, roomId } = userData;
      socketUsers.delete(socket.id);
      
      const isUserStillInRoom = Array.from(socketUsers.values()).some(u => u.roomId === roomId && u.username === username);
      
      if (!isUserStillInRoom && roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(username);
        if (roomUsers.get(roomId).size === 0) roomUsers.delete(roomId);
      }
      
      const onlineUsersInRoom = roomUsers.has(roomId) ? Array.from(roomUsers.get(roomId)) : [];
      io.to(roomId).emit('presence:update', onlineUsersInRoom);

      if (roomId !== 'global') {
        io.to(roomId).emit('message:receive', {
          id: generateId(),
          type: 'system',
          text: `${username} left the chat.`,
          timestamp: Date.now()
        });
      }
    }
    
    const isStillConnected = Array.from(io.sockets.sockets.values()).some(s => s.username === socket.username && s.id !== socket.id);
    if (!isStillConnected) {
      globalUsers.delete(socket.username);
      io.emit('global:presence', Array.from(globalUsers));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat backend server listening on port ${PORT}`);
  console.log(`Running with MongoDB Persistence and Authentication`);
});
