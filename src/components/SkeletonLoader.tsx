import React from 'react';

export function ChatSkeleton() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 12 }}>
      <div className="chat-avatar chat-avatar-bot" style={{ background: 'var(--neutral-200)', border: 'none' }} />
      <div className="chat-bubble-model" style={{ minWidth: 200, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ height: 12, width: '100%', background: 'linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-200) 50%, var(--neutral-100) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', borderRadius: 4 }} />
          <div style={{ height: 12, width: '85%', background: 'linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-200) 50%, var(--neutral-100) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', borderRadius: 4 }} />
          <div style={{ height: 12, width: '40%', background: 'linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-200) 50%, var(--neutral-100) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: 20, minHeight: 120 }}>
      <div style={{ height: 16, width: '40%', marginBottom: 16, background: 'linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-200) 50%, var(--neutral-100) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', borderRadius: 4 }} />
      <div style={{ height: 32, width: '60%', background: 'linear-gradient(90deg, var(--neutral-100) 25%, var(--neutral-200) 50%, var(--neutral-100) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear', borderRadius: 4 }} />
    </div>
  );
}
