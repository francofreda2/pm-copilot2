import React, { useState } from 'react';
import { ProjectData, CommunicationItem } from '../types';
import { MessageSquare, Plus, Edit2, X } from 'lucide-react';
import AIGenerateButton from './AIGenerateButton';

interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

export default function CommunicationPlan({ data, onUpdate }: Props) {
  const items = data.communicationPlan || [];
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ what: '', audience: '', frequency: '', channel: '', responsible: '' });

  const resetForm = () => { setForm({ what: '', audience: '', frequency: '', channel: '', responsible: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.what.trim()) return;
    let newItems = [...items];
    const entry: CommunicationItem = {
      id: editIdx !== null ? items[editIdx].id : `COM${(items.length + 1).toString().padStart(2, '0')}`,
      ...form,
    };
    if (editIdx !== null) newItems[editIdx] = entry;
    else newItems.push(entry);
    onUpdate({ ...data, communicationPlan: newItems });
    resetForm();
  };

  const startEdit = (idx: number) => {
    const c = items[idx];
    setForm({ what: c.what, audience: c.audience, frequency: c.frequency, channel: c.channel, responsible: c.responsible });
    setEditIdx(idx); setShowForm(true);
  };

  const FREQ_COLORS: Record<string, string> = { Diaria: '#ef4444', Semanal: '#f59e0b', Quincenal: '#3b82f6', Mensual: '#10b981' };

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageSquare size={18} style={{ color: 'var(--primary-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Plan de Comunicaciones</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AIGenerateButton data={data} artifactType="communications" onUpdate={onUpdate} mergeKey="communicationPlan" />
          <button onClick={() => { resetForm(); setShowForm(v => !v); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Manual'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: '16px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Qué se comunica</div><input className="form-input form-input-sm" value={form.what} onChange={e => setForm({ ...form, what: e.target.value })} placeholder="Ej: Reporte de avance" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Audiencia</div><input className="form-input form-input-sm" value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} placeholder="Ej: Sponsor, Equipo" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Frecuencia</div>
              <select className="form-input form-input-sm form-select" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                <option value="">Seleccionar</option><option value="Diaria">Diaria</option><option value="Semanal">Semanal</option><option value="Quincenal">Quincenal</option><option value="Mensual">Mensual</option><option value="Ad-hoc">Ad-hoc</option>
              </select>
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Canal</div><input className="form-input form-input-sm" value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} placeholder="Ej: Email, Teams, Jira" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Responsable</div><input className="form-input form-input-sm" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} placeholder="PM" /></div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>{editIdx !== null ? 'Actualizar' : 'Agregar'}</button>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <MessageSquare size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>No hay plan de comunicaciones definido.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm" style={{ marginRight: 8 }}><Plus size={14} /> Manual</button>
          <AIGenerateButton data={data} artifactType="communications" onUpdate={onUpdate} mergeKey="communicationPlan" label="🤖 Generar Plan con IA" />
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['', 'Comunicación', 'Audiencia', 'Frecuencia', 'Canal', 'Responsable', ''].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', textAlign: 'left', borderBottom: '2px solid var(--border-light)', background: 'var(--neutral-50)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map((c, i) => {
                const freqColor = FREQ_COLORS[c.frequency] || 'var(--neutral-500)';
                return (
                  <tr key={c.id} className="group">
                    <td style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{c.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>{c.what}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{c.audience}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: freqColor, background: `${freqColor}15` }}>{c.frequency}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{c.channel}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{c.responsible}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                        <button onClick={() => startEdit(i)} style={{ background: 'var(--neutral-100)', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)', padding: '4px 6px', borderRadius: 4 }}><Edit2 size={12} /></button>
                        <button onClick={() => onUpdate({ ...data, communicationPlan: items.filter((_, idx) => idx !== i) })} style={{ background: 'var(--danger-light)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 4 }}>🗑</button>
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
