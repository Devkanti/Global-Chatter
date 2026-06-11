import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderTop: '4px solid #3b82f6',
      color: '#f8fafc',
      padding: '1rem 1.25rem',
      borderRadius: '12px',
      zIndex: 99999,
      fontWeight: '500',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem',
      minWidth: '300px',
      maxWidth: '90vw',
      textAlign: 'left',
      fontSize: '0.95rem',
      lineHeight: '1.4'
    }}>
      <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
        <AlertCircle size={22} />
      </div>
      <div style={{ flex: 1 }}>
        {message}
      </div>
      <button 
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  );
}
