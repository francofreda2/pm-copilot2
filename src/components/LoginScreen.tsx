import React, { useState } from 'react';

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f5ff', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(30,64,175,0.1)', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#1e3a8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>📋</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#0f172a', margin: 0 }}>PM Copilot</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
            {isRegister ? 'Crea tu cuenta para empezar' : 'Inicia sesión en tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div style={{ padding: '10px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: 600 }}>Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '6px', fontWeight: 600 }}>Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Cargando...' : (isRegister ? 'Registrarse' : 'Iniciar Sesión')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#64748b' }}>
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); }} 
            style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer', marginLeft: '6px' }}
          >
            {isRegister ? 'Inicia Sesión' : 'Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
}
