import { socket } from '../socket';
import { X, UserPlus, UserMinus, MessageCircle, Clock, Check } from 'lucide-react';
import { getAvatarGradient } from '../utils';

export default function UserProfileModal({ isOpen, onClose, targetUser, currentUser, userProfiles, userStatuses, userFriends, friendRequests, sentRequests = new Set(), onSendRequest, onCancelRequest, userPrivacyMode, onJoinRoom }) {
  if (!isOpen || !targetUser) return null;

  const targetAvatar = userProfiles[targetUser];
  const targetStatus = userStatuses[targetUser] || 'online';
  const isFriend = userFriends.includes(targetUser);
  const isSelf = targetUser === currentUser;
  
  const isPrivacyEnabled = userPrivacyMode?.[targetUser] && !isFriend && !isSelf;
  const displayName = isPrivacyEnabled ? 'Anonymous User' : targetUser;
  const displayAvatar = isPrivacyEnabled ? null : userProfiles[targetUser];

  let dotColor = '#10b981';
  let dotBorder = '2px solid var(--bg-color)';
  if (targetStatus === 'dnd') dotColor = '#f59e0b';
  if (targetStatus === 'invisible') {
    dotColor = 'transparent';
    dotBorder = '2px solid var(--text-muted)';
  }

  const hasIncomingRequest = friendRequests && friendRequests.includes(targetUser);
  const hasSentRequest = sentRequests.has(targetUser);

  const handleFriendAction = () => {
    if (isFriend) {
      socket.emit('user:remove_friend', targetUser);
    } else if (hasIncomingRequest) {
      socket.emit('user:accept_friend_request', targetUser);
    } else if (hasSentRequest) {
      socket.emit('user:cancel_friend_request', targetUser);
      if (onCancelRequest) onCancelRequest(targetUser);
    } else {
      socket.emit('user:send_friend_request', targetUser);
      if (onSendRequest) onSendRequest(targetUser);
    }
  };

  const handleMessage = () => {
    // Generate deterministic private room ID
    const privateRoomId = `PRIVATE-${[currentUser, targetUser].sort().join('-')}`;
    onJoinRoom(privateRoomId);
  };

  return (
    <div className="modal-overlay">
      <div className="glass glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
          <X size={24} />
        </button>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <div 
            style={{ 
              width: '100px', height: '100px', borderRadius: '50%', 
              background: displayAvatar ? `url(${displayAvatar}) center/cover` : getAvatarGradient(displayName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', color: 'var(--bg-color)', fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '3px solid var(--bg-color)'
            }}
          >
            {!displayAvatar && displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ position: 'absolute', bottom: '0', right: '0', width: '20px', height: '20px', borderRadius: '50%', background: dotColor, border: dotBorder, boxShadow: targetStatus !== 'invisible' ? `0 0 10px ${dotColor}80` : 'none' }}></div>
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: isPrivacyEnabled ? 'var(--text-muted)' : 'var(--text-main)', marginBottom: '0.25rem', fontStyle: isPrivacyEnabled ? 'italic' : 'normal' }}>{displayName}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', textTransform: 'capitalize' }}>{targetStatus}</p>

        {!isSelf && (
          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            {!isPrivacyEnabled && (
              <button 
                onClick={handleFriendAction}
                style={{ 
                  flex: 1, 
                  padding: '0.75rem', 
                  borderRadius: '12px', 
                  background: isFriend ? 'rgba(239, 68, 68, 0.1)' : hasIncomingRequest ? '#10b981' : hasSentRequest ? 'var(--panel-bg)' : 'var(--primary)', 
                  color: isFriend ? '#ef4444' : hasIncomingRequest ? 'white' : hasSentRequest ? 'var(--text-main)' : 'var(--bg-color)', 
                  border: isFriend ? '1px solid rgba(239, 68, 68, 0.3)' : hasSentRequest ? '1px solid var(--panel-border)' : 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  fontWeight: '600', 
                  transition: 'all 0.2s', 
                  cursor: 'pointer' 
                }}
              >
                {isFriend ? <UserMinus size={18} /> : hasIncomingRequest ? <Check size={18} /> : hasSentRequest ? <Clock size={18} /> : <UserPlus size={18} />}
                {isFriend ? 'Remove Friend' : hasIncomingRequest ? 'Accept Request' : hasSentRequest ? 'Cancel Request' : 'Send Request'}
              </button>
            )}

            <button 
              onClick={handleMessage}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: '600', transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel-border)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--panel-bg)'; }}
            >
              <MessageCircle size={18} />
              Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
