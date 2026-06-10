import { useState } from 'react';
import { Settings, LogOut, MessageSquare, Globe, Hash, Users, Bookmark, Edit2, X } from 'lucide-react';

export default function Sidebar({ currentUser, activeRooms, savedRooms = [], currentRoom, customRoomNames, onSelectRoom, onOpenSettings, onLogout, onToggleFriends, showFriends, friendRequestsCount, onRenameRoom, onDeleteRoom, isMobileOpen, onCloseMobile }) {
  const displayRooms = Array.from(new Set([...savedRooms, ...activeRooms]));
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  return (
    <div className={`sidebar glass glass-panel ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header" style={{ padding: '1.5rem 1rem 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="sidebar-title" style={{ padding: '0 0.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
          <div style={{ background: 'var(--primary)', padding: '0.4rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--primary-glow)' }}>
            <Bookmark size={20} strokeWidth={2.5} color="var(--primary-text)" />
          </div>
          Your Chats
        </h2>
        <button className="mobile-close-btn" onClick={onCloseMobile}>
          <X size={24} />
        </button>
      </div>
      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {displayRooms.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Bookmark size={36} color="var(--panel-border)" style={{ opacity: 0.5 }} />
            No saved or active rooms.
          </div>
        ) : (
          displayRooms.map((roomId) => {
            const isGlobal = roomId === 'global';
            const isFriend = roomId.startsWith('PRIVATE-');
            const isActive = roomId === currentRoom;
            
            let icon = <Hash size={18} />;
            let title = roomId;
            
            if (isGlobal) {
              icon = <Globe size={18} />;
              title = "Global Chat";
            } else if (isFriend) {
              // Extract the other person's name
              const users = roomId.replace('PRIVATE-', '').split('-');
              title = users[0] === currentUser ? users[1] : users[0];
            }
            
            if (customRoomNames && customRoomNames[roomId]) {
              title = customRoomNames[roomId];
            }

            const isEditing = editingRoomId === roomId;

            return (
              <div 
                key={roomId} 
                className={`user-item animate-slide-in ${isActive ? 'active-room' : ''}`}
                style={{ 
                  cursor: 'pointer', 
                  background: isActive ? 'var(--panel-bg)' : 'transparent',
                  border: isActive ? '1px solid var(--panel-border)' : '1px solid transparent',
                  position: 'relative'
                }}
                onClick={() => { if (!isEditing) onSelectRoom(roomId); }}
                onMouseEnter={() => setHoveredRoomId(roomId)}
                onMouseLeave={() => setHoveredRoomId(null)}
              >
                <div style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {icon}
                </div>
                
                {isEditing ? (
                  <input 
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      e.stopPropagation();
                      setEditingRoomId(null);
                      if (onRenameRoom) onRenameRoom(roomId, editingValue);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        setEditingRoomId(null);
                        if (onRenameRoom) onRenameRoom(roomId, editingValue);
                      }
                    }}
                    style={{
                      background: 'var(--bg-color)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--primary)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.9rem',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <>
                    <span className="user-name" style={{ color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{title}</span>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {!isGlobal && hoveredRoomId === roomId && !isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRoomId(roomId);
                              setEditingValue(title === roomId ? '' : title);
                            }}
                            style={{
                              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            title="Rename Chat"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteRoom) onDeleteRoom(roomId);
                            }}
                            style={{
                              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            title="Delete Chat"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {savedRooms.includes(roomId) && hoveredRoomId !== roomId && (
                        <Bookmark size={14} style={{ color: 'var(--text-muted)' }} />
                      )}
                      
                      {isActive && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)', flexShrink: 0 }}></div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer / Settings & Logout */}
      <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        
        <button 
          onClick={onToggleFriends}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.75rem', 
            background: showFriends ? 'var(--panel-bg)' : 'transparent',
            color: showFriends ? 'var(--text-main)' : 'var(--text-muted)',
            borderRadius: '12px',
            transition: 'background 0.2s',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!showFriends) {
              e.currentTarget.style.background = 'var(--panel-bg)';
              e.currentTarget.style.color = 'var(--text-main)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showFriends) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }
          }}
        >
          <div style={{ position: 'relative' }}>
            <Users size={20} />
            {friendRequestsCount > 0 && (
              <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-color)' }}></div>
            )}
          </div>
          <span style={{ fontWeight: '500', flex: 1, textAlign: 'left' }}>Friends</span>
          {friendRequestsCount > 0 && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
              {friendRequestsCount}
            </span>
          )}
        </button>

        <button 
          onClick={onOpenSettings}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.75rem', 
            background: 'transparent',
            color: 'var(--text-muted)',
            borderRadius: '12px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--panel-bg)';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Settings size={20} />
          <span style={{ fontWeight: '500' }}>Settings</span>
        </button>

        <button 
          onClick={onLogout}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.75rem', 
            background: 'transparent',
            color: '#ef4444',
            borderRadius: '12px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={20} />
          <span style={{ fontWeight: '500' }}>Log Out</span>
        </button>
      </div>
    </div>
  );
}
