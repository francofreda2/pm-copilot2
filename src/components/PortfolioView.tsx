import React from 'react';
import { ProjectData } from '../types';
import { ChevronRight, AlertTriangle, CheckCircle, Clock, BarChart2, Folder } from 'lucide-react';

interface Props {
  projects: ProjectData[];
  onSelectProject: (id: string) => void;
  onBack: () => void;
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

export default function PortfolioView({ projects, onSelectProject, onBack }: Props) {
  const totalTasks = projects.reduce((s, p) => s + p.tasks.length, 0);
  const atRisk = projects.filter(p => calcHealthScore(p) < 70).length;

  const healthColor = (h: number) => h >= 70 ? 'var(--success)' : h >= 40 ? 'var(--warning)' : 'var(--error)';
  const healthLabel = (h: number) => h >= 70 ? 'Saludable' : h >= 40 ? 'Atención' : 'Crítico';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--neutral-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Vista Portfolio
          </h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14 }}>
            Visión comparativa de todos tus proyectos
          </p>
        </div>
        <button onClick={onBack} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Volver
        </button>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Proyectos', value: projects.length, icon: Folder, color: 'var(--primary-600)' },
          { label: 'Total Tareas', value: totalTasks, icon: BarChart2, color: 'var(--success)' },
          { label: 'Proyectos en Riesgo', value: atRisk, icon: AlertTriangle, color: atRisk > 0 ? 'var(--error)' : 'var(--neutral-400)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      {projects.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center', borderStyle: 'dashed' }}>
          <Folder size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 6 }}>Sin proyectos</h3>
          <p style={{ fontSize: 13, color: 'var(--neutral-500)' }}>No hay proyectos para mostrar en el portfolio.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }} className="stagger-children">
          {projects.map(project => {
            const health = calcHealthScore(project);
            const hColor = healthColor(health);
            const totalT = project.tasks.length;
            const completedT = project.tasks.filter(t => t.status === 'completed').length;
            const inProgressT = project.tasks.filter(t => t.status === 'in_progress').length;
            const pct = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
            const totalDur = project.tasks.reduce((s, t) => s + (t.dur || 0), 0);

            return (
              <div
                key={project.id}
                className="card card-interactive"
                style={{ cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => onSelectProject(project.id)}
              >
                {/* Color accent bar */}
                <div style={{ height: 4, background: project.accentColor || 'var(--primary-600)', margin: '-0px -0px 0' }} />

                <div style={{ padding: '16px 20px 20px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span className={`badge ${
                      project.status === 'Completado' ? 'badge-success' :
                      project.status === 'En Ejecución' ? 'badge-info' : 'badge-warning'
                    }`} style={{ fontSize: 10 }}>
                      {project.status}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: hColor }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: hColor }}>{health}</span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.accentColor && (
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: project.accentColor, marginRight: 8, verticalAlign: 'middle' }} />
                    )}
                    {project.name}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--neutral-500)', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {project.businessObjective}
                  </p>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--neutral-500)', marginBottom: 4 }}>
                      <span>Progreso</span>
                      <span style={{ fontWeight: 700, color: 'var(--neutral-700)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--neutral-100)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${pct}%`, background: 'var(--success)', borderRadius: 10, transition: 'width 0.4s' }} />
                      <div style={{ width: `${totalT > 0 ? (inProgressT / totalT) * 100 : 0}%`, background: 'var(--warning)' }} />
                    </div>
                  </div>

                  {/* Mini Gantt strip */}
                  {totalT > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: 'var(--neutral-400)', marginBottom: 4 }}>Distribución de tareas</div>
                      <div style={{ height: 8, background: 'var(--neutral-100)', borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 1 }}>
                        {project.tasks.slice(0, 20).map((t, i) => {
                          const w = totalDur > 0 ? (t.dur / totalDur) * 100 : (100 / totalT);
                          return (
                            <div
                              key={i}
                              title={t.name}
                              style={{
                                flex: `0 0 ${w}%`,
                                height: '100%',
                                background: t.status === 'completed' ? 'var(--success)' :
                                  t.status === 'in_progress' ? 'var(--warning)' :
                                  (project.accentColor || 'var(--primary-400)'),
                                opacity: 0.8,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--neutral-400)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {new Date(project.lastUpdated).toLocaleDateString('es-AR')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary-600)', fontWeight: 600 }}>
                      Abrir <ChevronRight size={13} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
