import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface Props {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ commands, isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim() === ''
    ? commands
    : commands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description.toLowerCase().includes(q) ||
          (cmd.keywords || []).some(k => k.toLowerCase().includes(q))
        );
      });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  // Scroll selected into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in-scale"
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <Search size={18} style={{ color: 'var(--neutral-400)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar comandos..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--neutral-900)',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <button
            onClick={onClose}
            style={{ background: 'var(--neutral-100)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer', color: 'var(--neutral-500)', fontSize: 11, fontWeight: 600 }}
          >
            ESC
          </button>
        </div>

        {/* Commands list */}
        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13 }}>
              No se encontraron comandos para "{query}"
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: i === selectedIndex ? 'var(--primary-50)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: i === selectedIndex ? 'var(--primary-100)' : 'var(--neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === selectedIndex ? 'var(--primary-700)' : 'var(--neutral-500)',
                  flexShrink: 0, transition: 'all 0.1s',
                }}>
                  {cmd.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: i === selectedIndex ? 'var(--primary-700)' : 'var(--neutral-800)' }}>
                    {cmd.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 1 }}>
                    {cmd.description}
                  </div>
                </div>
                {i === selectedIndex && (
                  <div style={{ fontSize: 10, color: 'var(--primary-600)', fontWeight: 600, background: 'var(--primary-100)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                    Enter
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 16, fontSize: 10, color: 'var(--neutral-400)' }}>
          <span>↑↓ navegar</span>
          <span>Enter ejecutar</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
