import React, { useState } from 'react';
import { ProjectData, ChangeRequest } from '../types';
import { FileText, Plus, Edit2, Check, X, Clock } from 'lucide-react';
interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

const STATUS_COLORS: Record<string, { bg: string; c: string; label: string }> = {
  pending: { bg: '#fffbeb', c: '#d97706', label: 'Pendiente' },
  approved: { bg: '#f0fdf4', c: '#16a34a', label: 'Aprobado' },
  rejected: { bg: '#fef2f2', c: '#dc2626', label: 'Rechazado' },
  implemented: { bg: '#dbeafe', c: '#1d4ed8', label: 'Implementado' },
};

export default function ChangeRequests({ data, onUpdate }: Props) {
  const crs = data.changeRequests || [];
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', description: '', requestedBy: '', status: 'pending' as ChangeRequest['status'], impactScope: '', impactSchedule: '', impactCost: '', approvedBy: '' });

  const resetForm = () => { setForm({ title: '', description: '', requestedBy: '', status: 'pending', impactScope: '', impactSchedule: '', impactCost: '', approvedBy: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.title.trim()) return;
    let newCrs = [...crs];
    const entry: ChangeRequest = {
      id: editIdx !== null ? crs[editIdx].id : `CR${(crs.length + 1).toString().padStart(3, '0')}`,
      title: form.title, description: form.description, requestedBy: form.requestedBy,
      requestedAt: editIdx !== null ? crs[editIdx].requestedAt : new Date().toISOString(),
      status: form.status, impactScope: form.impactScope, impactSchedule: form.impactSchedule, impactCost: form.impactCost,
      approvedBy: form.approvedBy || undefined,
      approvedAt: form.status === 'approved' ? new Date().toISOString() : undefined,
    };
    if (editIdx !== null) newCrs[editIdx] = entry;
    else newCrs.push(entry);
    onUpdate({ ...data, changeRequests: newCrs });
    resetForm();
  };

  const startEdit = (idx: number) => {
    const cr = crs[idx];
    setForm({ title: cr.title, description: cr.description, requestedBy: cr.requestedBy, status: cr.status, impactScope: cr.impactScope, impactSchedule: cr.impactSchedule, impactCost: cr.impactCost, approvedBy: cr.approvedBy || '' });
    setEditIdx(idx); setShowForm(true);
  };

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={18} style={{ color: 'var(--primary-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Solicitudes de Cambio</h2>
          <span style={{ fontSize: 11, background: 'var(--warning-light)', padding: '2px 8px', borderRadius: 12, fontWeight: 600, color: 'var(--warning)' }}>
            {crs.filter(c => c.status === 'pending').length} pendientes
          </span>
        </div>
        <button onClick={() => { resetForm(); setShowForm(v => !v); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Nueva Solicitud'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '16px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Título</div><input className="form-input form-input-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Solicitado por</div><input className="form-input form-input-sm" value={form.requestedBy} onChange={e => setForm({ ...form, requestedBy: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Estado</div>
              <select className="form-input form-input-sm form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                <option value="pending">Pendiente</option><option value="approved">Aprobado</option><option value="rejected">Rechazado</option><option value="implemented">Implementado</option>
              </select>
            </div>
            {form.status === 'approved' && <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Aprobado por</div><input className="form-input form-input-sm" value={form.approvedBy} onChange={e => setForm({ ...form, approvedBy: e.target.value })} /></div>}
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Descripción</div><input className="form-input form-input-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Impacto en Alcance</div><input className="form-input form-input-sm" value={form.impactScope} onChange={e => setForm({ ...form, impactScope: e.target.value })} placeholder="Ej: +2 entregables" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Impacto en Cronograma</div><input className="form-input form-input-sm" value={form.impactSchedule} onChange={e => setForm({ ...form, impactSchedule: e.target.value })} placeholder="Ej: +5 días" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Impacto en Costo</div><input className="form-input form-input-sm" value={form.impactCost} onChange={e => setForm({ ...form, impactCost: e.target.value })} placeholder="Ej: +$5000" /></div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>{editIdx !== null ? 'Actualizar' : 'Crear Solicitud'}</button>
        </div>
      )}

      {crs.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <FileText size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>No hay solicitudes de cambio.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Nueva Solicitud</button>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {crs.map((cr, i) => {
            const sc = STATUS_COLORS[cr.status];
            return (
              <div key={cr.id} className="group" style={{ padding: 16, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--primary-600)' }}>{cr.id}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-900)' }}>{cr.title}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.c }}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--neutral-600)' }}>{cr.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                    <button onClick={() => startEdit(i)} style={{ background: 'var(--neutral-100)', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)', padding: '4px 6px', borderRadius: 4 }}><Edit2 size={12} /></button>
                    <button onClick={() => onUpdate({ ...data, changeRequests: crs.filter((_, idx) => idx !== i) })} style={{ background: 'var(--danger-light)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 4 }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                  <div><span style={{ color: 'var(--neutral-500)' }}>Alcance:</span> <span style={{ fontWeight: 600 }}>{cr.impactScope || 'N/A'}</span></div>
                  <div><span style={{ color: 'var(--neutral-500)' }}>Cronograma:</span> <span style={{ fontWeight: 600 }}>{cr.impactSchedule || 'N/A'}</span></div>
                  <div><span style={{ color: 'var(--neutral-500)' }}>Costo:</span> <span style={{ fontWeight: 600 }}>{cr.impactCost || 'N/A'}</span></div>
                  <div style={{ marginLeft: 'auto', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {cr.requestedBy} · {new Date(cr.requestedAt).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
