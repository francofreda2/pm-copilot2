import React, { useState, useEffect } from 'react';
import { Task, SubTask, Label, TeamMember } from '../types';
import { X, Check, Plus } from 'lucide-react';

interface Props {
  task: Task;
  taskIndex: number;
  team: TeamMember[];
  labels: Label[];
  allTasks: Task[];
  onUpdate: (task: Task, idx: number) => void;
  onDelete: (idx: number) => void;
  onClose: () => void;
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '13px', background: '#f8fafc',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  color: '#0f172a',
};

const label: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px',
  display: 'block',
};

export default function TaskDetail({ task, taskIndex, team, labels, allTasks, onUpdate, onDelete, onClose }: Props) {
  const [form, setForm] = useState<Task>({ ...task });
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    setForm({ ...task });
  }, [task.id]);

  const save = (updated: Task) => {
    setForm(updated);
    onUpdate(updated, taskIndex);
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const sub: SubTask = { id: crypto.randomUUID(), name: newSubtask.trim(), done: false };
    save({ ...form, subtasks: [...(form.subtasks || []), sub] });
    setNewSubtask('');
  };

  const toggleSubtask = (subId: string) => {
    save({ ...form, subtasks: (form.subtasks || []).map(s => s.id === subId ? { ...s, done: !s.done } : s) });
  };

  const deleteSubtask = (subId: string) => {
    save({ ...form, subtasks: (form.subtasks || []).filter(s => s.id !== subId) });
  };

  const toggleLabel = (labelId: string) => {
    const current = form.labels || [];
    const updated = current.includes(labelId) ? current.filter(l => l !== labelId) : [...current, labelId];
    save({ ...form, labels: updated });
  };

  const subtasks = form.subtasks || [];
  const doneCount = subtasks.filter(s => s.done).length;
  const progress = form.progress || 0;

  const PRIORITY_OPTS = [
    { value: 'urgent', label: '🔴 Urgente' },
    { value: 'high',   label: '🟠 Alta' },
    { value: 'medium', label: '🟡 Media' },
    { value: 'low',    label: '🟢 Baja' },
  ];

  const STATUS_OPTS = [
    { value: 'pending',     label: '⚪ Pendiente' },
    { value: 'in_progress', label: '🔵 En Progreso' },
    { value: 'completed',   label: '🟢 Completado' },
    { value: 'blocked',     label: '🔴 Bloqueado' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '520px', maxWidth: '100vw', height: '100vh',
          background: '#fff', display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.18)', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, border: '1px solid #bfdbfe' }}>{form.id}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Detalle de Tarea</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { if (confirm('¿Eliminar esta tarea?')) { onDelete(taskIndex); onClose(); } }}
              style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', color: '#dc2626', fontSize: '12px', fontWeight: 700 }}
            >
              Eliminar
            </button>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', color: '#64748b', padding: '5px 8px', display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Task Name */}
          <div>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onBlur={() => onUpdate(form, taskIndex)}
              style={{ width: '100%', fontSize: '20px', fontWeight: 700, border: 'none', outline: 'none', color: '#0f172a', background: 'transparent', boxSizing: 'border-box', padding: '4px 0', borderBottom: '2px solid #e2e8f0' }}
              placeholder="Nombre de la tarea"
            />
          </div>

          {/* Description */}
          <div>
            <span style={label}>Descripción</span>
            <textarea
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              onBlur={() => onUpdate(form, taskIndex)}
              rows={3}
              style={{ ...inp, resize: 'vertical' }}
              placeholder="Describe la tarea, contexto, requisitos..."
            />
          </div>

          {/* Status + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={label}>Estado</span>
              <select value={form.status || 'pending'} onChange={e => save({ ...form, status: e.target.value as any })} style={inp}>
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <span style={label}>Prioridad</span>
              <select value={form.priority || 'medium'} onChange={e => save({ ...form, priority: e.target.value as any })} style={inp}>
                {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <span style={label}>Asignado a</span>
            <select value={form.assigneeId || ''} onChange={e => save({ ...form, assigneeId: e.target.value || undefined })} style={inp}>
              <option value="">Sin asignar</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={label}>Fecha Inicio</span>
              <input type="date" value={form.startDate || ''} onChange={e => save({ ...form, startDate: e.target.value || undefined })} style={inp} />
            </div>
            <div>
              <span style={label}>Fecha Límite</span>
              <input type="date" value={form.dueDate || ''} onChange={e => save({ ...form, dueDate: e.target.value || undefined })} style={inp} />
            </div>
          </div>

          {/* Progress */}
          <div>
            <span style={label}>Progreso: <span style={{ color: '#1d4ed8', fontFamily: 'monospace' }}>{progress}%</span></span>
            <input
              type="range" min={0} max={100} step={5}
              value={progress}
              onChange={e => save({ ...form, progress: parseInt(e.target.value) })}
              style={{ width: '100%', marginBottom: '6px', cursor: 'pointer' }}
            />
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: progress === 100 ? '#059669' : '#3b82f6', width: `${progress}%`, transition: 'width 0.3s', borderRadius: '3px' }} />
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div>
              <span style={label}>Etiquetas</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {labels.map(lbl => {
                  const isSelected = (form.labels || []).includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      onClick={() => toggleLabel(lbl.id)}
                      style={{
                        padding: '4px 12px', borderRadius: '20px',
                        border: `2px solid ${lbl.color}`,
                        background: isSelected ? lbl.color : 'transparent',
                        color: isSelected ? '#fff' : lbl.color,
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {lbl.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div>
            <span style={label}>
              Subtareas
              {subtasks.length > 0 && <span style={{ color: '#1d4ed8', marginLeft: '8px', fontFamily: 'monospace' }}>{doneCount}/{subtasks.length}</span>}
            </span>
            {subtasks.length > 0 && (
              <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ height: '100%', background: '#059669', width: `${subtasks.length ? (doneCount / subtasks.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
              </div>
            )}
            {subtasks.map(sub => (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => toggleSubtask(sub.id)}
                  style={{
                    width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                    border: `2px solid ${sub.done ? '#059669' : '#cbd5e1'}`,
                    background: sub.done ? '#059669' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  {sub.done && <Check size={12} color="#fff" />}
                </button>
                <span style={{ flex: 1, fontSize: '13px', color: sub.done ? '#94a3b8' : '#0f172a', textDecoration: sub.done ? 'line-through' : 'none' }}>{sub.name}</span>
                <button onClick={() => deleteSubtask(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '2px', fontSize: '16px', lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#cbd5e1')}
                >×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="Agregar subtarea... (Enter)"
                style={{ ...inp, flex: 1 }}
              />
              <button
                onClick={addSubtask}
                style={{ padding: '8px 14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <span style={label}>Predecesoras</span>
            <input
              value={form.pred || ''}
              onChange={e => setForm({ ...form, pred: e.target.value })}
              onBlur={() => onUpdate(form, taskIndex)}
              placeholder="T1, T2FS+2 — ID[Tipo][±lag]"
              style={{ ...inp, fontFamily: 'monospace' }}
            />
            {allTasks.length > 1 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {allTasks.filter(t => t.id !== task.id).map(t => {
                  const isPred = (form.pred || '').includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        const current = (form.pred || '').split(',').map(s => s.trim()).filter(Boolean);
                        const updated = isPred ? current.filter(s => !s.startsWith(t.id)) : [...current, t.id];
                        save({ ...form, pred: updated.join(', ') || '-' });
                      }}
                      style={{
                        padding: '3px 8px', borderRadius: '5px', fontSize: '10px', fontFamily: 'monospace',
                        cursor: 'pointer', border: `1.5px solid ${isPred ? '#1d4ed8' : '#e2e8f0'}`,
                        background: isPred ? '#eff6ff' : '#f8fafc', color: isPred ? '#1d4ed8' : '#64748b',
                        fontWeight: isPred ? 700 : 400
                      }}
                    >
                      {t.id}
                    </button>
                  );
                })}
              </div>
            )}
            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Tipos: FS (Fin→Inicio), SS, FF, SF · Ej: T1, T2FS+2</p>
          </div>

          {/* PERT */}
          <div>
            <span style={label}>PERT / Estimación</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { key: 'om', label: 'OM (optim.)', type: 'number' },
                { key: 'p',  label: 'P (pesim.)',  type: 'number' },
                { key: 'te', label: 'TE (expect.)', type: 'text' },
                { key: 'dur', label: 'Dur. (h)',   type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <p style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '4px', marginTop: 0 }}>{f.label}</p>
                  <input
                    type={f.type}
                    value={(form as any)[f.key] || ''}
                    onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                    onBlur={() => onUpdate(form, taskIndex)}
                    style={{ ...inp, fontFamily: 'monospace', padding: '6px 8px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Resources + RC */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
            <div>
              <span style={label}>Recursos</span>
              <input
                value={form.rec || ''}
                onChange={e => setForm({ ...form, rec: e.target.value })}
                onBlur={() => onUpdate(form, taskIndex)}
                placeholder="Dev, Data Eng, PM..."
                style={inp}
              />
            </div>
            <div>
              <span style={label}>Ruta Crítica</span>
              <select value={form.rc ? 'yes' : 'no'} onChange={e => save({ ...form, rc: e.target.value === 'yes' })} style={{ ...inp, width: 'auto' }}>
                <option value="yes">Sí ✓</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <span style={label}>Notas Adicionales</span>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              onBlur={() => onUpdate(form, taskIndex)}
              rows={3}
              style={{ ...inp, resize: 'vertical' }}
              placeholder="Notas, referencias, comentarios..."
            />
          </div>

        </div>
      </div>
    </div>
  );
}
