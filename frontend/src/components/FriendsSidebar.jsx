import { Heart, Check, X, UserPlus } from 'lucide-react';
import { getAvatarGradient } from '../utils';
import { socket } from '../socket';

export default function FriendsSidebar({ currentUser, userProfiles, userStatuses, userFriends, friendRequests, onSelectUser, onClose }) {
  const displayUsers = userFriends || [];

  return (
    <div className="friends-sidebar glass glass-panel">
      <div className="sidebar-header" style={{ padding: '1.5rem 1rem 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="sidebar-title" style={{ padding: '0 0.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
          <div style={{ background: '#ef4444', padding: '0.4rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}>
            <Heart size={20} strokeWidth={2.5} color="white" />
          </div>
          Friends
        </h2>
      </div>
      <div className="sidebar-content">
        {friendRequests && friendRequests.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
              Pending Requests ({friendRequests.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {friendRequests.map(reqUser => {
                const reqAvatar = userProfiles && userProfiles[reqUser];
                return (
                  <div key={reqUser} className="user-item animate-slide-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.5rem', cursor: 'pointer' }} onClick={() => onSelectUser(reqUser)}>
                    <div className="avatar" style={{ width: '32px', height: '32px', background: reqAvatar ? `url(${reqAvatar}) center/cover` : getAvatarGradient(reqUser) }}>
                      {!reqAvatar && reqUser.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name" style={{ flex: 1, fontSize: '0.9rem' }}>{reqUser}</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); socket.emit('user:accept_friend_request', reqUser); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#10b981'; }}
                        title="Accept Request"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); socket.emit('user:decline_friend_request', reqUser); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                        title="Decline Request"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)', margin: '1rem 0' }}></div>
          </div>
        )}

        {displayUsers.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <UserPlus size={36} color="var(--panel-border)" style={{ opacity: 0.5 }} />
            No friends added yet.
          </div>
        ) : (
          displayUsers
            .filter(user => user === currentUser || userStatuses[user] !== 'invisible')
            .map((user) => {
              const customAvatar = userProfiles && userProfiles[user];
              const status = userStatuses[user] || 'online';
              let dotColor = '#10b981'; // online green
              let dotBorder = '2px solid var(--bg-color)';
              
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
                  style={{ opacity: status === 'invisible' ? 0.5 : 1, cursor: 'pointer' }}
                  onClick={() => onSelectUser(user)}
                >
                  <div 
                    className="avatar" 
                    style={{ 
                      background: customAvatar ? `url(${customAvatar}) center/cover` : getAvatarGradient(user) 
                    }}
                  >
                    {!customAvatar && user.charAt(0).toUpperCase()}
                    <div className="status-dot" style={{ background: dotColor, border: dotBorder }}></div>
                  </div>
                  <span className="user-name">{user}</span>
                  {user === currentUser && (
                    <span className="user-me-badge">You</span>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
