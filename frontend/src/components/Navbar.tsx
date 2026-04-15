import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Layout, User, Sun, Moon } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      justifyContent: 'space-between',
      marginBottom: '2rem'
    }}>
      <Link to="/projects" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '1.25rem',
        fontWeight: '700',
        color: 'var(--text-primary)'
      }}>
        <div className="flex-center" style={{
          width: '32px',
          height: '32px',
          background: 'var(--brand-primary)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <Layout size={20} />
        </div>
        TaskFlow
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          <div className="flex-center" style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--bg-tertiary)'
          }}>
            <User size={14} />
          </div>
          {user?.name}
        </div>

        <button 
          onClick={toggleTheme}
          className="btn btn-ghost"
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        <button 
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
