import React, { useState } from 'react';
import { IncidentData } from '../types';
import { Plus, AlertTriangle, Clock, ChevronRight, Trash2, Search } from 'lucide-react';

interface Props {
  incidents: IncidentData[];
  onSelect: (incident: IncidentData) => void;
  onNew: (incident: IncidentData) => void;
  onDelete: (id: string) => void;
}

const SEV_COLORS: Record<string, { bg: string; c: string }> = {
  P1: { bg: '#fef2f2', c: '#dc2626' },
  P2: { bg: '#fff7ed', c: '#ea580c' },
  P3: { bg: '#fefce8', c: '#ca8a04' },
  P4: { bg: '#f0fdf4', c: '#16a34a' },
};

const STATUS_COLORS: Record<string, { bg: string; c: string }> = {
  'Detectado': { bg: '#fef2f2', c: '#dc2626' },
  'En Análisis': { bg: '#fff7ed', c: '#ea580c' },
  'En Resolución': { bg: '#fefce8', c: '#ca8a04' },
  'Resuelto': { bg: '#dbeafe', c: '#1d4ed8' },
  'Cerrado': { bg: '#f0fdf4', c: '#16a34a' },
};

export default function IncidentList({ incidents, onSelect, onNew, onDelete }: Props) {
  const [filter, setFilter] = useState('');
  const [sevFilter, setSevFilter] = useState<string>('all');

  const filtered = incidents.filter(inc => {
    const matchText = !filter || inc.title.toLowerCase().includes(filter.toLowerCase()) || inc.description.toLowerCase().includes(filter.toLowerCase()) || inc.impactedSystems.some(s => s.toLowerCase().includes(filter.toLowerCase()));
    const matchSev = sevFilter === 'all' || inc.severity === sevFilter;
    return matchText && matchSev;
  });

  const createNew = () => {
    const newIncident: IncidentData = {
      id: `INC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      title: 'Nueva Incidencia',
      description: '',
      severity: 'P3',
      status: 'Detectado',
      category: 'Aplicación',
      impactedSystems: [],
      impactedAreas: [],
      detectedAt: new Date().toISOString(),
      assignee: '',
      timeline: [{ timestamp: new Date().toISOString(), action: 'Incidencia creada', detail: 'Registro inicial', user: 'Sistema' }],
      chatMessages: [],
      lastUpdated: new Date().toISOString(),
      tags: [],
    };
    onNew(newIncident);
  };

  const openCount = incidents.filter(i => i.status !== 'Cerrado' && i.status !== 'Resuelto').length;
  const p1Count = incidents.filter(i => i.severity === 'P1' && i.status !== 'Cerrado').length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--neutral-900)', letterSpacing: '-0.5px' }}>Incidencias</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14, marginTop: 4 }}>
            Gestión agéntica de incidencias — pegá chats y se estructuran solos
          </p>
        </div>
        <button onClick={createNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> Nueva Incidencia
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total', value: incidents.length, color: 'var(--primary-600)' },
          { label: 'Abiertas', value: openCount, color: openCount > 0 ? 'var(--warning)' : 'var(--success)' },
          { label: 'P1 Activas', value: p1Count, color: p1Count > 0 ? 'var(--error)' : 'var(--success)' },
          { label: 'Cerradas', value: incidents.filter(i => i.status === 'Cerrado').length, color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
          <input className="form-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por título, sistema, descripción..." style={{ paddingLeft: 36 }} />
        </div>
        <select className="form-input form-select" value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={{ width: 120 }}>
          <option value="all">Todas</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center', borderStyle: 'dashed' }}>
          <AlertTriangle size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 8 }}>
            {incidents.length === 0 ? 'Sin incidencias registradas' : 'Sin resultados'}
          </h3>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14, maxWidth: 400, margin: '0 auto 24px' }}>
            {incidents.length === 0 ? 'Creá una incidencia y pegá el chat/log para que se estructure automáticamente.' : 'Probá con otros filtros.'}
          </p>
          {incidents.length === 0 && (
            <button onClick={createNew} className="btn btn-primary btn-sm"><Plus size={14} /> Crear Incidencia</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(inc => {
            const sevC = SEV_COLORS[inc.severity] || SEV_COLORS.P3;
            const statC = STATUS_COLORS[inc.status] || STATUS_COLORS['Detectado'];
            return (
              <div key={inc.id} className="card card-interactive group" style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => onSelect(inc)}>
                <div style={{ padding: '6px 10px', borderRadius: 6, background: sevC.bg, color: sevC.c, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {inc.severity}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{inc.id}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: statC.bg, color: statC.c, fontSize: 10, fontWeight: 700 }}>{inc.status}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inc.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2, display: 'flex', gap: 12 }}>
                    {inc.impactedSystems.length > 0 && <span>{inc.impactedSystems.slice(0, 3).join(', ')}</span>}
                    {inc.assignee && <span>→ {inc.assignee}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {new Date(inc.detectedAt).toLocaleDateString('es-AR')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--neutral-300)', marginTop: 2 }}>{inc.timeline.length} eventos</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm('¿Eliminar esta incidencia?')) onDelete(inc.id); }} className="btn-danger group-hover-visible" style={{ opacity: 0, transition: 'opacity 0.15s' }}>
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} style={{ color: 'var(--neutral-300)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
