import { useState } from 'react';
import { Settings, LogOut, MessageSquare, Globe, Hash, Users, Bookmark, Edit2, X, Plus, Trash2 } from 'lucide-react';

export default function Sidebar({ currentUser, activeRooms, savedRooms = [], currentRoom, customRoomNames, onNewChat, onSelectRoom, onOpenSettings, onLogout, onToggleFriends, showFriends, friendRequestsCount, onRenameRoom, onDeleteRoom, isMobileOpen, onCloseMobile }) {
  const displayRooms = Array.from(new Set([...savedRooms, ...activeRooms]));
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  return (
    <div className={`sidebar glass glass-panel ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header" style={{ padding: '1.5rem 1rem 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="sidebar-title" style={{ padding: '0 0.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
          <div style={{ background: '#c4b5fd', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(196, 181, 253, 0.3)' }}>
            <Bookmark size={20} strokeWidth={2.5} color="#1e1e2e" className="animated-icon" />
          </div>
          Your Chats
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={() => {
              if (onNewChat) onNewChat();
              if (isMobileOpen && onCloseMobile) onCloseMobile();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
            title="New Chat"
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)' }}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
          <button className="mobile-close-btn" onClick={onCloseMobile}>
            <X size={24} />
          </button>
        </div>
      </div>
      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
                  background: isActive ? 'rgba(196, 181, 253, 0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'all 0.2s',
                  padding: '0.6rem 0.75rem',
                  gap: '0.75rem'
                }}
                onClick={() => { if (!isEditing) onSelectRoom(roomId); }}
                onMouseEnter={e => {
                  setHoveredRoomId(roomId);
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={e => {
                  setHoveredRoomId(null);
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  width: '32px', height: '32px', borderRadius: '10px', 
                  background: isActive ? '#c4b5fd' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#1e1e2e' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 12px rgba(196, 181, 253, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}>
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
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.9rem',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <>
                    <span className="user-name" style={{ color: isActive ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: isActive ? '600' : '500' }}>{title}</span>
                    
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
                              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '6px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
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
                              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '6px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                            title="Delete Chat"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {savedRooms.includes(roomId) && hoveredRoomId !== roomId && (
                        <Bookmark size={14} style={{ color: isActive ? '#c4b5fd' : 'var(--text-muted)', opacity: isActive ? 1 : 0.5 }} />
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
      <div style={{ marginTop: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(0, 0, 0, 0.1)', borderTop: '1px solid rgba(255, 255, 255, 0.02)' }}>
        
        <button 
          onClick={onToggleFriends}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.5rem', 
            background: showFriends ? 'rgba(253, 164, 175, 0.1)' : 'transparent',
            color: showFriends ? 'var(--text-main)' : 'var(--text-muted)',
            borderRadius: '12px',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!showFriends) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showFriends) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <div style={{ position: 'relative' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: showFriends ? '#fda4af' : 'rgba(255,255,255,0.05)', color: showFriends ? '#1e1e2e' : 'inherit', boxShadow: showFriends ? '0 4px 12px rgba(253, 164, 175, 0.3)' : 'none', transition: 'all 0.2s' }}>
              <Users size={18} />
            </div>
            {friendRequestsCount > 0 && (
              <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--panel-bg)' }}></div>
            )}
          </div>
          <span style={{ fontWeight: showFriends ? '600' : '500', flex: 1, textAlign: 'left' }}>Friends</span>
          {friendRequestsCount > 0 && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
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
            padding: '0.5rem', 
            background: 'transparent',
            color: 'var(--text-muted)',
            borderRadius: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'inherit', transition: 'all 0.2s' }}>
            <Settings size={18} />
          </div>
          <span style={{ fontWeight: '500' }}>Settings</span>
        </button>

        <button 
          onClick={onLogout}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            padding: '0.5rem', 
            background: 'transparent',
            color: '#ef4444',
            borderRadius: '12px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'inherit', transition: 'all 0.2s' }}>
            <LogOut size={18} />
          </div>
          <span style={{ fontWeight: '500' }}>Log Out</span>
        </button>
      </div>
    </div>
  );
}
