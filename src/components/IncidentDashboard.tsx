import React, { useState } from 'react';
import { IncidentData, IncidentTimelineEntry } from '../types';
import { AlertTriangle, Clock, CheckCircle, Edit2, Plus, X, MessageSquare, ChevronLeft, Shield, Zap, Activity } from 'lucide-react';
import IncidentChat from './IncidentChat';

interface Props {
  incident: IncidentData;
  onUpdate: (data: IncidentData) => void;
  onBack: () => void;
}

const SEV_COLORS: Record<string, { bg: string; c: string; border: string }> = {
  P1: { bg: '#fef2f2', c: '#dc2626', border: '#fca5a5' },
  P2: { bg: '#fff7ed', c: '#ea580c', border: '#fdba74' },
  P3: { bg: '#fefce8', c: '#ca8a04', border: '#fde047' },
  P4: { bg: '#f0fdf4', c: '#16a34a', border: '#86efac' },
};

const STATUS_FLOW: IncidentData['status'][] = ['Detectado', 'En Análisis', 'En Resolución', 'Resuelto', 'Cerrado'];

const CATEGORIES: IncidentData['category'][] = ['Infraestructura', 'Aplicación', 'Base de Datos', 'Red', 'Seguridad', 'Terceros', 'Otro'];

export default function IncidentDashboard({ incident, onUpdate, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'detail' | 'timeline'>('chat');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...incident });
  const [newSystem, setNewSystem] = useState('');
  const [newArea, setNewArea] = useState('');
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [tlForm, setTlForm] = useState({ action: '', detail: '', user: '' });

  const sev = SEV_COLORS[incident.severity] || SEV_COLORS.P3;
  const statusIdx = STATUS_FLOW.indexOf(incident.status);

  const advanceStatus = () => {
    if (statusIdx < STATUS_FLOW.length - 1) {
      const next = STATUS_FLOW[statusIdx + 1];
      const updates: Partial<IncidentData> = { status: next };
      if (next === 'Resuelto') updates.resolvedAt = new Date().toISOString();
      if (next === 'Cerrado') updates.closedAt = new Date().toISOString();
      const entry: IncidentTimelineEntry = { timestamp: new Date().toISOString(), action: `Estado → ${next}`, detail: `Cambio de estado automático`, user: 'Sistema' };
      onUpdate({ ...incident, ...updates, timeline: [...incident.timeline, entry], lastUpdated: new Date().toISOString() });
    }
  };

  const saveEdit = () => {
    onUpdate({ ...form, lastUpdated: new Date().toISOString() });
    setIsEditing(false);
  };

  const addTimelineEntry = () => {
    if (!tlForm.action.trim()) return;
    const entry: IncidentTimelineEntry = { timestamp: new Date().toISOString(), action: tlForm.action, detail: tlForm.detail, user: tlForm.user || undefined };
    onUpdate({ ...incident, timeline: [...incident.timeline, entry], lastUpdated: new Date().toISOString() });
    setTlForm({ action: '', detail: '', user: '' });
    setShowTimelineForm(false);
  };

  const addSystem = () => {
    if (!newSystem.trim() || incident.impactedSystems.includes(newSystem.trim())) return;
    onUpdate({ ...incident, impactedSystems: [...incident.impactedSystems, newSystem.trim()], lastUpdated: new Date().toISOString() });
    setNewSystem('');
  };

  const addArea = () => {
    if (!newArea.trim() || incident.impactedAreas.includes(newArea.trim())) return;
    onUpdate({ ...incident, impactedAreas: [...incident.impactedAreas, newArea.trim()], lastUpdated: new Date().toISOString() });
    setNewArea('');
  };

  const elapsed = () => {
    const start = new Date(incident.detectedAt);
    const end = incident.resolvedAt ? new Date(incident.resolvedAt) : new Date();
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg-app)' }}>
      {/* Sidebar */}
      <aside style={{ background: 'var(--brand-navy)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 20px 16px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 16, padding: 0 }}>
            <ChevronLeft size={14} /> Volver a Incidencias
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ padding: '6px 12px', borderRadius: 6, background: sev.bg, color: sev.c, fontWeight: 800, fontSize: 14, border: `1px solid ${sev.border}` }}>
              {incident.severity}
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.title}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{incident.id}</div>
        </div>

        {/* Status flow */}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Estado</div>
          {STATUS_FLOW.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', opacity: i <= statusIdx ? 1 : 0.4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < statusIdx ? '#10b981' : i === statusIdx ? '#3b82f6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700, border: i === statusIdx ? '2px solid #93c5fd' : 'none' }}>
                {i < statusIdx ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, color: i === statusIdx ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: i === statusIdx ? 700 : 400 }}>{s}</span>
            </div>
          ))}
          {statusIdx < STATUS_FLOW.length - 1 && (
            <button onClick={advanceStatus} style={{ marginTop: 12, width: '100%', padding: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Zap size={13} /> Avanzar a {STATUS_FLOW[statusIdx + 1]}
            </button>
          )}
        </div>

        {/* Quick info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Info Rápida</div>
          {[
            { label: 'Categoría', value: incident.category },
            { label: 'Asignado', value: incident.assignee || 'Sin asignar' },
            { label: 'Tiempo', value: elapsed() },
            { label: 'Detectada', value: new Date(incident.detectedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
            { label: 'Sistemas', value: incident.impactedSystems.join(', ') || '-' },
            { label: 'Áreas', value: incident.impactedAreas.join(', ') || '-' },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          Actualizado: {new Date(incident.lastUpdated).toLocaleString('es-AR')}
        </div>
      </aside>

      {/* Main */}
      <main style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)', padding: '0 24px' }}>
          {[
            { id: 'chat', label: 'Chat Agéntico', icon: MessageSquare },
            { id: 'detail', label: 'Detalle', icon: Shield },
            { id: 'timeline', label: 'Timeline', icon: Activity },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              padding: '14px 20px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? 'var(--primary-600)' : 'var(--neutral-500)',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-600)' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: '-1px',
            }}>
              <tab.icon size={15} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'chat' && (
            <IncidentChat incident={incident} onUpdate={onUpdate} />
          )}

          {activeTab === 'detail' && (
            <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Detalle de la Incidencia</h2>
                <button onClick={() => { if (isEditing) saveEdit(); else { setForm({ ...incident }); setIsEditing(true); } }} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isEditing ? <><CheckCircle size={14} /> Guardar</> : <><Edit2 size={14} /> Editar</>}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 6 }}>Título</div>
                  {isEditing ? <input className="form-input form-input-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /> : <div style={{ fontSize: 14, fontWeight: 600 }}>{incident.title}</div>}
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 6 }}>Severidad / Categoría</div>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="form-input form-input-sm form-select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as any })}>
                        {['P1', 'P2', 'P3', 'P4'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="form-input form-input-sm form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ) : <div style={{ fontSize: 14 }}><span style={{ ...sevBadgeStyle(incident.severity) }}>{incident.severity}</span> · {incident.category}</div>}
                </div>
              </div>

              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 6 }}>Descripción</div>
                {isEditing ? <textarea className="form-input form-input-sm" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'none' }} /> : <div style={{ fontSize: 13, lineHeight: 1.6 }}>{incident.description || 'Sin descripción'}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 8 }}>Sistemas Impactados</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {incident.impactedSystems.map((s, i) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--primary-50)', color: 'var(--primary-700)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {s}
                        <button onClick={() => onUpdate({ ...incident, impactedSystems: incident.impactedSystems.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-400)', padding: 0 }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input className="form-input form-input-sm" value={newSystem} onChange={e => setNewSystem(e.target.value)} placeholder="Agregar sistema..." onKeyDown={e => { if (e.key === 'Enter') addSystem(); }} style={{ flex: 1 }} />
                    <button onClick={addSystem} className="btn btn-sm btn-secondary"><Plus size={12} /></button>
                  </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 8 }}>Áreas Impactadas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {incident.impactedAreas.map((a, i) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {a}
                        <button onClick={() => onUpdate({ ...incident, impactedAreas: incident.impactedAreas.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', padding: 0 }}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input className="form-input form-input-sm" value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Agregar área..." onKeyDown={e => { if (e.key === 'Enter') addArea(); }} style={{ flex: 1 }} />
                    <button onClick={addArea} className="btn btn-sm btn-secondary"><Plus size={12} /></button>
                  </div>
                </div>
              </div>

              {['rootCause', 'workaround', 'resolution', 'lessonsLearned', 'preventiveActions'].map(field => (
                <div key={field} className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', marginBottom: 6 }}>
                    {{ rootCause: 'Causa Raíz', workaround: 'Workaround', resolution: 'Resolución', lessonsLearned: 'Lecciones Aprendidas', preventiveActions: 'Acciones Preventivas' }[field]}
                  </div>
                  {isEditing ? (
                    <textarea className="form-input form-input-sm" rows={2} value={(form as any)[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} style={{ resize: 'none' }} />
                  ) : (
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: (incident as any)[field] ? 'var(--neutral-800)' : 'var(--neutral-400)', fontStyle: (incident as any)[field] ? 'normal' : 'italic' }}>
                      {(incident as any)[field] || 'Pendiente de completar'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Timeline de la Incidencia</h2>
                <button onClick={() => setShowTimelineForm(v => !v)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {showTimelineForm ? <X size={14} /> : <Plus size={14} />} {showTimelineForm ? 'Cancelar' : 'Agregar Evento'}
                </button>
              </div>

              {showTimelineForm && (
                <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--neutral-50)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Acción</div><input className="form-input form-input-sm" value={tlForm.action} onChange={e => setTlForm({ ...tlForm, action: e.target.value })} placeholder="Ej: Reinicio de servicio" /></div>
                    <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Detalle</div><input className="form-input form-input-sm" value={tlForm.detail} onChange={e => setTlForm({ ...tlForm, detail: e.target.value })} placeholder="Descripción del evento" /></div>
                    <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 4 }}>Responsable</div><input className="form-input form-input-sm" value={tlForm.user} onChange={e => setTlForm({ ...tlForm, user: e.target.value })} placeholder="Nombre" /></div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={addTimelineEntry}>Agregar</button>
                </div>
              )}

              {incident.timeline.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}>
                  <Clock size={40} style={{ color: 'var(--neutral-200)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>Sin eventos en el timeline.</p>
                  <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Pegá un chat en la pestaña "Chat Agéntico" y se generará automáticamente.</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 28 }}>
                  <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border-light)' }} />
                  {[...incident.timeline].reverse().map((entry, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                      <div style={{ position: 'absolute', left: -23, top: 4, width: 12, height: 12, borderRadius: '50%', background: i === 0 ? 'var(--primary-600)' : 'var(--neutral-300)', border: '2px solid var(--bg-app)' }} />
                      <div className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-900)' }}>{entry.action}</span>
                          <span style={{ fontSize: 10, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {new Date(entry.timestamp).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {entry.detail && <div style={{ fontSize: 12, color: 'var(--neutral-600)', lineHeight: 1.5 }}>{entry.detail}</div>}
                        {entry.user && <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 4 }}>— {entry.user}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function sevBadgeStyle(sev: string): React.CSSProperties {
  const colors: Record<string, { bg: string; c: string; border: string }> = {
    P1: { bg: '#fef2f2', c: '#dc2626', border: '#fca5a5' },
    P2: { bg: '#fff7ed', c: '#ea580c', border: '#fdba74' },
    P3: { bg: '#fefce8', c: '#ca8a04', border: '#fde047' },
    P4: { bg: '#f0fdf4', c: '#16a34a', border: '#86efac' },
  };
  const c = colors[sev] || colors.P3;
  return { display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.c, fontWeight: 800, fontSize: 11, border: `1px solid ${c.border}` };
}
