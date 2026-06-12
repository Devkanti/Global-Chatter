import { useState, useEffect } from 'react';
import { X, ShieldAlert, Shield, ShieldOff, Activity } from 'lucide-react';
import { BACKEND_URL } from '../socket';

export default function AdminPanel({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, globalMessages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('chat_token');
      const statsRes = await fetch(`${BACKEND_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      const usersRes = await fetch(`${BACKEND_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (err) {
      console.error("Admin fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAdminData();
    }
  }, [isOpen]);

  const handleModerate = async (userId, action, value) => {
    try {
      const token = localStorage.getItem('chat_token');
      const res = await fetch(`${BACKEND_URL}/admin/users/${userId}/moderate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ action, value })
      });
      if (res.ok) {
        fetchAdminData(); // Refresh UI
      }
    } catch (err) {
      console.error("Moderate error", err);
    }
  };

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
        borderRadius: '24px', width: '90%', maxWidth: '800px', maxHeight: '90vh',
        overflowY: 'auto', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={28} color="#ef4444" />
            Admin Dashboard
          </h2>
          <button onClick={onClose} style={{
            background: 'var(--hover-bg)', border: 'none', color: 'var(--text-main)',
            width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.totalUsers}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Users</div>
              </div>
              <div style={{ flex: 1, padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.globalMessages}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Global Messages</div>
              </div>
            </div>

            <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>User Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {users.map(u => (
                <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.username} {u.isAdmin && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>Admin</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reputation: {u.reputationScore}</div>
                    {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && (
                      <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Suspended until: {new Date(u.suspendedUntil).toLocaleString()}</div>
                    )}
                  </div>
                  
                  {!u.isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleModerate(u._id, 'reputation', 100)}
                        style={{ padding: '0.5rem', background: 'var(--hover-bg)', border: 'none', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        title="Reset Reputation to 100"
                      >
                        <Activity size={16} /> Restore Rep
                      </button>
                      <button 
                        onClick={() => handleModerate(u._id, 'suspend', u.suspendedUntil ? 0 : 24)}
                        style={{ padding: '0.5rem', background: u.suspendedUntil ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: u.suspendedUntil ? '#22c55e' : '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {u.suspendedUntil ? <><Shield size={16} /> Unban</> : <><ShieldOff size={16} /> Suspend 24h</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
