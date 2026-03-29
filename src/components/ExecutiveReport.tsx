import React from 'react';
import { ProjectData } from '../types';
import { X, Printer } from 'lucide-react';

interface Props {
  data: ProjectData;
  onClose: () => void;
}

function calcHealthScore(data: ProjectData): number {
  const totalTasks = data.tasks.length;
  if (totalTasks === 0) return 0;
  const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = data.tasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = totalTasks - completedTasks - inProgressTasks;
  let score = 100;
  score -= data.risks.filter(r => r.v === 'high').length * 10;
  if (inProgressTasks === 0 && pendingTasks > 0) score -= 15;
  if (data.risks.length === 0 && totalTasks > 2) score -= 5;
  score = Math.max(0, Math.min(100, score));
  score = Math.round(score * (0.5 + 0.5 * (completedTasks / totalTasks)));
  return Math.max(0, score);
}

function calcSPI(data: ProjectData): number {
  const tasks = data.tasks;
  if (tasks.length === 0) return 1;
  const totalDur = tasks.reduce((s, t) => s + (t.dur || 0), 0);
  if (totalDur === 0) return 1;
  const ev = tasks.reduce((s, t) => {
    const pct = (t.percentComplete ?? (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0));
    return s + (pct / 100) * (t.dur || 0);
  }, 0);
  return ev / totalDur;
}

function calcCPI(data: ProjectData): number {
  const tasks = data.tasks.filter(t => (t.actualHours || 0) > 0);
  if (tasks.length === 0) return 1;
  const ev = tasks.reduce((s, t) => {
    const pct = (t.percentComplete ?? (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0));
    return s + (pct / 100) * (t.dur || 0);
  }, 0);
  const ac = tasks.reduce((s, t) => s + (t.actualHours || 0), 0);
  return ac === 0 ? 1 : ev / ac;
}

