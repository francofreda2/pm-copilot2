import React, { useState } from 'react';
import { ProjectData, LessonLearned } from '../types';
import { BookOpen, Plus, Edit2, X } from 'lucide-react';
import AIGenerateButton from './AIGenerateButton';

interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

const CAT_COLORS: Record<string, { bg: string; c: string; label: string }> = {
  process: { bg: '#dbeafe', c: '#1d4ed8', label: 'Proceso' },
  technical: { bg: '#f0fdf4', c: '#16a34a', label: 'Técnico' },
  management: { bg: '#fef3c7', c: '#92400e', label: 'Gestión' },
  communication: { bg: '#f3e8ff', c: '#6b21a8', label: 'Comunicación' },
};

export default function LessonsLearned({ data, onUpdate }: Props) {
  const lessons = data.lessonsLearned || [];
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ phase: '', category: 'process' as LessonLearned['category'], description: '', recommendation: '' });

  const resetForm = () => { setForm({ phase: '', category: 'process', description: '', recommendation: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.description.trim()) return;
    let newLessons = [...lessons];
    const entry: LessonLearned = {
      id: editIdx !== null ? lessons[editIdx].id : `LL${(lessons.length + 1).toString().padStart(3, '0')}`,
      phase: form.phase, category: form.category, description: form.description, recommendation: form.recommendation,
      createdAt: editIdx !== null ? lessons[editIdx].createdAt : new Date().toISOString(),
    };
    if (editIdx !== null) newLessons[editIdx] = entry;
    else newLessons.push(entry);
    onUpdate({ ...data, lessonsLearned: newLessons });
    resetForm();
  };

  const startEdit = (idx: number) => {
    const l = lessons[idx];
    setForm({ phase: l.phase, category: l.category, description: l.description, recommendation: l.recommendation });
    setEditIdx(idx); setShowForm(true);
  };

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={18} style={{ color: 'var(--primary-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Lecciones Aprendidas</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AIGenerateButton data={data} artifactType="lessons" onUpdate={onUpdate} mergeKey="lessonsLearned" />
          <button onClick={() => { resetForm(); setShowForm(v => !v); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Manual'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: '16px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Fase</div><input className="form-input form-input-sm" value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })} placeholder="Ej: Planificación" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Categoría</div>
              <select className="form-input form-input-sm form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
                <option value="process">Proceso</option><option value="technical">Técnico</option><option value="management">Gestión</option><option value="communication">Comunicación</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Descripción (qué pasó)</div><textarea className="form-input form-input-sm" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describí la situación o evento" style={{ resize: 'none' }} /></div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Recomendación (qué hacer diferente)</div><textarea className="form-input form-input-sm" rows={2} value={form.recommendation} onChange={e => setForm({ ...form, recommendation: e.target.value })} placeholder="Acción recomendada para futuros proyectos" style={{ resize: 'none' }} /></div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>{editIdx !== null ? 'Actualizar' : 'Registrar'}</button>
        </div>
      )}

      {lessons.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <BookOpen size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 4 }}>No hay lecciones aprendidas registradas.</p>
          <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 16 }}>Documentá aprendizajes durante y al cierre del proyecto.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm" style={{ marginRight: 8 }}><Plus size={14} /> Manual</button>
          <AIGenerateButton data={data} artifactType="lessons" onUpdate={onUpdate} mergeKey="lessonsLearned" label="🤖 Generar Lecciones con IA" />
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lessons.map((l, i) => {
            const cat = CAT_COLORS[l.category] || CAT_COLORS.process;
            return (
              <div key={l.id} className="group" style={{ padding: 16, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: 'var(--neutral-400)' }}>{l.id}</span>
                    {l.phase && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--neutral-100)', color: 'var(--neutral-600)', fontWeight: 600 }}>{l.phase}</span>}
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: cat.bg, color: cat.c, fontWeight: 700 }}>{cat.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                    <button onClick={() => startEdit(i)} style={{ background: 'var(--neutral-100)', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)', padding: '4px 6px', borderRadius: 4 }}><Edit2 size={12} /></button>
                    <button onClick={() => onUpdate({ ...data, lessonsLearned: lessons.filter((_, idx) => idx !== i) })} style={{ background: 'var(--danger-light)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 4 }}>🗑</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--neutral-800)', marginBottom: 8, lineHeight: 1.5 }}>{l.description}</div>
                {l.recommendation && (
                  <div style={{ fontSize: 12, color: 'var(--success)', background: 'var(--success-light)', padding: '8px 12px', borderRadius: 6, lineHeight: 1.5 }}>
                    💡 {l.recommendation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
