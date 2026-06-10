import { useState, useRef } from 'react';
import { socket } from '../socket';
import { X, Upload, ShieldAlert, Clock, EyeOff, Camera } from 'lucide-react';
import { getAvatarGradient } from '../utils';

export default function SettingsModal({ isOpen, onClose, currentUser, userProfiles, userStats, userStatuses, userPrivacyMode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState(currentUser);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const currentStatus = userStatuses?.[currentUser] || 'online';

  const handleStatusChange = (status) => {
    socket.emit('user:update_status', status);
  };

  const handleNameSave = () => {
    if (newNameInput.trim() !== '' && newNameInput !== currentUser) {
      socket.emit('user:change_name', newNameInput.trim());
    }
    setIsEditingName(false);
  };

  const currentAvatar = userProfiles[currentUser];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    // Limit file size to ~200KB to prevent memory bloat
    if (file.size > 200 * 1024) {
      alert('Image is too large! Please upload a file smaller than 200KB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      socket.emit('user:update_profile', base64String);
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Failed to read file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const score = Math.max(0, 100 - (userStats?.slangCount * 2.5));
  let scoreColor = 'var(--success)';
  if (score <= 75) scoreColor = '#f59e0b'; // warning orange
  if (score <= 50) scoreColor = '#ef4444'; // danger red

  const isSuspended = userStats?.suspendedUntil && Date.now() < userStats.suspendedUntil;
  const remainingMinutes = isSuspended ? Math.ceil((userStats.suspendedUntil - Date.now()) / 60000) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ background: 'var(--body-bg)', borderRadius: '24px', border: '1px solid var(--panel-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)', width: '100%', maxWidth: '700px', padding: '2rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>User Settings</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', flexDirection: 'row' }}>
          
          {/* Left Column - Profile Summary */}
          <div style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{ position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setIsHoveringAvatar(true)}
              onMouseLeave={() => setIsHoveringAvatar(false)}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <div 
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  background: currentAvatar ? `url(${currentAvatar}) center/cover` : getAvatarGradient(currentUser),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  color: 'var(--bg-color)',
                  fontWeight: '700',
                  border: '4px solid var(--panel-border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  transition: 'filter 0.2s',
                  filter: isHoveringAvatar ? 'brightness(0.7)' : 'brightness(1)'
                }}
              >
                {!currentAvatar && currentUser.charAt(0).toUpperCase()}
              </div>
              
              {/* Camera Overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: isHoveringAvatar ? 1 : 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'white',
                pointerEvents: 'none'
              }}>
                <Camera size={28} style={{ marginBottom: '4px' }}/>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {isUploading ? 'Uploading...' : 'Edit'}
                </span>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600', color: 'var(--text-main)', wordBreak: 'break-all' }}>{currentUser}</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>Active</span>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          {/* Right Column - Settings Cards */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
            
            {/* Display Name Card */}
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>DISPLAY NAME</p>
              {isEditingName ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
                    autoFocus
                    style={{ flex: 1, fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-main)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px', outline: 'none' }}
                  />
                  <button onClick={handleNameSave} style={{ background: 'var(--primary)', color: 'var(--primary-text)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '600' }}>Save</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '500', color: 'var(--text-main)' }}>{currentUser}</span>
                  <button onClick={() => { setNewNameInput(currentUser); setIsEditingName(true); }} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600' }} onMouseEnter={(e) => { e.currentTarget.style.color='var(--text-main)'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}>
                    Edit Name
                  </button>
                </div>
              )}
            </div>

            {/* Presence Status Card */}
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>PRESENCE STATUS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button onClick={() => handleStatusChange('online')} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', padding: '0.6rem 0.75rem', borderRadius: '8px', background: currentStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0,0,0,0.1)', border: `1px solid ${currentStatus === 'online' ? '#10b981' : 'transparent'}`, color: currentStatus === 'online' ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: currentStatus === 'online' ? '0 0 8px rgba(16,185,129,0.5)' : 'none', flexShrink: 0 }}></div> Online
                </button>
                <button onClick={() => handleStatusChange('dnd')} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', padding: '0.6rem 0.75rem', borderRadius: '8px', background: currentStatus === 'dnd' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0,0,0,0.1)', border: `1px solid ${currentStatus === 'dnd' ? '#f59e0b' : 'transparent'}`, color: currentStatus === 'dnd' ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: currentStatus === 'dnd' ? '0 0 8px rgba(245,158,11,0.5)' : 'none', flexShrink: 0 }}></div> Do Not Disturb
                </button>
                <button onClick={() => handleStatusChange('invisible')} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', padding: '0.6rem 0.75rem', borderRadius: '8px', background: currentStatus === 'invisible' ? 'rgba(155, 164, 181, 0.15)' : 'rgba(0,0,0,0.1)', border: `1px solid ${currentStatus === 'invisible' ? '#9ba4b5' : 'transparent'}`, color: currentStatus === 'invisible' ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--text-muted)', flexShrink: 0 }}></div> Invisible
                </button>
              </div>
            </div>

            {/* Privacy Card */}
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>PRIVACY & SAFETY</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                    <EyeOff size={18} color={userPrivacyMode?.[currentUser] ? '#10b981' : 'var(--text-muted)'} />
                  </div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.95rem' }}>Privacy Mode</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Block strangers and friend requests</span>
                  </div>
                </div>
                <button 
                  onClick={() => socket.emit('user:toggle_privacy')}
                  style={{ width: '44px', height: '24px', borderRadius: '12px', background: userPrivacyMode?.[currentUser] ? '#10b981' : 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--text-main)', position: 'absolute', top: '1px', left: userPrivacyMode?.[currentUser] ? '21px' : '1px', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </button>
              </div>
            </div>

            {/* Reputation Card */}
            <div style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '16px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>REPUTATION SCORE</p>
                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: scoreColor, lineHeight: 1 }}>{score}%</span>
              </div>
              
              <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }}>
                <div style={{ 
                  width: `${score}%`, 
                  height: '100%', 
                  background: score === 100 ? 'linear-gradient(90deg, #059669, #10b981)' : scoreColor, 
                  borderRadius: '4px', 
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: `0 0 8px ${scoreColor}` 
                }}></div>
              </div>
              
              {isSuspended ? (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                  <Clock size={18} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.9rem' }}>Suspension Active</strong>
                    <span style={{ fontSize: '0.8rem' }}>Muted for {remainingMinutes} more minute(s).</span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.75rem 0 0 0' }}>
                  <ShieldAlert size={12} style={{ color: scoreColor }}/>
                  Maintain good behavior to avoid chat suspensions.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
