import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { ProjectData } from '../types';
import { generateArtifact } from '../services/geminiService';

interface Props {
  data: ProjectData;
  artifactType: string;
  onUpdate: (data: ProjectData) => void;
  label?: string;
  mergeKey?: string | string[];
}

export default function AIGenerateButton({ data, artifactType, onUpdate, label, mergeKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateArtifact(artifactType, data);
      const keys = mergeKey ? (Array.isArray(mergeKey) ? mergeKey : [mergeKey]) : [artifactType];
      const updated = { ...data };
      keys.forEach(k => {
        if (result[k] !== undefined) {
          (updated as any)[k] = result[k];
        }
      });
      updated.lastUpdated = new Date().toISOString();
      onUpdate(updated);
    } catch (e: any) {
      setError(e.message || 'Error al generar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn btn-sm"
        style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
          border: 'none', borderRadius: 6, padding: '6px 14px', cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
        }}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {loading ? 'Generando...' : (label || '🤖 Generar con IA')}
      </button>
      {error && <span style={{ fontSize: 10, color: 'var(--error, #ef4444)' }}>{error}</span>}
    </div>
  );
}
