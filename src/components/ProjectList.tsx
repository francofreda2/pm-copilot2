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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mis Proyectos</h1>
          <p className="text-zinc-500 text-sm mt-1">Gestiona y continúa trabajando en tus proyectos.</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-zinc-200 border-dashed rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900 mb-2">No hay proyectos aún</h3>
          <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
            Comienza creando tu primer proyecto para que PM Copilot te ayude a planificarlo.
          </p>
          <button
            onClick={onNew}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Crear mi primer proyecto &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div 
              key={project.id}
              className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer group relative"
              onClick={() => onSelect(project)}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  project.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' :
                  project.status === 'En Ejecución' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {project.status}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('¿Estás seguro de eliminar este proyecto?')) {
                      onDelete(project.id);
                    }
                  }}
                  className="text-zinc-400 hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-zinc-900 mb-1 line-clamp-1">{project.name}</h3>
              <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">
                {project.businessObjective}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(project.lastUpdated).toLocaleDateString()}
                </div>
                <div className="text-indigo-600 flex items-center text-sm font-medium group-hover:translate-x-1 transition-transform">
                  Abrir <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
