import { X, ShieldCheck } from 'lucide-react';

export default function SecurityModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="modal-content animate-slide-up" style={{
        background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
        borderRadius: '24px', width: '100%', maxWidth: '600px',
        padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'var(--text-main)', position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
            <ShieldCheck size={28} color="#10b981" />
            Security & Vulnerability Reporting
          </h2>
          <button onClick={onClose} style={{
            background: 'var(--hover-bg)', border: 'none', color: 'var(--text-main)',
            width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-border)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--hover-bg)'}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ lineHeight: '1.6', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '1.5rem' }}>
            We take security seriously. If you are a security researcher and have discovered a vulnerability or bug on our chatting platform, please report it to us responsibly.
          </p>
          
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '1rem' }}>How to Report:</h3>
          
          <p style={{ marginBottom: '1rem' }}>
            Please email your findings directly to <a href="mailto:security@yourwebsite.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>security@yourwebsite.com</a>.
          </p>
          
          <p style={{ marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-main)' }}>Please include:</p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>A detailed description of the vulnerability.</li>
            <li>Clear steps to reproduce the issue (or a proof-of-concept video/script).</li>
            <li>The potential impact of the bug.</li>
          </ul>
          
          <p style={{ margin: 0, fontWeight: '600', color: '#10b981' }}>
            Thank you for keeping our chat community safe!
          </p>
        </div>
      </div>
    </div>
  );
}
