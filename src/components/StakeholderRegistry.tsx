import React, { useState } from 'react';
import { ProjectData, Stakeholder } from '../types';
import { Users, Plus, Edit2, X } from 'lucide-react';
import AIGenerateButton from './AIGenerateButton';

interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

const LEVEL_COLORS: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };

export default function StakeholderRegistry({ data, onUpdate }: Props) {
  const stks = data.stakeholders || [];
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', role: '', organization: '', influence: 'medium' as Stakeholder['influence'], interest: 'medium' as Stakeholder['interest'], strategy: '' });

  const resetForm = () => { setForm({ name: '', role: '', organization: '', influence: 'medium', interest: 'medium', strategy: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    let newStks = [...stks];
    const entry: Stakeholder = { id: editIdx !== null ? stks[editIdx].id : `STK${(stks.length + 1).toString().padStart(2, '0')}`, ...form };
    if (editIdx !== null) newStks[editIdx] = entry; else newStks.push(entry);
    onUpdate({ ...data, stakeholders: newStks });
    resetForm();
  };

  const startEdit = (idx: number) => {
    const s = stks[idx];
    setForm({ name: s.name, role: s.role, organization: s.organization, influence: s.influence, interest: s.interest, strategy: s.strategy });
    setEditIdx(idx); setShowForm(true);
  };

  const getQuadrant = (s: Stakeholder) => {
    if (s.influence === 'high' && s.interest === 'high') return 'Gestionar de cerca';
    if (s.influence === 'high') return 'Mantener satisfecho';
    if (s.interest === 'high') return 'Mantener informado';
    return 'Monitorear';
  };

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} style={{ color: 'var(--primary-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Registro de Stakeholders</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AIGenerateButton data={data} artifactType="stakeholders" onUpdate={onUpdate} mergeKey="stakeholders" />
          <button onClick={() => { resetForm(); setShowForm(v => !v); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Manual'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: '16px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Nombre</div><input className="form-input form-input-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Rol</div><input className="form-input form-input-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Sponsor, PM, etc." /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Organización</div><input className="form-input form-input-sm" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Influencia</div>
              <select className="form-input form-input-sm form-select" value={form.influence} onChange={e => setForm({ ...form, influence: e.target.value as any })}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select>
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Interés</div>
              <select className="form-input form-input-sm form-select" value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value as any })}><option value="low">Bajo</option><option value="medium">Medio</option><option value="high">Alto</option></select>
            </div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Estrategia</div><input className="form-input form-input-sm" value={form.strategy} onChange={e => setForm({ ...form, strategy: e.target.value })} placeholder="Gestionar de cerca" /></div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>{editIdx !== null ? 'Actualizar' : 'Agregar'}</button>
        </div>
      )}

      {stks.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Users size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>No hay stakeholders registrados.</p>
          <AIGenerateButton data={data} artifactType="stakeholders" onUpdate={onUpdate} mergeKey="stakeholders" label="🤖 Generar Stakeholders con IA" />
        </div>
      ) : (
        <>
          {/* Power/Interest Grid */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 12 }}>Matriz Poder/Interés</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, height: 180, border: '1px solid var(--border-light)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Mantener satisfecho', bg: '#fef3c7', filter: (s: Stakeholder) => s.influence === 'high' && s.interest !== 'high' },
                { label: 'Gestionar de cerca', bg: '#fef2f2', filter: (s: Stakeholder) => s.influence === 'high' && s.interest === 'high' },
                { label: 'Monitorear', bg: '#f0fdf4', filter: (s: Stakeholder) => s.influence !== 'high' && s.interest !== 'high' },
                { label: 'Mantener informado', bg: '#dbeafe', filter: (s: Stakeholder) => s.influence !== 'high' && s.interest === 'high' },
              ].map((q, i) => (
                <div key={i} style={{ background: q.bg, padding: 10 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{q.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {stks.filter(q.filter).map(s => (
                      <span key={s.id} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.8)', fontWeight: 600, color: 'var(--neutral-700)' }}>{s.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['ID', 'Nombre', 'Rol', 'Org.', 'Influencia', 'Interés', 'Estrategia', ''].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', textAlign: 'left', borderBottom: '2px solid var(--border-light)', background: 'var(--neutral-50)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {stks.map((s, i) => (
                  <tr key={s.id} className="group">
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{s.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>{s.name}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{s.role}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{s.organization}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[s.influence], display: 'inline-block', marginRight: 6 }} />{s.influence}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[s.interest], display: 'inline-block', marginRight: 6 }} />{s.interest}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{s.strategy || getQuadrant(s)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                        <button onClick={() => startEdit(i)} style={{ background: 'var(--neutral-100)', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)', padding: '4px 6px', borderRadius: 4 }}><Edit2 size={12} /></button>
                        <button onClick={() => onUpdate({ ...data, stakeholders: stks.filter((_, idx) => idx !== i) })} style={{ background: 'var(--danger-light)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 4 }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
