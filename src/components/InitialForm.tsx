import React, { useState, useRef } from 'react';
import { ProjectInput } from '../types';
import { Rocket, Target, FileText, Briefcase, Upload, Loader2, Sparkles } from 'lucide-react';
import { processFileContent } from '../utils/fileUtils';
import { generateProjectFromFileData } from '../services/geminiService';
import { useToast } from './ToastContext';

interface Props {
  onSubmit: (data: ProjectInput) => void;
  onImport: (parsedData: any) => void;
}

export default function InitialForm({ onSubmit, onImport }: Props) {
  const [formData, setFormData] = useState<ProjectInput>({
    name: '',
    businessObjective: '',
    description: '',
    projectType: 'Desarrollo de Software'
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

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

  const handleFileProcess = async (file: File) => {
    setIsProcessingFile(true);
    setUploadError('');
    try {
      setUploadStatus('Leyendo archivo...');
      const { text, type } = await processFileContent(file);
      
      setUploadStatus('Gemini está analizando el documento y generando el proyecto...');
      const parsedData = await generateProjectFromFileData(text, type);
      
      addToast('Proyecto generado exitosamente desde el archivo', 'success');
      onImport(parsedData);
    } catch (e: any) {
      setUploadError(e.message || 'Error al procesar el archivo');
      addToast(e.message || 'Hubo un error al leer el archivo', 'error');
    } finally {
      setIsProcessingFile(false);
      setUploadStatus('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileProcess(file);
  };

  return (
    <div className="animate-fade-in-scale" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--brand-navy), var(--primary-800))', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(15,23,42,0.15)' }}>
          <Rocket size={32} color="#fff" />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--neutral-900)', letterSpacing: '-1px', marginBottom: 12 }}>Bienvenido a PM Copilot</h1>
        <p style={{ color: 'var(--neutral-600)', fontSize: 16, lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
          Para comenzar a planificar tu proyecto de forma iterativa, podés subir un documento existente o ingresar el contexto manualmente.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Upload Zone */}
        <div 
          className="card card-lift" 
          style={{ padding: 32, position: 'relative', overflow: 'hidden', border: isDragging ? '2px dashed var(--primary-500)' : '1px solid var(--border-light)', background: isDragging ? 'var(--primary-50)' : '#fff', transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', cursor: isProcessingFile ? 'wait' : 'pointer' }}
          onDragOver={e => { e.preventDefault(); if (!isProcessingFile) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => { if (!isProcessingFile) fileInputRef.current?.click(); }}
        >
          {isProcessingFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
              <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary-600)', marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 8 }}>Mágia en proceso...</h3>
              <p style={{ fontSize: 14, color: 'var(--neutral-600)', textAlign: 'center', maxWidth: 400 }}>{uploadStatus}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 180 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Upload size={24} style={{ color: 'var(--primary-600)' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-900)', marginBottom: 8 }}>Autogenerar desde un archivo</h3>
              <p style={{ fontSize: 14, color: 'var(--neutral-500)', maxWidth: 400, margin: '0 auto 16px' }}>Soltá tu PowerPoint, Excel o CSV acá y Gemini preparará el WBS, los riesgos y el Gantt automáticamente.</p>
              <span className="btn btn-secondary" style={{ pointerEvents: 'none' }}>Seleccionar Archivo</span>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.pptx,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileProcess(f); }} style={{ display: 'none' }} />
            </div>
          )}
          {uploadError && (
             <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 13, textAlign: 'center', fontWeight: 600 }}>{uploadError}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: 1 }}>O CREAR MANUALMENTE</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

        {/* Manual Form */}
        <div className="card card-lift" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 20 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="name" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={14} style={{ color: 'var(--neutral-400)' }} />
                  Nombre del Proyecto
                </label>
                <input type="text" id="name" name="name" required placeholder="Ej: Migración Cloud 2025" value={formData.name} onChange={handleChange} className="form-input" disabled={isProcessingFile} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="projectType" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} style={{ color: 'var(--neutral-400)' }} />
                  Tipo de Proyecto
                </label>
                <select id="projectType" name="projectType" value={formData.projectType} onChange={handleChange} className="form-input form-select" disabled={isProcessingFile}>
                  <option value="Desarrollo de Software">Desarrollo de Software</option>
                  <option value="Infraestructura IT">Infraestructura IT</option>
                  <option value="Marketing / Campaña">Marketing / Campaña</option>
                  <option value="Mejora de Procesos">Mejora de Procesos</option>
                  <option value="Lanzamiento de Producto">Lanzamiento de Producto</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="businessObjective" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={14} style={{ color: 'var(--neutral-400)' }} />
                Objetivo Principal (Negocio)
              </label>
              <input type="text" id="businessObjective" name="businessObjective" required placeholder="Ej: Reducir costos operativos en un 15% para el Q3." value={formData.businessObjective} onChange={handleChange} className="form-input" disabled={isProcessingFile} />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label htmlFor="description" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} style={{ color: 'var(--neutral-400)' }} />
                Descripción Breve
              </label>
              <textarea id="description" name="description" required rows={3} placeholder="Describe brevemente de qué trata el proyecto..." value={formData.description} onChange={handleChange} className="form-input" style={{ resize: 'none' }} disabled={isProcessingFile} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px 24px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={isProcessingFile}>
              Comenzar Asistente Manual
              <Sparkles size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
