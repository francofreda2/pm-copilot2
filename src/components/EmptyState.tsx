import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      background: 'var(--neutral-50)',
      borderRadius: 'var(--radius-md)',
      border: '1px dashed var(--border-light)',
    }}>
      {/* SVG illustration */}
      <svg width="80" height="60" viewBox="0 0 80 60" fill="none" style={{ marginBottom: 16, opacity: 0.35 }}>
        <rect x="8" y="12" width="64" height="40" rx="6" fill="var(--neutral-300)" />
        <rect x="16" y="20" width="48" height="6" rx="3" fill="var(--neutral-400)" />
        <rect x="16" y="30" width="32" height="4" rx="2" fill="var(--neutral-400)" />
        <rect x="16" y="38" width="20" height="4" rx="2" fill="var(--neutral-400)" />
        <circle cx="60" cy="12" r="12" fill="var(--neutral-200)" />
        <circle cx="60" cy="12" r="6" fill="var(--neutral-300)" />
      </svg>

      {/* Icon */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'var(--neutral-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--neutral-400)',
        marginBottom: 14,
      }}>
        {icon}
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-800)', marginBottom: 6 }}>
        {title}
      </h4>
      <p style={{ fontSize: 13, color: 'var(--neutral-500)', lineHeight: 1.6, maxWidth: 300, marginBottom: action ? 20 : 0 }}>
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary btn-sm"
          style={{ marginTop: 4 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
