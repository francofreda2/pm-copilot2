import React, { useMemo } from 'react';
import { ProjectData, Task } from '../types';
import { Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Props {
  data: ProjectData;
}

export default function ResourceAllocation({ data }: Props) {
  const resourceStats = useMemo(() => {
    const map = new Map<string, { totalHours: number, tasks: Task[] }>();
    
    data.tasks.forEach(t => {
      const recs = t.rec ? t.rec.split(',').map(r => r.trim()).filter(r => r && r.toLowerCase() !== 'tbd') : [];
      if (recs.length === 0) recs.push('Sin Asignar');
      
      recs.forEach(r => {
        if (!map.has(r)) map.set(r, { totalHours: 0, tasks: [] });
        const entry = map.get(r)!;
        entry.totalHours += Number(t.dur) || 0;
        entry.tasks.push(t);
      });
    });
    
    // Sort by hours descending
    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [data.tasks]);

  const maxWeeklyHours = 40; // Assuming 40h typical capacity 
  // We don't have exact time overlap logic, so we just show total hours assigned across the whole project.
  // A better metric is hours/week if we compute CPM overlaps, but for now we do total load.

  if (data.tasks.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <Users size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, color: 'var(--neutral-500)' }}>No hay tareas para analizar asignación de recursos.</p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 0 }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={20} style={{ color: 'var(--primary-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-800)', margin: 0 }}>Carga de Recursos</h2>
        </div>
        <div style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
          Basado en {data.tasks.length} tareas
        </div>
      </div>

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {resourceStats.map(res => {
          // Simplistic overload check: if they have more than 160h (1 month worth) total assigned, flag it.
          // Or we just show a bar relative to the highest loaded person.
          const maxHours = Math.max(...resourceStats.map(r => r.totalHours), 1);
          const loadPct = (res.totalHours / maxHours) * 100;
          
          return (
            <div key={res.name} style={{ background: 'var(--neutral-50)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: res.name === 'Sin Asignar' ? 'var(--neutral-500)' : 'var(--neutral-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {res.name}
                    {res.name === 'Sin Asignar' && <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 2 }}>{res.tasks.length} tareas asignadas</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-700)', fontFamily: "'JetBrains Mono', monospace" }}>{res.totalHours}h</div>
                  <div style={{ fontSize: 10, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Carga Total</div>
                </div>
              </div>

              {/* Load Bar */}
              <div style={{ height: 6, background: 'var(--neutral-200)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ 
                  height: '100%', 
                  width: `${loadPct}%`, 
                  background: res.name === 'Sin Asignar' ? 'var(--warning)' : 'var(--primary-600)',
                  borderRadius: 4 
                }} />
              </div>

              {/* Task List */}
              <div style={{ maxHeight: 120, overflowY: 'auto', paddingRight: 4 }}>
                {res.tasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <span style={{ fontWeight: 700, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace", width: 34, flexShrink: 0 }}>{t.id}</span>
                      <span style={{ color: 'var(--neutral-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ color: t.status === 'completed' ? 'var(--success)' : t.status === 'in_progress' ? 'var(--warning)' : 'var(--neutral-400)' }}>
                        {t.status === 'completed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--neutral-600)', fontFamily: "'JetBrains Mono', monospace" }}>{t.dur}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
