import React, { useState, useMemo } from 'react';
import { ProjectData, BudgetLine } from '../types';
import { DollarSign, Plus, Edit2, X, TrendingUp, TrendingDown } from 'lucide-react';
import AIGenerateButton from './AIGenerateButton';

interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

export default function BudgetTracker({ data, onUpdate }: Props) {
  const lines = data.budgetLines || [];
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ category: '', description: '', planned: '', actual: '' });

  const resetForm = () => { setForm({ category: '', description: '', planned: '', actual: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.category.trim()) return;
    let newLines = [...lines];
    const entry: BudgetLine = { id: editIdx !== null ? lines[editIdx].id : `B${(lines.length + 1).toString().padStart(3, '0')}`, category: form.category, description: form.description, planned: parseFloat(form.planned) || 0, actual: parseFloat(form.actual) || 0 };
    if (editIdx !== null) newLines[editIdx] = entry; else newLines.push(entry);
    onUpdate({ ...data, budgetLines: newLines });
    resetForm();
  };

  const startEdit = (idx: number) => {
    const l = lines[idx];
    setForm({ category: l.category, description: l.description, planned: String(l.planned), actual: String(l.actual) });
    setEditIdx(idx); setShowForm(true);
  };

  const summary = useMemo(() => {
    const totalPlanned = lines.reduce((s, l) => s + l.planned, 0);
    const totalActual = lines.reduce((s, l) => s + l.actual, 0);
    const variance = totalPlanned - totalActual;
    const cpi = totalActual > 0 ? totalPlanned * ((data.tasks || []).filter(t => t.status === 'completed').length / Math.max((data.tasks || []).length, 1)) / totalActual : 1;
    const eac = cpi > 0 ? totalPlanned / cpi : totalPlanned;
    const etc = Math.max(0, eac - totalActual);
    const byCategory = new Map<string, { planned: number; actual: number }>();
    lines.forEach(l => {
      const e = byCategory.get(l.category) || { planned: 0, actual: 0 };
      byCategory.set(l.category, { planned: e.planned + l.planned, actual: e.actual + l.actual });
    });
    return { totalPlanned, totalActual, variance, cpi, eac, etc, byCategory };
  }, [lines, data.tasks]);

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DollarSign size={18} style={{ color: 'var(--success)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Presupuesto</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AIGenerateButton data={data} artifactType="budget" onUpdate={onUpdate} mergeKey="budgetLines" />
          <button onClick={() => { resetForm(); setShowForm(v => !v); }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Manual'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Planificado (BAC)', value: fmt(summary.totalPlanned), color: 'var(--primary-600)' },
          { label: 'Gastado (AC)', value: fmt(summary.totalActual), color: 'var(--neutral-700)' },
          { label: 'Variación', value: fmt(summary.variance), color: summary.variance >= 0 ? 'var(--success)' : 'var(--error)' },
          { label: 'CPI', value: summary.cpi.toFixed(2), color: summary.cpi >= 1 ? 'var(--success)' : summary.cpi >= 0.8 ? 'var(--warning)' : 'var(--error)' },
          { label: 'EAC', value: fmt(summary.eac), color: 'var(--neutral-700)' },
          { label: 'ETC', value: fmt(summary.etc), color: 'var(--primary-600)' },
        ].map((c, i) => (
          <div key={i} style={{ padding: '12px 14px', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Category bar */}
      {summary.byCategory.size > 0 && summary.totalPlanned > 0 && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: 'var(--neutral-100)' }}>
            {Array.from(summary.byCategory.entries()).map(([cat, vals], i) => {
              const pct = (vals.planned / summary.totalPlanned) * 100;
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#14b8a6'];
              return <div key={cat} title={`${cat}: ${fmt(vals.planned)}`} style={{ width: `${pct}%`, background: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>{pct > 10 ? cat : ''}</div>;
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ padding: '16px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Categoría</div><input className="form-input form-input-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ej: RRHH" /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Descripción</div><input className="form-input form-input-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Planificado ($)</div><input className="form-input form-input-sm" type="number" value={form.planned} onChange={e => setForm({ ...form, planned: e.target.value })} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Real ($)</div><input className="form-input form-input-sm" type="number" value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} /></div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>{editIdx !== null ? 'Actualizar' : 'Agregar'}</button>
        </div>
      )}

      {lines.length === 0 && !showForm ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <DollarSign size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>No hay presupuesto definido.</p>
          <AIGenerateButton data={data} artifactType="budget" onUpdate={onUpdate} mergeKey="budgetLines" label="🤖 Generar Presupuesto con IA" />
        </div>
      ) : lines.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['ID', 'Categoría', 'Descripción', 'Planificado', 'Real', 'Variación', ''].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', textAlign: 'left', borderBottom: '2px solid var(--border-light)', background: 'var(--neutral-50)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const v = l.planned - l.actual;
                return (
                  <tr key={l.id} className="group">
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{l.id}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>{l.category}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid var(--border-subtle)' }}>{l.description}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{fmt(l.planned)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid var(--border-subtle)' }}>{fmt(l.actual)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: v >= 0 ? 'var(--success)' : 'var(--error)', borderBottom: '1px solid var(--border-subtle)' }}>{v >= 0 ? '+' : ''}{fmt(v)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                        <button onClick={() => startEdit(i)} style={{ background: 'var(--neutral-100)', border: 'none', cursor: 'pointer', color: 'var(--neutral-600)', padding: '4px 6px', borderRadius: 4 }}><Edit2 size={12} /></button>
                        <button onClick={() => onUpdate({ ...data, budgetLines: lines.filter((_, idx) => idx !== i) })} style={{ background: 'var(--danger-light)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '4px 6px', borderRadius: 4 }}>🗑</button>
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