export default function ExecutiveReport({ data, onClose }: Props) {
  const health = calcHealthScore(data);
  const healthLabel = health >= 70 ? 'Saludable' : health >= 40 ? 'Atención Requerida' : 'Estado Crítico';
  const healthColor = health >= 70 ? '#10b981' : health >= 40 ? '#f59e0b' : '#ef4444';

  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const highRisks = data.risks.filter(r => r.v === 'high');
  const midRisks = data.risks.filter(r => r.v === 'mid');
  const lowRisks = data.risks.filter(r => r.v === 'low');

  const doneMilestones = data.milestones.filter(m => m.s === 'done');
  const activeMilestones = data.milestones.filter(m => m.s === 'active');
  const pendingMilestones = data.milestones.filter(m => m.s === 'pending');

  const spi = calcSPI(data);
  const cpi = calcCPI(data);
  const hasTimesheetData = data.tasks.some(t => (t.actualHours || 0) > 0 || (t.percentComplete || 0) > 0);

  const badgeStyle = (color: string) => ({
    display: 'inline-block', padding: '3px 10px',
    background: color + '20', color,
    borderRadius: 6, fontSize: 11, fontWeight: 700,
    border: `1px solid ${color}40`,
  });

  const indexColor = (val: number) => val >= 1 ? '#10b981' : val >= 0.8 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* Screen overlay modal */}
      <div className="no-print" style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 20px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 780, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
          {/* Modal header */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--neutral-50)' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-900)' }}>Reporte Ejecutivo</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.print()}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={14} /> Imprimir / Guardar PDF
              </button>
              <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={14} /> Cerrar
              </button>
            </div>
          </div>

          {/* Report content */}
          <div id="executive-report-content" className="print-only" style={{ padding: '32px' }}>
            {/* Header */}
            <div style={{ borderBottom: '3px solid #1d4ed8', paddingBottom: 20, marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Reporte Ejecutivo de Estado</div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6, lineHeight: 1.2 }}>{data.name}</h1>
                  <p style={{ fontSize: 13, color: '#475569', maxWidth: 480, lineHeight: 1.6 }}>{data.businessObjective}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ ...badgeStyle(healthColor), fontSize: 12, padding: '6px 14px' }}>{healthLabel}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Health Score: <strong style={{ color: healthColor }}>{health}/100</strong></div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Fecha: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Estado: <strong>{data.status}</strong></div>
                </div>
              </div>
            </div>

            {/* KPIs Grid */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 }}>Indicadores Clave</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Alcance', value: data.kpiScope || 'N/A', color: '#059669' },
                  { label: 'Cronograma', value: data.kpiSchedule || 'N/A', color: '#d97706' },
                  { label: 'Presupuesto', value: data.kpiBudget || 'N/A', color: '#1d4ed8' },
                  { label: 'Calidad', value: data.kpiQuality || 'N/A', color: '#7c3aed' },
                ].map(k => (
                  <div key={k.label} style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, borderLeft: `4px solid ${k.color}` }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: k.color, wordBreak: 'break-word' }}>{k.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avance */}
            <div style={{ marginBottom: 28, padding: '16px 20px', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Avance del Proyecto</h2>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{progressPct}%</span>
              </div>
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: '#10b981', borderRadius: 10 }} />
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 11, color: '#64748b' }}>
                <span>{completedTasks} completadas</span>
                <span>{data.tasks.filter(t => t.status === 'in_progress').length} en curso</span>
                <span>{data.tasks.filter(t => !t.status || t.status === 'pending').length} pendientes</span>
                <span>Total: {totalTasks} tareas</span>
              </div>
            </div>

            {/* Hitos */}
            {data.milestones.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Hitos del Proyecto</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={badgeStyle('#10b981')}>✓ {doneMilestones.length} Completados</span>
                  <span style={badgeStyle('#3b82f6')}>● {activeMilestones.length} Activos</span>
                  <span style={badgeStyle('#94a3b8')}>○ {pendingMilestones.length} Pendientes</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Hito</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Fecha</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.milestones.map((m, i) => (
                      <tr key={i}>
                        <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }}>{m.n}</td>
                        <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0', color: '#64748b' }}>{m.w}</td>
                        <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }}>
                          <span style={badgeStyle(m.s === 'done' ? '#10b981' : m.s === 'active' ? '#3b82f6' : '#94a3b8')}>
                            {m.s === 'done' ? 'Completado' : m.s === 'active' ? 'Activo' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Riesgos */}
            {data.risks.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Registro de Riesgos</h2>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: '10px 16px', border: '2px solid #fca5a5', borderRadius: 8, textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{highRisks.length}</div>
                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>Alto</div>
                  </div>
                  <div style={{ padding: '10px 16px', border: '2px solid #fcd34d', borderRadius: 8, textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{midRisks.length}</div>
                    <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase' }}>Medio</div>
                  </div>
                  <div style={{ padding: '10px 16px', border: '2px solid #bfdbfe', borderRadius: 8, textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{lowRisks.length}</div>
                    <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase' }}>Bajo</div>
                  </div>
                </div>
                {highRisks.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Riesgos de Alto Impacto:</div>
                    {highRisks.map((r, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                        <strong>{r.id} · {r.title}</strong>{r.desc && ` — ${r.desc}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Índices de desempeño */}
            {hasTimesheetData && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Índices de Desempeño (EVM)</h2>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ padding: '14px 20px', border: `2px solid ${indexColor(spi)}40`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>SPI (Cronograma)</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: indexColor(spi) }}>{spi.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{spi >= 1 ? 'Adelantado' : spi >= 0.8 ? 'Leve retraso' : 'Retraso significativo'}</div>
                  </div>
                  <div style={{ padding: '14px 20px', border: `2px solid ${indexColor(cpi)}40`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>CPI (Costo)</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: indexColor(cpi) }}>{cpi.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{cpi >= 1 ? 'Bajo presupuesto' : cpi >= 0.8 ? 'Leve sobrecosto' : 'Sobrecosto significativo'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
              <span>PM Copilot — Reporte generado el {new Date().toLocaleString('es-AR')}</span>
              <span>Proyecto: {data.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
