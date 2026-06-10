import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { socket } from '../socket';
import { Send, Check, CheckCheck, Copy, CheckCircle2, LogOut, Users, PanelRightOpen, PanelRightClose, Bookmark, BookmarkCheck, Edit2, Menu, Globe, Hash, Video, Phone, Mic, Square, Play, Pause } from 'lucide-react';
import { getAvatarGradient, censorText } from '../utils';
import { encryptMessage, decryptMessage } from '../crypto';

export default function ChatArea({ currentUser, roomId, onLeave, userProfiles, userStatuses, userFriends, userPrivacyMode, userPublicKeys, myPrivateKey, onSelectUser, onToggleFriends, showFriends, onSaveRoom, isSaved, customRoomName, onRenameRoom, onToggleMobileSidebar, onInitiateCall }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const handlePresence = (users) => setOnlineUsers(users);
    socket.on('presence:update', handlePresence);
    return () => {
      socket.off('presence:update', handlePresence);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleReceiveMessage = async (msg) => {
      if (msg.type !== 'system' && msg.payload) {
        msg.text = await decryptMessage(msg.payload, currentUser, myPrivateKey);
      }
      
      setMessages((prev) => [...prev, msg]);
      
      if (msg.sender && msg.sender !== currentUser) {
        socket.emit('message:read', msg.id);
        if (msg.type !== 'system') {
          playNotificationSound();
        }
      }
    };

    const handleReceipt = ({ messageId, reader }) => {
      setMessages((prev) => 
        prev.map(msg => {
          if (msg.id === messageId) {
            const readBy = msg.readBy || [];
            if (!readBy.includes(reader)) {
              return { ...msg, readBy: [...readBy, reader] };
            }
          }
          return msg;
        })
      );
    };

    const handleTyping = ({ username, roomId: typingRoom }) => {
      if (typingRoom === roomId) setTypingUsers((prev) => new Set([...prev, username]));
    };
    
    const handleStopTyping = ({ username, roomId: typingRoom }) => {
      if (typingRoom === roomId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(username);
          return newSet;
        });
      }
    };

    const handleSystemWarning = (msg) => {
      setWarningMessage(msg);
      setTimeout(() => setWarningMessage(''), 6000);
    };

    const handleRoomHistory = async (history) => {
      const decryptedHistory = await Promise.all(history.map(async (msg) => {
        if (msg.type !== 'system' && msg.payload) {
          msg.text = await decryptMessage(msg.payload, currentUser, myPrivateKey);
        }
        return msg;
      }));
      setMessages(decryptedHistory);
    };

    const handleReadUpdate = ({ roomId: readRoom, reader }) => {
      if (readRoom === roomId) {
        setMessages((prev) => 
          prev.map(msg => {
            const readBy = msg.readBy || [];
            if (!readBy.includes(reader)) {
              return { ...msg, readBy: [...readBy, reader] };
            }
            return msg;
          })
        );
      }
    };

    const handleReactUpdate = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('message:receipt', handleReceipt);
    socket.on('message:react_update', handleReactUpdate);
    socket.on('user:typing', handleTyping);
    socket.on('user:stop_typing', handleStopTyping);
    socket.on('messages:read_update', handleReadUpdate);
    socket.on('system:warning', handleSystemWarning);
    socket.on('room:history', handleRoomHistory);

    setMessages([]);
    socket.emit('room:request_history', roomId);
    // Emit read when opening room
    socket.emit('messages:read', { roomId });

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('message:receipt', handleReceipt);
      socket.off('message:react_update', handleReactUpdate);
      socket.off('user:typing', handleTyping);
      socket.off('user:stop_typing', handleStopTyping);
      socket.off('messages:read_update', handleReadUpdate);
      socket.off('system:warning', handleSystemWarning);
      socket.off('room:history', handleRoomHistory);
    };
  }, [currentUser, myPrivateKey, roomId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    let textToSend = inputValue;
    const { censoredText, isToxic } = censorText(textToSend);
    if (isToxic) {
      socket.emit('user:report_slang');
      textToSend = censoredText;
    }

    let messageData;
    if (isGlobal) {
      messageData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        sender: currentUser,
        text: textToSend,
        payload: null,
        timestamp: Date.now(),
        readBy: [],
        replyTo: replyingTo?.id || null
      };
    } else {
      const recipientPublicKeysJwkMap = {};
      const usersToEncryptFor = new Set(onlineUsers);
      usersToEncryptFor.add(currentUser);
      
      for (const u of usersToEncryptFor) {
        if (userPublicKeys && userPublicKeys[u]) {
          recipientPublicKeysJwkMap[u] = userPublicKeys[u];
        }
      }

      const encryptedPayload = await encryptMessage(textToSend, recipientPublicKeysJwkMap);

      messageData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        sender: currentUser,
        text: "[Encrypted Message]",
        payload: encryptedPayload,
        timestamp: Date.now(),
        readBy: [],
        replyTo: replyingTo?.id || null
      };
    }

    socket.emit('message:send', messageData);
    setInputValue('');
    setReplyingTo(null);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    socket.emit('user:stop_typing', roomId);
    clearTimeout(typingTimeoutRef.current);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;

    socket.emit('user:typing', roomId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user:stop_typing', roomId);
    }, 1500);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReact = (messageId, emoji) => {
    socket.emit('message:react', { messageId, emoji });
  };

  const sendAudioMessage = async (base64Audio) => {
    let messageData;
    if (isGlobal) {
      messageData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        sender: currentUser,
        text: 'Audio Message',
        type: 'audio',
        audioData: base64Audio,
        payload: null,
        timestamp: Date.now(),
        readBy: [],
        replyTo: replyingTo?.id || null
      };
    } else {
      const recipientPublicKeysJwkMap = {};
      const usersToEncryptFor = new Set(onlineUsers);
      usersToEncryptFor.add(currentUser);
      for (const u of usersToEncryptFor) {
        if (userPublicKeys && userPublicKeys[u]) recipientPublicKeysJwkMap[u] = userPublicKeys[u];
      }
      const encryptedPayload = await encryptMessage(base64Audio, recipientPublicKeysJwkMap);
      messageData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        sender: currentUser,
        text: "[Encrypted Audio]",
        type: 'audio',
        payload: encryptedPayload,
        audioData: null, // Don't send raw audio if private
        timestamp: Date.now(),
        readBy: [],
        replyTo: replyingTo?.id || null
      };
    }
    socket.emit('message:send', messageData);
    setReplyingTo(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => sendAudioMessage(reader.result);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isGlobal = roomId === 'global';

  const handleSaveRoom = () => {
    if (onSaveRoom) {
      onSaveRoom(roomId);
    }
  };


  const isFriendRoom = roomId && roomId.startsWith('PRIVATE-');

  let defaultRoomName = `Private Room: ${roomId}`;
  if (isGlobal) {
    defaultRoomName = 'Global Chat Room';
  } else if (isFriendRoom) {
    const users = roomId.replace('PRIVATE-', '').split('-');
    defaultRoomName = users[0] === currentUser ? users[1] : users[0];
  }

  const roomDisplayName = customRoomName || defaultRoomName;

  const handleEditNameStart = () => {
    if (isGlobal) return;
    setIsEditingName(true);
    setEditNameValue(customRoomName || defaultRoomName);
  };

  const handleEditNameSave = () => {
    setIsEditingName(false);
    if (onRenameRoom) {
      if (editNameValue.trim() === defaultRoomName) {
        onRenameRoom(roomId, ''); // reset to default
      } else {
        onRenameRoom(roomId, editNameValue.trim());
      }
    }
  };

  return (
    <div className="chat-area glass glass-panel" style={{ overflow: 'hidden' }}>
      {warningMessage && createPortal(
        <div className="animate-fade-in" style={{
          position: 'fixed', 
          bottom: '24px', 
          left: '24px',
          background: 'rgba(15, 23, 42, 0.9)', 
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '4px solid #ef4444',
          color: '#f8fafc', 
          padding: '1rem 1.25rem',
          borderRadius: '8px', 
          zIndex: 9999, 
          fontWeight: '500', 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '0.85rem', 
          width: 'max-content', 
          maxWidth: '320px', 
          textAlign: 'left',
          fontSize: '0.9rem',
          lineHeight: '1.4'
        }}>
          <div style={{ color: '#ef4444', marginTop: '2px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div>
            <strong style={{ display: 'block', color: '#ef4444', marginBottom: '0.25rem', fontSize: '0.95rem' }}>Auto-Moderator</strong>
            {warningMessage}
          </div>
        </div>,
        document.body
      )}

      <div className="chat-header" style={{ position: 'relative' }}>
        {isEditingName ? (
          <input 
            type="text" 
            value={editNameValue}
            onChange={e => setEditNameValue(e.target.value)}
            onBlur={handleEditNameSave}
            onKeyDown={e => e.key === 'Enter' && handleEditNameSave()}
            autoFocus
            style={{ 
              background: 'var(--panel-bg)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--primary)', 
              borderRadius: '8px', 
              padding: '0.4rem 0.75rem', 
              fontSize: '1.25rem', 
              fontWeight: '800', 
              letterSpacing: '-0.5px',
              outline: 'none', 
              width: '250px' 
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <button className="mobile-menu-btn" onClick={onToggleMobileSidebar}>
              <Menu size={24} />
            </button>
            <h2 className="sidebar-title" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'default', margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }} 
            >
              {roomId === 'global' ? (
                <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: '0.4rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
                  <Globe size={20} strokeWidth={2.5} color="white" />
                </div>
              ) : (
                <div style={{ background: 'var(--panel-bg)', padding: '0.4rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--panel-border)' }}>
                  <Hash size={20} strokeWidth={2.5} color="var(--primary)" />
                </div>
              )}
              {roomDisplayName}
            </h2>
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!isGlobal && (
            <>
              {/* Call Group */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--panel-border)', borderRadius: '999px', padding: '0.2rem 0.5rem', gap: '0.2rem' }}>
                <button className="control-btn" onClick={() => onInitiateCall('audio', roomDisplayName)} title="Audio Call" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.4rem', borderRadius: '50%', transition: 'all 0.2s', display: 'flex' }} onMouseEnter={e => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Phone size={18} />
                </button>
                <div style={{ width: '1px', height: '14px', background: 'var(--panel-border)' }} />
                <button className="control-btn" onClick={() => onInitiateCall('video', roomDisplayName)} title="Video Call" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.4rem', borderRadius: '50%', transition: 'all 0.2s', display: 'flex' }} onMouseEnter={e => { e.currentTarget.style.color = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Video size={18} />
                </button>
              </div>

              {/* Utility Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={handleSaveRoom}
                  style={{ background: isSaved ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: isSaved ? '#10b981' : 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s', display: 'flex' }}
                  onMouseEnter={e => { e.currentTarget.style.background = isSaved ? 'rgba(16, 185, 129, 0.2)' : 'var(--panel-bg)'; e.currentTarget.style.color = isSaved ? '#10b981' : 'var(--text-main)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSaved ? 'rgba(16, 185, 129, 0.1)' : 'transparent'; e.currentTarget.style.color = isSaved ? '#10b981' : 'var(--text-muted)'; }}
                  title={isSaved ? "Saved to Active Chats" : "Save to Active Chats"}
                >
                  {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>

                <button 
                  onClick={copyRoomCode}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', padding: '0.5rem', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-bg)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  title="Copy Room Code"
                >
                  {copied ? <CheckCircle2 size={20} color="var(--success)" /> : <Copy size={20} />}
                </button>
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--panel-border)' }} />
            </>
          )}

          {/* Core Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => setIsMembersOpen(!isMembersOpen)}
              style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', position: 'relative', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s', display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-bg)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Active Members"
            >
              <Users size={20} />
              {onlineUsers.length > 0 && (
                <div style={{ position: 'absolute', top: '0px', right: '0px', background: '#10b981', color: 'white', fontSize: '0.6rem', padding: '2px 4px', borderRadius: '8px', fontWeight: 'bold' }}>
                  {onlineUsers.length}
                </div>
              )}
            </button>

            {!isGlobal && (
              <button 
                onClick={onLeave}
                style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                title="Leave Room"
              >
                <LogOut size={20} />
              </button>
            )}

            <div style={{ width: '1px', height: '20px', background: 'var(--panel-border)' }} />

            <button 
              onClick={() => onToggleFriends()}
              className="mobile-friends-toggle"
              style={{ background: 'transparent', color: showFriends ? 'var(--primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'all 0.2s', display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              title="Toggle Friends List"
            >
              {showFriends ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </button>
          </div>
        </div>

        {isMembersOpen && (
          <div className="glass animate-fade-in" style={{ position: 'absolute', top: '100%', right: '1.5rem', width: '250px', maxHeight: '300px', overflowY: 'auto', zIndex: 50, borderRadius: '16px', padding: '0.75rem', marginTop: '0.5rem', border: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem', borderBottom: '1px solid var(--panel-border)', marginBottom: '0.5rem', fontWeight: '600' }}>
              {onlineUsers.length} Active Member{onlineUsers.length !== 1 ? 's' : ''}
            </div>
            {onlineUsers.map(user => {
              const status = userStatuses?.[user] || 'online';
              if (status === 'invisible' && user !== currentUser) return null;
              
              const isPrivacyEnabled = userPrivacyMode?.[user] && !userFriends?.includes(user) && user !== currentUser;
              const displayName = isPrivacyEnabled ? 'Anonymous User' : user;
              const displayAvatar = isPrivacyEnabled ? null : userProfiles?.[user];

              let dotColor = '#10b981';
              if (status === 'dnd') dotColor = '#f59e0b';
              if (status === 'invisible') dotColor = 'transparent';

              return (
                <div 
                  key={user} 
                  onClick={() => { if (!isPrivacyEnabled) { onSelectUser(user); setIsMembersOpen(false); } }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', cursor: isPrivacyEnabled ? 'default' : 'pointer', borderRadius: '12px', opacity: status === 'invisible' ? 0.5 : 1, transition: 'background 0.2s' }} 
                  onMouseEnter={e => { if (!isPrivacyEnabled) e.currentTarget.style.background = 'var(--panel-border)'; }} 
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: displayAvatar ? `url(${displayAvatar}) center/cover` : getAvatarGradient(displayName), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--bg-color)', position: 'relative', fontWeight: '600' }}>
                    {!displayAvatar && displayName.charAt(0).toUpperCase()}
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: dotColor, border: status === 'invisible' ? '2px solid var(--text-muted)' : '2px solid var(--bg-color)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.95rem', color: isPrivacyEnabled ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: '500', fontStyle: isPrivacyEnabled ? 'italic' : 'normal' }}>{displayName}</span>
                  {user === currentUser && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: 'var(--primary-text)', padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto', fontWeight: '600' }}>You</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="system-message animate-fade-in">
                {msg.text}
              </div>
            );
          }

          const isMine = msg.sender === currentUser;
          const isRead = msg.readBy && msg.readBy.length > 0;

          const prevMsg = messages[index - 1];
          const nextMsg = messages[index + 1];
          
          const isGroupedTop = prevMsg && prevMsg.sender === msg.sender && prevMsg.type !== 'system' && (msg.timestamp - prevMsg.timestamp < 60000);
          const isGroupedBottom = nextMsg && nextMsg.sender === msg.sender && nextMsg.type !== 'system' && (nextMsg.timestamp - msg.timestamp < 60000);
          
          const isSystem = false;
          const status = userStatuses?.[msg.sender] || 'online';
          
          const isPrivacyEnabled = userPrivacyMode?.[msg.sender] && !userFriends?.includes(msg.sender) && msg.sender !== currentUser;
          const displayName = isPrivacyEnabled ? 'Anonymous User' : msg.sender;
          const displayAvatar = isPrivacyEnabled ? null : (userProfiles && userProfiles[msg.sender]);

          let dotColor = '#10b981';
          let dotBorder = '2px solid var(--panel-bg)';
          if (status === 'dnd') dotColor = '#f59e0b';
          if (status === 'invisible') {
            dotColor = 'transparent';
            dotBorder = '2px solid #9ba4b5';
          }

          return (
            <div 
              key={msg.id} 
              className={`chat-message-row ${isMine ? 'mine' : 'other'} animate-fade-in`}
              onMouseEnter={() => setHoveredMessage(msg.id)}
              onMouseLeave={() => setHoveredMessage(null)}
            >
              {!isMine && !isSystem && (
                <div 
                  className={`chat-avatar ${isGroupedTop ? 'hidden' : ''}`}
                  style={{ background: displayAvatar ? `url(${displayAvatar}) center/cover` : getAvatarGradient(displayName), position: 'relative', cursor: isPrivacyEnabled ? 'default' : 'pointer' }}
                  onClick={() => { if (!isPrivacyEnabled) onSelectUser(msg.sender); }}
                >
                  {!displayAvatar && displayName.charAt(0).toUpperCase()}
                  <div className="status-dot" style={{ background: dotColor, border: dotBorder, width: '10px', height: '10px', right: '-2px', bottom: '-2px' }}></div>
                </div>
              )}
              
              <div className={`message-wrapper ${isMine ? 'mine' : 'other'} ${isGroupedTop ? 'grouped-top' : ''} ${isGroupedBottom ? 'grouped-bottom' : ''}`} style={{ position: 'relative' }}>
                {!isMine && !isGroupedTop && <div className="message-sender" style={{ fontStyle: isPrivacyEnabled ? 'italic' : 'normal' }}>{displayName}</div>}
                
                {msg.replyTo && (
                  <div className="message-reply-preview" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', marginBottom: '4px', borderLeft: `3px solid ${isMine ? 'var(--primary)' : 'gray'}` }}>
                    Replying to a message...
                  </div>
                )}
                
                {msg.type === 'audio' ? (
                  <div className="message-bubble audio-bubble">
                    <audio controls src={msg.type === 'audio' ? (msg.audioData || msg.text) : ''} style={{ height: '36px', maxWidth: '200px' }} />
                  </div>
                ) : (
                  <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                )}
                
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => {
                      if (!users || users.length === 0) return null;
                      return (
                        <div key={emoji} style={{ background: users.includes(currentUser) ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => handleReact(msg.id, emoji)}>
                          {emoji} <span style={{ fontSize: '0.7rem' }}>{users.length}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                <div className="message-info">
                  <span>{formatTime(msg.timestamp)}</span>
                  {isMine && (
                    isRead ? <CheckCheck size={14} color="#10b981" /> : <Check size={14} />
                  )}
                </div>

                {hoveredMessage === msg.id && (
                  <div className={`message-hover-actions ${isMine ? 'mine' : 'other'}`} style={{ position: 'absolute', top: '-10px', [isMine ? 'left' : 'right']: '-100px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '20px', padding: '4px 8px', display: 'flex', gap: '8px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }} onClick={() => handleReact(msg.id, '👍')}>👍</button>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }} onClick={() => handleReact(msg.id, '❤️')}>❤️</button>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem' }} onClick={() => handleReact(msg.id, '😂')}>😂</button>
                    <div style={{ width: '1px', background: 'var(--panel-border)', margin: '0 4px' }}></div>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }} onClick={() => setReplyingTo(msg)}>Reply</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="typing-indicator-wrapper">
        {typingUsers.size > 0 && (
          <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{Array.from(typingUsers).join(', ')} is typing</span>
            <div style={{ display: 'flex', marginLeft: '2px' }}>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-area" style={{ position: 'relative' }}>
        {replyingTo && (
          <div style={{ position: 'absolute', top: '-40px', left: '1rem', right: '1rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderBottom: 'none', padding: '8px 12px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>Replying to <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{replyingTo.sender}</span></div>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
          </div>
        )}
        <form onSubmit={handleSend} className="chat-input-form" style={{ borderRadius: replyingTo ? '0 0 24px 24px' : '24px' }}>
          <textarea
            ref={textareaRef}
            placeholder={isRecording ? "Recording audio..." : "Start typing..."}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isRecording}
          />
          {isRecording ? (
            <button type="button" onClick={stopRecording} className="btn-icon" style={{ flexShrink: 0, marginBottom: '4px', color: '#ef4444' }}>
              <Square size={18} fill="currentColor" />
            </button>
          ) : (
            <>
              {inputValue.trim().length === 0 ? (
                <button type="button" onClick={startRecording} className="btn-icon" style={{ flexShrink: 0, marginBottom: '4px' }}>
                  <Mic size={18} />
                </button>
              ) : (
                <button type="submit" className="btn-icon" style={{ flexShrink: 0, marginBottom: '4px' }}>
                  <Send size={18} />
                </button>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
