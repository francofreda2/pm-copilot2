import React from 'react';
import { ProjectData } from '../types';
import { Plus, Folder, Clock, ChevronRight, Trash2 } from 'lucide-react';

interface Props {
  projects: ProjectData[];
  onSelect: (project: ProjectData) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
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
            Gestiona y continúa trabajando en tus proyectos.
          </p>
        </div>
        <button onClick={onNew} className="btn btn-primary">
          <Plus size={18} />
          Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ padding: 64, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ width: 64, height: 64, background: 'var(--neutral-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Folder size={28} style={{ color: 'var(--neutral-400)' }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 8 }}>
            No hay proyectos aún
          </h3>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14, maxWidth: 380, margin: '0 auto 24px' }}>
            Comienza creando tu primer proyecto para que PM Copilot te ayude a planificarlo.
          </p>
          <button onClick={onNew} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
            Crear mi primer proyecto →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }} className="stagger-children">
          {projects.map(project => (
            <div
              key={project.id}
              className="card card-interactive group"
              style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', position: 'relative' }}
              onClick={() => onSelect(project)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span className={`badge ${
                  project.status === 'Completado' ? 'badge-success' :
                  project.status === 'En Ejecución' ? 'badge-info' :
                  'badge-warning'
                }`} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {project.status}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('¿Estás seguro de eliminar este proyecto?')) {
                      onDelete(project.id);
                    }
                  }}
                  className="btn-danger group-hover-visible"
                  style={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 6, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--neutral-500)', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {project.businessObjective}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--border-subtle)', marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--neutral-400)', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                  <Clock size={13} />
                  {new Date(project.lastUpdated).toLocaleDateString()}
                </div>
                <div style={{ color: 'var(--primary-600)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, transition: 'transform 0.2s' }}>
                  Abrir <ChevronRight size={16} style={{ marginLeft: 2 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
