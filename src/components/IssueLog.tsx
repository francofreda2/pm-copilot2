import React, { useState } from 'react';
import { ProjectData, Issue } from '../types';
import { AlertCircle, Plus, Edit2, Check, X } from 'lucide-react';
import AIGenerateButton from './AIGenerateButton';

interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

const PRIORITY_COLORS: Record<string, { bg: string; c: string }> = {
  critical: { bg: '#fef2f2', c: '#dc2626' },
  high: { bg: '#fff7ed', c: '#ea580c' },
  medium: { bg: '#fffbeb', c: '#d97706' },
  low: { bg: '#f0fdf4', c: '#16a34a' },
};

const STATUS_LABELS: Record<string, string> = { open: 'Abierto', in_progress: 'En curso', resolved: 'Resuelto', closed: 'Cerrado' };

export default function IssueLog({ data, onUpdate }: Props) {
  const issues = data.issues || [];
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Issue, 'id' | 'createdAt'>>({ title: '', description: '', priority: 'medium', status: 'open', assignee: '', resolution: '' });

  const resetForm = () => { setForm({ title: '', description: '', priority: 'medium', status: 'open', assignee: '', resolution: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.title.trim()) return;
    let newIssues = [...issues];
    if (editIdx !== null) {
      newIssues[editIdx] = { ...newIssues[editIdx], ...form, resolvedAt: form.status === 'resolved' || form.status === 'closed' ? new Date().toISOString() : undefined };
    } else {
      newIssues.push({ id: `ISS${(issues.length + 1).toString().padStart(3, '0')}`, createdAt: new Date().toISOString(), ...form } as Issue);
    }
    onUpdate({ ...data, issues: newIssues });
    resetForm();
  };

  const startEdit = (idx: number) => {
    const i = issues[idx];
    setForm({ title: i.title, description: i.description, priority: i.priority, status: i.status, assignee: i.assignee, resolution: i.resolution || '' });
    setEditIdx(idx);
    setShowForm(true);
  };

  const handleDelete = (idx: number) => onUpdate({ ...data, issues: issues.filter((_, i) => i !== idx) });

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} style={{ color: 'var(--warning)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Registro de Issues</h2>
          <span style={{ fontSize: 11, background: 'var(--neutral-100)', padding: '2px 8px', borderRadius: 12, fontWeight: 600, color: 'var(--neutral-600)' }}>
            {issues.filter(i => i.status === 'open' || i.status === 'in_progress').length} abiertos
          </span>
        </div>
        <button onClick={() => { resetForm(); setShowForm(v => !v); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Manual'}
        </button>
        <AIGenerateButton data={data} artifactType="issues" onUpdate={onUpdate} mergeKey="issues" />
      </div>

      {showForm && (
        <div style={{ padding: '16px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Título</div><input className="form-input form-input-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Problema detectado" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Prioridad</div>
              <select className="form-input form-input-sm form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}>
                <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option>
              </select>
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Estado</div>
              <select className="form-input form-input-sm form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                <option value="open">Abierto</option><option value="in_progress">En curso</option><option value="resolved">Resuelto</option><option value="closed">Cerrado</option>
              </select>
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Responsable</div><input className="form-input form-input-sm" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="Nombre" /></div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Descripción</div><input className="form-input form-input-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detalle del problema" /></div>
          {(form.status === 'resolved' || form.status === 'closed') && (
            <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Resolución</div><input className="form-input form-input-sm" value={form.resolution || ''} onChange={e => setForm({ ...form, resolution: e.target.value })} placeholder="Cómo se resolvió" /></div>
          )}
          <button className="btn btn-primary btn-sm" onClick={handleSave}>{editIdx !== null ? 'Actualizar' : 'Crear Issue'}</button>
        </div>
      )}

      {issues.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>No hay issues registrados.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm" style={{ marginRight: 8 }}><Plus size={14} /> Registrar Issue</button>
          <AIGenerateButton data={data} artifactType="issues" onUpdate={onUpdate} mergeKey="issues" label="🤖 Identificar Issues con IA" />
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['ID', 'Título', 'Prioridad', 'Estado', 'Responsable', 'Fecha', ''].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', textAlign: 'left', borderBottom: '2px solid var(--border-light)', background: 'var(--neutral-50)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {issues.map((issue, i) => {
                const pc = PRIORITY_COLORS[issue.priority] || PRIORITY_COLORS.medium;
                return (
                  <tr key={issue.id} className="group" style={{ opacity: issue.status === 'closed' ? 0.5 : 1 }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{issue.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>{issue.title}<div style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 2 }}>{issue.description}</div></td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: pc.bg, color: pc.c, textTransform: 'uppercase' }}>{issue.priority}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{STATUS_LABELS[issue.status]}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{issue.assignee}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--neutral-500)', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                        <button onClick={() => startEdit(i)} style={{ background: 'var(--neutral-100)', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)', padding: '4px 6px', borderRadius: 4 }}><Edit2 size={12} /></button>
                        <button onClick={() => handleDelete(i)} style={{ background: 'var(--danger-light)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 4 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
