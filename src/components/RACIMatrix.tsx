import React, { useState } from 'react';
import { ProjectData, RACIEntry, Resource } from '../types';
import { Users, Plus, X, ChevronDown } from 'lucide-react';
import AIGenerateButton from './AIGenerateButton';

interface Props { data: ProjectData; onUpdate: (data: ProjectData) => void; }

const RACI_ROLES = ['R', 'A', 'C', 'I'] as const;
const ROLE_COLORS: Record<string, { bg: string; c: string }> = {
  R: { bg: '#dbeafe', c: '#1d4ed8' },
  A: { bg: '#fef3c7', c: '#92400e' },
  C: { bg: '#d1fae5', c: '#065f46' },
  I: { bg: '#f3e8ff', c: '#6b21a8' },
};

const CORPORATE_ROLES = [
  'Project Manager', 'Tech Lead', 'QA Lead', 'Desarrollo', 'Arquitectura',
  'Negocio / Product Owner', 'Compliance', 'Seguridad Informática', 'Infraestructura',
  'DBA', 'Operaciones', 'Soporte', 'UX/UI', 'Data / Analytics',
];

export default function RACIMatrix({ data, onUpdate }: Props) {
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resForm, setResForm] = useState({ name: '', role: CORPORATE_ROLES[0], costPerHour: '' });
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const resources = data.resources || [];
  const matrix = data.raciMatrix || [];
  const tasks = data.tasks;

  const getRole = (taskId: string, resourceId: string): string | undefined =>
    matrix.find(e => e.taskId === taskId && e.resourceId === resourceId)?.role;

  const setRole = (taskId: string, resourceId: string, role: string | undefined) => {
    let newMatrix = matrix.filter(e => !(e.taskId === taskId && e.resourceId === resourceId));
    if (role) newMatrix.push({ taskId, resourceId, role: role as RACIEntry['role'] });
    onUpdate({ ...data, raciMatrix: newMatrix });
  };

  const cycleRole = (taskId: string, resourceId: string) => {
    const current = getRole(taskId, resourceId);
    const idx = current ? RACI_ROLES.indexOf(current as any) : -1;
    const next = idx < RACI_ROLES.length - 1 ? RACI_ROLES[idx + 1] : undefined;
    setRole(taskId, resourceId, next);
  };

  const addResource = () => {
    if (!resForm.name.trim()) return;
    const newRes: Resource = {
      id: `RES${(resources.length + 1).toString().padStart(2, '0')}`,
      name: resForm.name.trim(),
      role: resForm.role,
      availability: 100,
      costPerHour: parseFloat(resForm.costPerHour) || 0,
    };
    onUpdate({ ...data, resources: [...resources, newRes] });
    setResForm({ name: '', role: CORPORATE_ROLES[0], costPerHour: '' });
    setShowResourceForm(false);
  };

  const quickAddRole = (corpRole: string) => {
    if (resources.some(r => r.role === corpRole)) return;
    const newRes: Resource = {
      id: `RES${(resources.length + 1).toString().padStart(2, '0')}`,
      name: corpRole,
      role: corpRole,
      availability: 100,
      costPerHour: 0,
    };
    onUpdate({ ...data, resources: [...resources, newRes] });
  };

  const removeResource = (id: string) => {
    onUpdate({
      ...data,
      resources: resources.filter(r => r.id !== id),
      raciMatrix: matrix.filter(e => e.resourceId !== id),
    });
  };

  const missingRoles = CORPORATE_ROLES.filter(cr => !resources.some(r => r.role === cr));

  if (tasks.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <Users size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, color: 'var(--neutral-500)' }}>Agregá tareas primero para armar la Matriz RACI.</p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={18} style={{ color: 'var(--primary-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Matriz RACI</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
            {RACI_ROLES.map(r => (
              <span key={r} style={{ padding: '2px 8px', borderRadius: 4, background: ROLE_COLORS[r].bg, color: ROLE_COLORS[r].c, fontWeight: 700 }}>
                {r} = {r === 'R' ? 'Responsable' : r === 'A' ? 'Aprobador' : r === 'C' ? 'Consultado' : 'Informado'}
              </span>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowQuickAdd(v => !v)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={14} /> Rol Corporativo <ChevronDown size={12} />
            </button>
            {showQuickAdd && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 220, maxHeight: 320, overflowY: 'auto' }}>
                {missingRoles.length === 0 ? (
                  <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--neutral-500)' }}>Todos los roles ya están agregados</div>
                ) : missingRoles.map(cr => (
                  <button key={cr} onClick={() => { quickAddRole(cr); }} style={{ width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={12} style={{ color: 'var(--primary-500)', flexShrink: 0 }} /> {cr}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border-light)', padding: '8px 16px' }}>
                  <button onClick={() => { missingRoles.forEach(quickAddRole); setShowQuickAdd(false); }} className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: 11 }}>
                    Agregar Todos
                  </button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setShowResourceForm(v => !v)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} /> Personalizado
          </button>
          <AIGenerateButton data={data} artifactType="raci" onUpdate={onUpdate} mergeKey={['resources','raciMatrix']} />
        </div>
      </div>

      {showResourceForm && (
        <div style={{ padding: '12px 24px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Nombre</div>
            <input className="form-input form-input-sm" value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} placeholder="Juan Pérez" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Rol</div>
            <select className="form-input form-input-sm form-select" value={resForm.role} onChange={e => setResForm({ ...resForm, role: e.target.value })}>
              {CORPORATE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>$/hora</div>
            <input className="form-input form-input-sm" type="number" value={resForm.costPerHour} onChange={e => setResForm({ ...resForm, costPerHour: e.target.value })} placeholder="0" style={{ width: 80 }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addResource}>Agregar</button>
        </div>
      )}

      {resources.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 16 }}>Agregá roles corporativos para construir la matriz RACI.</p>
          <button onClick={() => { CORPORATE_ROLES.slice(0, 6).forEach(quickAddRole); }} className="btn btn-primary btn-sm">
            <Plus size={14} /> Cargar Roles Estándar
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', padding: '0 0 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', textAlign: 'left', borderBottom: '2px solid var(--border-light)', background: 'var(--neutral-50)', position: 'sticky', left: 0, zIndex: 1 }}>Tarea</th>
                {resources.map(r => (
                  <th key={r.id} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--neutral-700)', textAlign: 'center', borderBottom: '2px solid var(--border-light)', background: 'var(--neutral-50)', minWidth: 80 }}>
                    <div>{r.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--neutral-400)', fontWeight: 500 }}>{r.role !== r.name ? r.role : ''}</div>
                    <button onClick={() => removeResource(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-300)', marginTop: 2 }}><X size={10} /></button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    <span style={{ color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace", marginRight: 6 }}>{t.id}</span>
                    {t.name}
                  </td>
                  {resources.map(r => {
                    const role = getRole(t.id, r.id);
                    const colors = role ? ROLE_COLORS[role] : { bg: 'transparent', c: 'var(--neutral-300)' };
                    return (
                      <td key={r.id} style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                        <button
                          onClick={() => cycleRole(t.id, r.id)}
                          style={{
                            width: 32, height: 28, borderRadius: 6, border: role ? 'none' : '1px dashed var(--neutral-300)',
                            background: colors.bg, color: colors.c, fontWeight: 800, fontSize: 12, cursor: 'pointer',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {role || '·'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
