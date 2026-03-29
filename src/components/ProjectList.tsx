import React from 'react';
import { ProjectData } from '../types';
import { Plus, Folder, Clock, ChevronRight, Trash2, CheckCircle2, AlertTriangle, ListTodo } from 'lucide-react';

interface Props {
  projects: ProjectData[];
  onSelect: (project: ProjectData) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function MiniProgress({ tasks }: { tasks: ProjectData['tasks'] }) {
  const total = tasks.length;
  if (total === 0) return <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>Sin tareas</span>;
  const done = tasks.filter(t => t.status === 'completed').length;
  const pct = Math.round((done / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--neutral-100)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--success)' : 'var(--primary-500)', borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--neutral-600)', fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

export default function ProjectList({ projects, onSelect, onNew, onDelete }: Props) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--neutral-900)', letterSpacing: '-0.5px' }}>
            Mis Proyectos
          </h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14, marginTop: 4 }}>
            {projects.length > 0 ? `${projects.length} proyecto${projects.length > 1 ? 's' : ''} activo${projects.length > 1 ? 's' : ''}` : 'Gestiona y continúa trabajando en tus proyectos.'}
          </p>
        </div>
        <button onClick={onNew} className="btn btn-primary">
          <Plus size={18} />
          Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">
            <Folder size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 8 }}>
            No hay proyectos aún
          </h3>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14, maxWidth: 380, margin: '0 auto 24px' }}>
            Comienza creando tu primer proyecto para que PM Copilot te ayude a planificarlo.
          </p>
          <button onClick={onNew} className="btn btn-primary">
            <Plus size={16} /> Crear mi primer proyecto
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }} className="stagger-children">
          {projects.map(project => {
            const totalTasks = project.tasks?.length || 0;
            const doneTasks = project.tasks?.filter(t => t.status === 'completed').length || 0;
            const highRisks = project.risks?.filter(r => r.v === 'high' && r.status !== 'closed').length || 0;
            const accentColor = project.accentColor || 'var(--primary-500)';

            return (
              <div
                key={project.id}
                className="card project-card group"
                style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative', padding: 0, overflow: 'hidden' }}
                onClick={() => onSelect(project)}
              >
                {/* Accent top bar */}
                <div style={{ height: 3, background: accentColor }} />

                <div style={{ padding: '20px 24px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${
                        project.status === 'Completado' ? 'badge-success' :
                        project.status === 'En Ejecución' ? 'badge-info' :
                        'badge-warning'
                      }`} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {project.status}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {project.methodology === 'agile' ? 'Ágil' : project.methodology === 'hybrid' ? 'Híbrido' : 'Predictivo'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('¿Estás seguro de eliminar este proyecto?')) onDelete(project.id);
                      }}
                      className="btn-danger group-hover-visible"
                      style={{ opacity: 0, transition: 'opacity 0.15s' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Title & objective */}
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--neutral-500)', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 16 }}>
                    {project.businessObjective}
                  </p>

                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <span className="stat-mini stat-mini-tasks">
                      <ListTodo size={12} /> {doneTasks}/{totalTasks}
                    </span>
                    {highRisks > 0 && (
                      <span className="stat-mini stat-mini-risks">
                        <AlertTriangle size={12} /> {highRisks}
                      </span>
                    )}
                    {project.milestones?.length > 0 && (
                      <span className="stat-mini" style={{ background: 'var(--success-light)', color: '#065f46' }}>
                        <CheckCircle2 size={12} /> {project.milestones.filter(m => m.s === 'done').length}/{project.milestones.length}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <MiniProgress tasks={project.tasks || []} />
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--neutral-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--neutral-400)', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                    <Clock size={12} />
                    {new Date(project.lastUpdated).toLocaleDateString()}
                  </div>
                  <div style={{ color: 'var(--primary-600)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600, transition: 'gap 0.2s', gap: 2 }}>
                    Abrir <ChevronRight size={15} />
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
