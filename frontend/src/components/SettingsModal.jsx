import { useState, useRef } from 'react';
import { socket, BACKEND_URL } from '../socket';
import { X, ShieldAlert, Camera, Clock } from 'lucide-react';
import { getAvatarGradient } from '../utils';

export default function SettingsModal({ isOpen, onClose, currentUser, userProfiles, userStats, userStatuses, userPrivacyMode, blockedUsers = [] }) {
  const [activeTab, setActiveTab] = useState('account');
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState(currentUser);
  const fileInputRef = useRef(null);

  const [is2FASetupVisible, setIs2FASetupVisible] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');

  const handleGenerate2FA = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/2fa/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        setQrCodeUrl(data.qrCodeUrl);
        setIs2FASetupVisible(true);
      } else {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: data.error || 'Failed to generate 2FA' }));
      }
    } catch (err) {
      console.error('2FA Generate Error:', err);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: 'Network error generating 2FA' }));
    }
  };

  const handleVerify2FA = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/2fa/verify-enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ totpCode })
      });
      const data = await res.json();
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: '2FA Enabled Successfully!' }));
        setIs2FASetupVisible(false);
        setQrCodeUrl('');
        setTotpCode('');
      } else {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: data.error || 'Invalid Code' }));
      }
    } catch (err) {
      console.error('2FA Verify Error:', err);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: 'Network error verifying 2FA code' }));
    }
  };

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
      window.dispatchEvent(new CustomEvent('app:toast', { detail: 'Please upload an image file.' }));
      return;
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: 'Image is too large! Please upload a file smaller than 10MB.' }));
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        socket.emit('user:update_profile', compressedDataUrl);
        setIsUploading(false);
      };
      img.onerror = () => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: 'Failed to process image.' }));
        setIsUploading(false);
      };
      img.src = reader.result;
    };
    reader.onerror = () => {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: 'Failed to read file.' }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const score = userStats?.reputationScore ?? 100;
  let scoreColor = 'var(--success)';
  if (score <= 75) scoreColor = '#f59e0b'; // warning orange
  if (score <= 50) scoreColor = '#ef4444'; // danger red

  // eslint-disable-next-line react-hooks/purity
  const isSuspended = userStats?.suspendedUntil && Date.now() < userStats.suspendedUntil;
  // eslint-disable-next-line react-hooks/purity
  const remainingMinutes = isSuspended ? Math.ceil((userStats.suspendedUntil - Date.now()) / 60000) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ background: 'var(--bg-color)', borderRadius: '24px', border: '1px solid var(--panel-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px var(--card-bg)', width: '100%', maxWidth: '1100px', maxHeight: '95vh', overflowY: 'hidden', padding: '2.5rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--hover-bg)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.5rem', borderRadius: '50%', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg-strong)'; e.currentTarget.style.color = 'var(--text-main)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '2.5rem', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', flex: 1, minHeight: 0 }}>
          
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
                  boxShadow: '0 0 0 2px var(--hover-bg), 0 12px 32px rgba(0,0,0,0.3)',
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

          {/* Right Column - Grid Layout */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignContent: 'start', minWidth: 'min(100%, 300px)' }}>
            
            {/* Display Name Card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--hover-bg)', borderRadius: '16px', padding: '1.25rem', transition: 'all 0.2s' }}>
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
                  <button onClick={() => { setNewNameInput(currentUser); setIsEditingName(true); }} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'var(--hover-bg)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600' }} onMouseEnter={(e) => { e.currentTarget.style.color='var(--text-main)'; e.currentTarget.style.background='var(--hover-bg-strong)'; }} onMouseLeave={(e) => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='var(--hover-bg)'; }}>
                    Edit Name
                  </button>
                </div>
              )}
            </div>

            {/* Presence Status Card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--hover-bg)', borderRadius: '16px', padding: '1.25rem', transition: 'all 0.2s' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>PRESENCE STATUS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button onClick={() => handleStatusChange('online')} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', padding: '0.6rem 0.75rem', borderRadius: '8px', background: currentStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'var(--sidebar-bottom)', border: `1px solid ${currentStatus === 'online' ? '#10b981' : 'transparent'}`, color: currentStatus === 'online' ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: currentStatus === 'online' ? '0 0 8px rgba(16,185,129,0.5)' : 'none', flexShrink: 0 }}></div> Online
                </button>
                <button onClick={() => handleStatusChange('dnd')} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', padding: '0.6rem 0.75rem', borderRadius: '8px', background: currentStatus === 'dnd' ? 'rgba(245, 158, 11, 0.15)' : 'var(--sidebar-bottom)', border: `1px solid ${currentStatus === 'dnd' ? '#f59e0b' : 'transparent'}`, color: currentStatus === 'dnd' ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: currentStatus === 'dnd' ? '0 0 8px rgba(245,158,11,0.5)' : 'none', flexShrink: 0 }}></div> DND
                </button>
                <button onClick={() => handleStatusChange('invisible')} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', padding: '0.6rem 0.75rem', borderRadius: '8px', background: currentStatus === 'invisible' ? 'rgba(155, 164, 181, 0.15)' : 'var(--sidebar-bottom)', border: `1px solid ${currentStatus === 'invisible' ? '#9ba4b5' : 'transparent'}`, color: currentStatus === 'invisible' ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--text-muted)', flexShrink: 0 }}></div> Invisible
                </button>
              </div>
            </div>

            {/* 2FA Card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--hover-bg)', borderRadius: '16px', padding: '1.25rem', transition: 'all 0.2s' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>🔑 TWO-FACTOR AUTHENTICATION</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>Protect your account with an authenticator app code.</p>
              {!is2FASetupVisible ? (
                <button style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }} onClick={handleGenerate2FA}>
                  Setup 2FA
                </button>
              ) : (
                <div style={{ background: 'var(--panel-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>1. Scan QR code (Authenticator/Authy)</p>
                  {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', marginBottom: '1rem', width: '120px', height: '120px' }} />}
                  <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>2. Enter 6-digit code</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="000000" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', borderRadius: '8px', padding: '0.5rem', outline: 'none', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }} />
                    <button onClick={handleVerify2FA} disabled={totpCode.length !== 6} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', opacity: totpCode.length === 6 ? 1 : 0.5 }}>Verify</button>
                  </div>
                </div>
              )}
            </div>

            {/* Message Privacy Card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--hover-bg)', borderRadius: '16px', padding: '1.25rem', transition: 'all 0.2s', gridRow: 'span 2' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>🔒 MESSAGE PRIVACY</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1rem 0' }}>Who can send you direct messages?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['everyone', 'friends', 'nobody'].map(mode => {
                  const currentPrivacy = userPrivacyMode?.[currentUser] || 'everyone';
                  const isSelected = currentPrivacy === mode;
                  return (
                    <div key={mode} onClick={() => socket.emit('user:set_privacy', mode)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', cursor: 'pointer',
                      background: isSelected ? 'var(--primary-glow)' : 'var(--input-bg)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--panel-border)'}`,
                      borderRadius: '12px', transition: 'all 0.2s'
                    }} onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = 'var(--text-muted)')} onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = 'var(--panel-border)')}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--text-muted)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                      }}>
                        {isSelected && <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }} />}
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {mode === 'friends' ? 'Friends Only' : mode}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {mode === 'everyone' ? 'Anyone can send DMs.' : mode === 'friends' ? 'Only friends can DM.' : 'No one can send DMs.'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Safety & Moderation Card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--hover-bg)', borderRadius: '16px', padding: '1.25rem', transition: 'all 0.2s' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>🛡️ SAFETY & MODERATION</p>
              <button style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.75rem', width: '100%' }} onClick={() => setShowBlockedList(!showBlockedList)}>
                {showBlockedList ? 'Hide Blocked Users' : 'View Blocked Users List'}
              </button>
              {showBlockedList && (
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem', maxHeight: '100px', overflowY: 'auto' }}>
                  {blockedUsers.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>No blocked users.</p>
                  ) : (
                    blockedUsers.map(user => (
                      <div key={user} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--panel-border)' }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '500' }}>{user}</span>
                        <button onClick={() => socket.emit('user:unblock', user)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600' }}>Unblock</button>
                      </div>
                    ))
                  )}
                </div>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, lineHeight: '1.4' }}>
                Need to report a user? Click the 🚩 flag icon next to their name in chat.
              </p>
            </div>

            {/* Reputation Card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--hover-bg)', borderRadius: '16px', padding: '1.25rem', transition: 'all 0.2s' }}>
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
                <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <Clock size={16} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem' }}>Suspension Active</strong>
                    <span style={{ fontSize: '0.75rem' }}>Muted for {remainingMinutes} min.</span>
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
