import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import Sidebar from './components/Sidebar';
import FriendsSidebar from './components/FriendsSidebar';
import ChatArea from './components/ChatArea';
import SettingsModal from './components/SettingsModal';
import UserProfileModal from './components/UserProfileModal';
import { MessageSquare, Globe, KeyRound, Plus, Settings, Sun, Moon, PanelRightClose, PanelRightOpen, ArrowRight, Sparkles, User } from 'lucide-react';
import { initCrypto } from './crypto';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chat_theme') || 'dark';
  });
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [savedRooms, setSavedRooms] = useState([]);
  const [customRoomNames, setCustomRoomNames] = useState({});
  const [roomIdInput, setRoomIdInput] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [userStatuses, setUserStatuses] = useState({});
  const [userStats, setUserStats] = useState({ slangCount: 0, suspendedUntil: null });
  const [userFriends, setUserFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [userPrivacyMode, setUserPrivacyMode] = useState({});
  const [userPublicKeys, setUserPublicKeys] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const myPrivateKeyRef = useRef(null);
  const myPublicKeyJwkRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chat_theme', theme);
  }, [theme]);

  useEffect(() => {
    socket.on('profiles:sync', (profiles) => {
      setUserProfiles(profiles);
    });

    socket.on('statuses:sync', (statuses) => {
      setUserStatuses(statuses);
    });

    socket.on('name_changed:success', (newName) => {
      setUsername(newName);
    });

    socket.on('profile:updated', ({ username, avatarUrl }) => {
      setUserProfiles(prev => ({ ...prev, [username]: avatarUrl }));
    });

    socket.on('user:stats', (stats) => {
      setUserStats(stats);
    });

    socket.on('friends:sync', (friends) => {
      setUserFriends(friends);
    });

    socket.on('friend_requests:sync', (requests) => {
      setFriendRequests(requests);
    });

    socket.on('privacy:sync', (privacySettings) => {
      setUserPrivacyMode(privacySettings);
    });

    socket.on('keys:sync', (keysMap) => {
      setUserPublicKeys(keysMap);
    });

    // Cleanup socket on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (username.trim()) {
      const { privateKey, publicKeyJwk } = await initCrypto(username.trim());
      myPrivateKeyRef.current = privateKey;
      myPublicKeyJwkRef.current = publicKeyJwk;

      setIsLoggedIn(true);

      const saved = JSON.parse(localStorage.getItem(`saved_rooms_${username.trim()}`) || '[]');
      setSavedRooms(saved);
      setActiveRooms(saved);

      const customNames = JSON.parse(localStorage.getItem(`custom_room_names_${username.trim()}`) || '{}');
      setCustomRoomNames(customNames);

      socket.connect();
      socket.emit('user:login', { username: username.trim(), publicKey: publicKeyJwk });
    }
  };

  const joinRoom = (targetRoom) => {
    if (!socket.connected) {
      socket.connect();
      socket.emit('user:login', { username, publicKey: myPublicKeyJwkRef.current });
    }
    socket.emit('user:join', { username, roomId: targetRoom });
    setRoomId(targetRoom);
    setActiveRooms(prev => {
      if (!prev.includes(targetRoom)) return [...prev, targetRoom];
      return prev;
    });
  };

  const leaveRoom = (roomToLeave) => {
    setActiveRooms(prev => prev.filter(r => r !== roomToLeave));
    if (roomId === roomToLeave) {
      setRoomId('');
    }
  };

  const handleSaveRoomToggle = (roomToSave) => {
    setSavedRooms(prev => {
      let newSaved;
      if (prev.includes(roomToSave)) {
        newSaved = prev.filter(r => r !== roomToSave);
      } else {
        newSaved = [...prev, roomToSave];
      }
      localStorage.setItem(`saved_rooms_${username}`, JSON.stringify(newSaved));
      return newSaved;
    });
    setActiveRooms(prev => {
      if (!prev.includes(roomToSave)) return [...prev, roomToSave];
      return prev;
    });
  };

  const handleDeleteRoom = (roomToDelete) => {
    setActiveRooms(prev => prev.filter(r => r !== roomToDelete));
    
    setSavedRooms(prev => {
      const newSaved = prev.filter(r => r !== roomToDelete);
      localStorage.setItem(`saved_rooms_${username}`, JSON.stringify(newSaved));
      return newSaved;
    });

    setCustomRoomNames(prev => {
      const updated = { ...prev };
      delete updated[roomToDelete];
      localStorage.setItem(`custom_room_names_${username}`, JSON.stringify(updated));
      return updated;
    });

    if (roomId === roomToDelete) {
      setRoomId('');
    }
  };

  const handleRenameRoom = (roomToRename, newName) => {
    setCustomRoomNames(prev => {
      const updated = { ...prev };
      if (!newName || !newName.trim()) {
        delete updated[roomToRename];
      } else {
        updated[roomToRename] = newName.trim();
      }
      localStorage.setItem(`custom_room_names_${username}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogout = () => {
    socket.disconnect();
    setIsLoggedIn(false);
    setUsername('');
    setRoomId('');
    setRoomIdInput('');
    setActiveRooms([]);
  };

  const handleJoinGlobal = (e) => {
    e.preventDefault();
    joinRoom('global');
  };

  const handleJoinPrivate = (e) => {
    e.preventDefault();
    if (roomIdInput.trim()) {
      joinRoom(roomIdInput.trim().toUpperCase());
    }
  };

  const handleCreatePrivate = (e) => {
    e.preventDefault();
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinRoom(newRoomId);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button
          className="theme-toggle-slider"
          onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          style={{ 
            position: 'absolute', 
            top: '2rem', 
            right: '2rem', 
            width: '80px',
            height: '40px',
            borderRadius: '40px', 
            background: 'var(--toggle-bg)', 
            border: '1px solid var(--panel-border)', 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer', 
            zIndex: 100, 
            boxShadow: 'var(--toggle-shadow)',
            padding: '4px'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {/* Animated Thumb */}
          <div style={{
            position: 'absolute',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 2px 12px var(--primary-glow)',
            left: theme === 'dark' ? '42px' : '4px',
            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)'
          }}></div>

          {/* Icons */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 6px', zIndex: 2, position: 'relative', pointerEvents: 'none' }}>
            <Sun size={18} color={theme === 'light' ? 'var(--primary-text)' : 'var(--text-muted)'} style={{ transition: 'color 0.5s', zIndex: 3 }} />
            <Moon size={18} color={theme === 'dark' ? 'var(--primary-text)' : 'var(--text-muted)'} style={{ transition: 'color 0.5s', zIndex: 3 }} />
          </div>
        </button>
        
        <div className="glass glass-panel login-container animate-fade-in" style={{ 
          maxWidth: '440px', 
          width: '100%',
          padding: '3.5rem 2.5rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: 'var(--login-shadow)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)',
            transform: 'rotate(-5deg)'
          }}>
            <Sparkles size={40} color="#ffffff" style={{ transform: 'rotate(5deg)' }} />
          </div>
          
          <h1 className="title" style={{ 
            color: 'var(--text-main)', 
            fontSize: '1.8rem', 
            fontWeight: '700', 
            marginBottom: '0.5rem',
            letterSpacing: '-0.5px'
          }}>Welcome Back</h1>
          <p className="subtitle" style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2.5rem' }}>Enter your username to join the conversation</p>

          <form onSubmit={handleLogin} className="login-form" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
              <label htmlFor="username-input" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginLeft: '0.2rem', textAlign: 'left', display: 'block' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.7, pointerEvents: 'none' }} />
                <input
                  id="username-input"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                  style={{ paddingLeft: '2.5rem' }}
                  autoFocus
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!username.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                marginTop: '0.5rem',
                transition: 'all 0.2s',
                opacity: !username.trim() ? 0.5 : 1
              }}
            >
              Continue <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="app-layout animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Mobile Backdrop */}
      <div 
        className={`mobile-backdrop ${showMobileSidebar || showFriends ? 'active' : ''}`}
        onClick={() => {
          setShowMobileSidebar(false);
          setShowFriends(false);
        }}
      ></div>

      <Sidebar
        currentUser={username}
        activeRooms={activeRooms}
        savedRooms={savedRooms}
        currentRoom={roomId}
        customRoomNames={customRoomNames}
        onRenameRoom={handleRenameRoom}
        onDeleteRoom={handleDeleteRoom}
        onSelectRoom={(rId) => {
          joinRoom(rId);
          setShowMobileSidebar(false);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        onToggleFriends={() => setShowFriends(prev => !prev)}
        showFriends={showFriends}
        friendRequestsCount={friendRequests.length}
        isMobileOpen={showMobileSidebar}
        onCloseMobile={() => setShowMobileSidebar(false)}
      />

      {!roomId ? (
        // Room Selector Screen
        <div className="chat-area glass glass-panel" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-1px', color: 'var(--text-main)' }}>Choose a Room</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Where would you like to go, <strong style={{ color: 'var(--text-main)' }}>{username}</strong>?</p>
            </div>

            <div className="room-options-grid" style={{ margin: 0 }}>
              <button className="room-card" onClick={handleJoinGlobal}>
                <Globe size={40} color="var(--primary)" />
                <div>
                  <h3>Global Chat</h3>
                  <p>Talk with everyone online</p>
                </div>
              </button>
              
              <button className="room-card" onClick={handleCreatePrivate}>
                <Plus size={40} color="var(--primary)" />
                <div>
                  <h3>New Private Room</h3>
                  <p>Create a secret chat</p>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '1px' }}>OR JOIN EXISTING</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
            </div>

            <form onSubmit={handleJoinPrivate} className="room-input-group" style={{ 
              display: 'flex', 
              gap: '0.4rem', 
              background: 'rgba(0,0,0,0.15)', 
              padding: '0.35rem', 
              borderRadius: '12px', 
              border: '1px solid var(--panel-border)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              maxWidth: '320px',
              margin: '0 auto',
              backdropFilter: 'blur(10px)'
            }}>
              <input
                type="text"
                placeholder="ROOM CODE"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  textTransform: 'uppercase', 
                  fontSize: '0.9rem', 
                  letterSpacing: '2px', 
                  textAlign: 'center', 
                  color: 'var(--text-main)', 
                  outline: 'none',
                  fontWeight: '600',
                  padding: '0.4rem'
                }}
                maxLength={6}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!roomIdInput.trim()}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.3rem', 
                  padding: '0.4rem 1.25rem', 
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.85rem'
                }}
              >
                <KeyRound size={16} /> Join
              </button>
            </form>
          </div>
        </div>
      ) : (
        <ChatArea
          currentUser={username}
          roomId={roomId}
          onLeave={() => leaveRoom(roomId)}
          userProfiles={userProfiles}
          userStatuses={userStatuses}
          userFriends={userFriends}
          userPrivacyMode={userPrivacyMode}
          userPublicKeys={userPublicKeys}
          myPrivateKey={myPrivateKeyRef.current}
          onSelectUser={setSelectedUserProfile}
          onToggleFriends={() => setShowFriends(prev => !prev)}
          showFriends={showFriends}
          onSaveRoom={handleSaveRoomToggle}
          isSaved={savedRooms.includes(roomId)}
          customRoomName={customRoomNames[roomId]}
          onRenameRoom={handleRenameRoom}
          onToggleMobileSidebar={() => setShowMobileSidebar(true)}
        />
      )}

      <div 
        className={`friends-sidebar ${showFriends ? 'mobile-open' : ''}`}
        style={{
          width: showFriends ? '320px' : '0px',
          opacity: showFriends ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          flexShrink: 0,
          height: '100%'
        }}
      >
        <div style={{ width: '320px', height: '100%' }}>
          <FriendsSidebar
            currentUser={username}
            userProfiles={userProfiles}
            userStatuses={userStatuses}
            userFriends={userFriends}
            friendRequests={friendRequests}
            onSelectUser={setSelectedUserProfile}
            onClose={() => setShowFriends(false)}
          />
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={username}
        userProfiles={userProfiles}
        userStats={userStats}
        userStatuses={userStatuses}
        userPrivacyMode={userPrivacyMode}
      />

      <UserProfileModal
        isOpen={!!selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
        targetUser={selectedUserProfile}
        currentUser={username}
        userProfiles={userProfiles}
        userStatuses={userStatuses}
        userFriends={userFriends}
        friendRequests={friendRequests}
        sentRequests={sentRequests}
        onSendRequest={(user) => setSentRequests(prev => { const n = new Set(prev); n.add(user); return n; })}
        onCancelRequest={(user) => setSentRequests(prev => { const n = new Set(prev); n.delete(user); return n; })}
        userPrivacyMode={userPrivacyMode}
        onJoinRoom={(newRoomId) => {
          setSelectedUserProfile(null);
          joinRoom(newRoomId);
        }}
      />
    </div>
  );
}

export default App;
