import { User, Check, X, UserPlus } from 'lucide-react';
import { getAvatarGradient } from '../utils';
import { socket } from '../socket';

export default function FriendsSidebar({ currentUser, userProfiles, userStatuses, userFriends, friendRequests, onSelectUser, onClose }) {
  const displayUsers = userFriends || [];

  return (
    <div className="friends-sidebar glass glass-panel">
      <div className="sidebar-header" style={{ padding: '1.5rem 1rem 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="sidebar-title" style={{ padding: '0 0.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
          <div style={{ background: '#fda4af', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(253, 164, 175, 0.3)' }}>
            <User size={20} strokeWidth={2.5} color="#1e1e2e" className="animated-icon" />
          </div>
          Friends
        </h2>
      </div>
      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {friendRequests && friendRequests.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
              Pending Requests ({friendRequests.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {friendRequests.map(reqUser => {
                const reqAvatar = userProfiles && userProfiles[reqUser];
                return (
                  <div 
                    key={reqUser} 
                    className="user-item animate-slide-in" 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.75rem', 
                      padding: '0.6rem 0.75rem', cursor: 'pointer',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      background: 'transparent'
                    }} 
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--icon-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onSelectUser(reqUser)}
                  >
                    <div className="avatar" style={{ width: '36px', height: '36px', background: reqAvatar ? `url(${reqAvatar}) center/cover` : getAvatarGradient(reqUser) }}>
                      {!reqAvatar && reqUser.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name" style={{ flex: 1, fontSize: '0.95rem', fontWeight: '500' }}>{reqUser}</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); socket.emit('user:accept_friend_request', reqUser); }}
                        style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#10b981'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#10b981'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'; }}
                        title="Accept Request"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); socket.emit('user:decline_friend_request', reqUser); }}
                        style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
                        title="Decline Request"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ width: '100%', height: '1px', background: 'var(--hover-bg)', margin: '1rem 0' }}></div>
          </div>
        )}

        {displayUsers.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <UserPlus size={36} color="var(--panel-border)" style={{ opacity: 0.5 }} />
            No friends added yet.
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
              All Friends ({displayUsers.filter(u => u === currentUser || userStatuses[u] !== 'invisible').length})
            </p>
            {displayUsers
              .filter(user => user === currentUser || userStatuses[user] !== 'invisible')
              .map((user) => {
                const customAvatar = userProfiles && userProfiles[user];
                const status = userStatuses[user] || 'online';
                let dotColor = '#10b981'; // online green
                let dotBorder = '2px solid var(--panel-bg)';
                
                if (status === 'dnd') {
                  dotColor = '#f59e0b';
                } else if (status === 'invisible') {
                  dotColor = 'transparent';
                  dotBorder = '2px solid #9ba4b5';
                }

                return (
                  <div 
                    key={user} 
                    className="user-item animate-slide-in" 
                    style={{ 
                      opacity: status === 'invisible' ? 0.5 : 1, 
                      cursor: 'pointer',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      padding: '0.6rem 0.75rem',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--icon-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => onSelectUser(user)}
                  >
                    <div 
                      className="avatar" 
                      style={{ 
                        width: '36px', height: '36px',
                        background: customAvatar ? `url(${customAvatar}) center/cover` : getAvatarGradient(user) 
                      }}
                    >
                      {!customAvatar && user.charAt(0).toUpperCase()}
                      <div className="status-dot" style={{ background: dotColor, border: dotBorder }}></div>
                    </div>
                    <span className="user-name" style={{ fontWeight: '500', fontSize: '0.95rem' }}>{user}</span>
                    {user === currentUser && (
                      <span className="user-me-badge" style={{ marginLeft: 'auto', background: 'var(--hover-bg-strong)', padding: '0.1rem 0.5rem', borderRadius: '8px', fontSize: '0.7rem' }}>You</span>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}
