import React, { useState } from 'react';
import { LayoutDashboard } from 'lucide-react';

interface Props {
  onLogin: (token: string, user: any) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de autenticación');

      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <LayoutDashboard size={28} color="#fff" />
        </div>
        <h1 className="login-title">PM Copilot</h1>
        <p className="login-subtitle">
          {isRegister ? 'Crea tu cuenta para empezar' : 'Gestión de proyectos con IA'}
        </p>

        {/* Toggle tabs */}
        <div style={{ display: 'flex', background: 'var(--neutral-100)', borderRadius: 'var(--radius-md)', padding: 3, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              background: !isRegister ? 'var(--bg-card)' : 'transparent',
              color: !isRegister ? 'var(--primary-600)' : 'var(--neutral-500)',
              boxShadow: !isRegister ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              background: isRegister ? 'var(--bg-card)' : 'transparent',
              color: isRegister ? 'var(--primary-600)' : 'var(--neutral-500)',
              boxShadow: isRegister ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-box" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-input"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Cargando...
              </>
            ) : (
              isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--neutral-400)', lineHeight: 1.6 }}>
          Powered by Google Gemini AI
        </p>
      </div>
    </div>
  );
}
