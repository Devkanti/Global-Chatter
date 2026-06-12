import { useEffect, useState } from 'react';
import { Info, CheckCircle, XCircle } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(onClose, 300); // wait for exit animation
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const getTheme = () => {
    switch (type) {
      case 'success': return { color: '#10b981', icon: <CheckCircle size={20} strokeWidth={2.5} />, glow: 'rgba(16,185,129,0.2)' };
      case 'error': return { color: '#ef4444', icon: <XCircle size={20} strokeWidth={2.5} />, glow: 'rgba(239,68,68,0.2)' };
      default: return { color: 'var(--primary)', icon: <Info size={20} strokeWidth={2.5} />, glow: 'var(--primary-glow)' };
    }
  };

  const theme = getTheme();

  return (
    <>
      <style>{`
        @keyframes toastEnter {
          0% { opacity: 0; transform: translate(-50%, -20px) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes toastExit {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -15px) scale(0.95); }
        }
        @keyframes progressShrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(20, 15, 35, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `4px solid ${theme.color}`,
        color: 'var(--text-main)',
        padding: '1rem 1.25rem',
        borderRadius: '16px',
        zIndex: 99999,
        fontWeight: '600',
        boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 20px ${theme.glow}`,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        minWidth: '320px',
        maxWidth: '90vw',
        textAlign: 'left',
        fontSize: '0.95rem',
        lineHeight: '1.4',
        animation: isClosing ? 'toastExit 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'toastEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        overflow: 'hidden'
      }}>
        {/* Progress bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: theme.color,
          animation: 'progressShrink 4000ms linear forwards',
          opacity: 0.8
        }}></div>

        <div style={{ 
          color: theme.color, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: theme.glow,
          padding: '8px',
          borderRadius: '50%'
        }}>
          {theme.icon}
        </div>
        <div style={{ flex: 1, letterSpacing: '0.3px' }}>
          {message}
        </div>
        <button 
          onClick={handleClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </>
  );
}
