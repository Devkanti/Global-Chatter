import { useState, useEffect } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const { installPromptEvent, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if not already installed
    if (!isStandalone) {
      // Small delay so it doesn't pop up immediately on first load
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isStandalone]);

  if (!show || isStandalone) return null;

  // We only show the custom prompt if there is a native prompt event ready OR if it's iOS
  if (!installPromptEvent && !isIOS) return null;

  return (
    <div className="install-prompt-overlay" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, width: '90%', maxWidth: '400px' }}>
      <div className="glass glass-panel animate-slide-up" style={{ padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} color="var(--primary)" /> Install App
          </h3>
          <button onClick={() => setShow(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Install Global Chatter for a better experience and to receive native push notifications!
        </p>

        {isIOS ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}>
            To install on iOS: tap the <strong>Share</strong> button <Share size={14} style={{ verticalAlign: 'middle', margin: '0 2px' }} /> below, then select <strong>"Add to Home Screen"</strong>.
          </div>
        ) : (
          <button className="btn-primary" onClick={promptInstall} style={{ width: '100%', padding: '0.6rem', marginTop: '0.5rem' }}>
            Install Now
          </button>
        )}

      </div>
    </div>
  );
}
