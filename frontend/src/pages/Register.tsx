import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    
    try {
      const data = await api.post('/auth/register', { name, email, password });
      login(data.token, data.user);
      navigate('/projects');
    } catch (err: any) {
      if (err.fields) {
        setFieldErrors(err.fields);
      } else {
        setError(err.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div className="flex-center" style={{ marginBottom: '2rem' }}>
          <div className="flex-center" style={{ 
            width: '48px', height: '48px', 
            background: 'var(--brand-primary)', 
            borderRadius: '12px', color: 'white' 
          }}>
            <UserPlus size={24} />
          </div>
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Create Account</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>Join TaskFlow today</p>

        {error && (
          <div style={{ 
            padding: '0.75rem', 
            background: 'var(--danger)', 
            opacity: 0.1,
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  background: 'var(--bg-primary)',
                  border: `1px solid ${fieldErrors.name ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
            {fieldErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{fieldErrors.name}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  background: 'var(--bg-primary)',
                  border: `1px solid ${fieldErrors.email ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
            {fieldErrors.email && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{fieldErrors.email}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  background: 'var(--bg-primary)',
                  border: `1px solid ${fieldErrors.password ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
            {fieldErrors.password && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{fieldErrors.password}</span>}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? <div className="loader" style={{ width: '18px', height: '18px' }} /> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: '600' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
