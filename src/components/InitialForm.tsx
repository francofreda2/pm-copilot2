import React, { useState } from 'react';
import { ProjectInput } from '../types';
import { Rocket, Target, FileText, Briefcase } from 'lucide-react';

interface Props {
  onSubmit: (data: ProjectInput) => void;
}

export default function InitialForm({ onSubmit }: Props) {
  const [formData, setFormData] = useState<ProjectInput>({
    name: '',
    businessObjective: '',
    description: '',
    projectType: 'Desarrollo de Software'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.businessObjective && formData.description) {
      onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="bg-indigo-600 p-8 text-white text-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Bienvenido a PM Copilot</h2>
        <p className="text-indigo-100 max-w-lg mx-auto">
          Para comenzar a planificar tu proyecto de forma iterativa, por favor proporciona el contexto inicial. Yo me encargaré de guiarte paso a paso.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Briefcase className="w-4 h-4 text-zinc-400" />
              Nombre del Proyecto
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Ej: Migración a la Nube 2024"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="projectType" className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Target className="w-4 h-4 text-zinc-400" />
              Tipo de Proyecto
            </label>
            <select
              id="projectType"
              name="projectType"
              value={formData.projectType}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
            >
              <option value="Desarrollo de Software">Desarrollo de Software</option>
              <option value="Infraestructura IT">Infraestructura IT</option>
              <option value="Marketing / Campaña">Marketing / Campaña</option>
              <option value="Mejora de Procesos">Mejora de Procesos</option>
              <option value="Lanzamiento de Producto">Lanzamiento de Producto</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="businessObjective" className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <Target className="w-4 h-4 text-zinc-400" />
            Objetivo Principal (Negocio)
          </label>
          <input
            type="text"
            id="businessObjective"
            name="businessObjective"
            required
            placeholder="Ej: Reducir los costos operativos en un 15% para el Q3."
            value={formData.businessObjective}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <FileText className="w-4 h-4 text-zinc-400" />
            Descripción Breve
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            placeholder="Describe brevemente de qué trata el proyecto, quiénes están involucrados y cualquier restricción conocida..."
            value={formData.description}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
          />
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Comenzar Planificación Iterativa
            <Rocket className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
