import React, { useState, useRef } from 'react';
import { ProjectInput } from '../types';
import { Rocket, Target, FileText, Briefcase, Upload, Loader2, Sparkles, LayoutTemplate, Mic, MicOff, X, CheckCircle2, File } from 'lucide-react';
import { processFileContent } from '../utils/fileUtils';
import { generateProjectFromFileData } from '../services/geminiService';
import { useToast } from './ToastContext';
import { useVoiceInput } from '../hooks/useVoiceInput';

/* ── Templates ── */
const PROJECT_TEMPLATES: Array<{ icon: string; label: string; type: string; objective: string; description: string }> = [
  {
    icon: '💻', label: 'Software', type: 'Desarrollo de Software',
    objective: 'Desarrollar y lanzar la aplicación en el plazo acordado cumpliendo los requerimientos funcionales.',
    description: 'Proyecto de desarrollo de software que incluye análisis, diseño, desarrollo, testing y despliegue.',
  },
  {
    icon: '📢', label: 'Marketing', type: 'Marketing / Campaña',
    objective: 'Aumentar el reconocimiento de marca y generar leads calificados mediante una campaña omnicanal.',
    description: 'Campaña de marketing digital con estrategia de contenidos, redes sociales, email y paid media.',
  },
  {
    icon: '🏗️', label: 'Infraestructura', type: 'Infraestructura IT',
    objective: 'Migrar la infraestructura on-premise a la nube reduciendo costos operativos en un 20%.',
    description: 'Migración cloud con fases de auditoría, planificación, ejecución, pruebas y go-live.',
  },
  {
    icon: '🚀', label: 'Lanzamiento', type: 'Lanzamiento de Producto',
    objective: 'Lanzar el producto al mercado objetivo alcanzando los primeros 100 clientes en el primer trimestre.',
    description: 'Plan de lanzamiento de producto que cubre investigación de mercado, desarrollo, GTM y post-lanzamiento.',
  },
];

/* ── Voice button sub-component ── */
function VoiceBtn({
  isListening, isSupported, onStart, onStop, disabled,
}: { isListening: boolean; isSupported: boolean; onStart: () => void; onStop: () => void; disabled: boolean }) {
  if (!isSupported) return null;
  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      disabled={disabled}
      title={isListening ? 'Detener grabación' : 'Dictar con voz'}
      style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: isListening ? 'var(--error, #ef4444)' : 'var(--neutral-200)',
        color: isListening ? '#fff' : 'var(--neutral-500)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        animation: isListening ? 'pulse 1.2s infinite' : 'none',
        flexShrink: 0,
      }}
    >
      {isListening ? <MicOff size={13} /> : <Mic size={13} />}
    </button>
  );
}

interface Props {
  onSubmit: (data: ProjectInput) => void;
  onImport: (parsedData: any) => void;
}

type QueuedFile = { file: File; status: 'pending' | 'reading' | 'done' | 'error'; error?: string };
type ActiveVoiceField = 'name' | 'businessObjective' | 'description' | null;

export default function InitialForm({ onSubmit, onImport }: Props) {
  const [formData, setFormData] = useState<ProjectInput>({
    name: '', businessObjective: '', description: '', projectType: 'Desarrollo de Software', methodology: 'predictive',
  });

  /* ── File queue (multi-file) ── */
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  /* ── Active voice field tracker ── */
  const [activeVoiceField, setActiveVoiceField] = useState<ActiveVoiceField>(null);

  const appendToField = (field: 'name' | 'businessObjective' | 'description', text: string) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] ? prev[field] + ' ' : '') + text }));
  };

  /* Three separate voice hooks – one per field */
  const voiceName = useVoiceInput({
    onTranscript: t => appendToField('name', t),
    onEnd: () => setActiveVoiceField(null),
    onError: () => setActiveVoiceField(null),
  });
  const voiceObjective = useVoiceInput({
    onTranscript: t => appendToField('businessObjective', t),
    onEnd: () => setActiveVoiceField(null),
    onError: () => setActiveVoiceField(null),
  });
  const voiceDescription = useVoiceInput({
    onTranscript: t => appendToField('description', t),
    onEnd: () => setActiveVoiceField(null),
    onError: () => setActiveVoiceField(null),
  });

  const startVoice = (field: ActiveVoiceField) => {
    // Stop any currently listening hook first
    voiceName.stopListening();
    voiceObjective.stopListening();
    voiceDescription.stopListening();
    setActiveVoiceField(field);
    if (field === 'name') voiceName.startListening();
    else if (field === 'businessObjective') voiceObjective.startListening();
    else if (field === 'description') voiceDescription.startListening();
  };

  const stopVoice = (field: ActiveVoiceField) => {
    if (field === 'name') voiceName.stopListening();
    else if (field === 'businessObjective') voiceObjective.stopListening();
    else if (field === 'description') voiceDescription.stopListening();
    setActiveVoiceField(null);
  };

  const voiceSupported = voiceName.isSupported;

  /* ── Handlers ── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.businessObjective && formData.description) onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addFiles = (files: FileList | File[]) => {
    const allowed = Array.from(files).filter(f =>
      /\.(xlsx|xls|pptx|csv|pdf|docx|txt)$/i.test(f.name)
    );
    if (allowed.length === 0) {
      setUploadError('Solo se aceptan archivos .pptx, .xlsx, .xls, .csv, .pdf, .docx o .txt');
      return;
    }
    setUploadError('');
    setFileQueue(prev => {
      const existing = new Set(prev.map(q => q.file.name));
      const newOnes = allowed.filter(f => !existing.has(f.name));
      return [...prev, ...newOnes.map(f => ({ file: f, status: 'pending' as const }))];
    });
  };

  const removeFile = (name: string) => {
    setFileQueue(prev => prev.filter(q => q.file.name !== name));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isProcessingFiles) addFiles(e.dataTransfer.files);
  };

  const processAllFiles = async () => {
    if (fileQueue.length === 0 || isProcessingFiles) return;
    setIsProcessingFiles(true);
    setUploadError('');

    try {
      // Read all files and concatenate their text
      const textParts: string[] = [];
      let combinedType = 'mixed';

      for (let i = 0; i < fileQueue.length; i++) {
        const qf = fileQueue[i];
        setFileQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'reading' } : f));
        setUploadStatus(`Leyendo "${qf.file.name}" (${i + 1}/${fileQueue.length})...`);
        try {
          const { text, type } = await processFileContent(qf.file);
          textParts.push(`\n\n=== ARCHIVO ${i + 1}: ${qf.file.name} ===\n${text}`);
          if (i === 0) combinedType = type;
          setFileQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
        } catch (err: any) {
          setFileQueue(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message } : f));
          // Continue with other files
        }
      }

      if (textParts.length === 0) throw new Error('No se pudo leer ningún archivo');

      const combinedText = textParts.join('\n');
      const fileCount = textParts.length;
      setUploadStatus(
        fileCount > 1
          ? `Gemini está analizando ${fileCount} archivos y generando el proyecto...`
          : 'Gemini está analizando el documento y generando el proyecto...'
      );

      const parsedData = await generateProjectFromFileData(combinedText, combinedType);
      addToast(`Proyecto generado desde ${fileCount} archivo${fileCount > 1 ? 's' : ''}`, 'success');
      onImport(parsedData);
    } catch (e: any) {
      setUploadError(e.message || 'Error al procesar los archivos');
      addToast(e.message || 'Hubo un error al procesar los archivos', 'error');
    } finally {
      setIsProcessingFiles(false);
      setUploadStatus('');
    }
  };

  const fileStatusIcon = (status: QueuedFile['status']) => {
    if (status === 'reading') return <Loader2 size={13} className="animate-spin" style={{ color: 'var(--primary-500)' }} />;
    if (status === 'done') return <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />;
    if (status === 'error') return <X size={13} style={{ color: 'var(--error, #ef4444)' }} />;
    return <File size={13} style={{ color: 'var(--neutral-400)' }} />;
  };

  const isListeningFor = (field: ActiveVoiceField) => activeVoiceField === field;

  return (
    <div className="animate-fade-in-scale" style={{ maxWidth: 820, margin: '40px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--brand-navy), var(--primary-800))', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(15,23,42,0.15)' }}>
          <Rocket size={32} color="#fff" />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--neutral-900)', letterSpacing: '-1px', marginBottom: 12 }}>Bienvenido a PM Copilot</h1>
        <p style={{ color: 'var(--neutral-600)', fontSize: 16, lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
          Subí uno o varios documentos para que Gemini construya el plan completo, o completá el contexto manualmente.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>

        {/* ── Multi-file Upload Zone ── */}
        <div className="card card-lift" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
          {/* Drop area */}
          <div
            style={{
              border: isDragging ? '2px dashed var(--primary-500)' : '2px dashed var(--border-light)',
              borderRadius: 12, background: isDragging ? 'var(--primary-50)' : 'var(--neutral-50)',
              padding: '28px 24px', textAlign: 'center', cursor: isProcessingFiles ? 'wait' : 'pointer',
              transition: 'all 0.2s', marginBottom: fileQueue.length > 0 ? 16 : 0,
            }}
            onDragOver={e => { e.preventDefault(); if (!isProcessingFiles) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => { if (!isProcessingFiles) fileInputRef.current?.click(); }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Upload size={20} style={{ color: 'var(--primary-600)' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-800)', marginBottom: 4 }}>
              Soltá archivos acá o hacé clic para seleccionar
            </p>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 10 }}>
              Podés cargar <strong>múltiples archivos</strong> — PowerPoint, Excel, CSV, PDF, Word, TXT
            </p>
            <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontFamily: 'monospace' }}>
              .pptx · .xlsx · .xls · .csv · .pdf · .docx · .txt
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pptx,.csv,.pdf,.docx,.txt"
              multiple
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
          </div>

          {/* File queue list */}
          {fileQueue.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-600)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                {fileQueue.length} archivo{fileQueue.length > 1 ? 's' : ''} en cola
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fileQueue.map(qf => (
                  <div key={qf.file.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                    fontSize: 13,
                  }}>
                    {fileStatusIcon(qf.status)}
                    <span style={{ flex: 1, color: 'var(--neutral-800)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {qf.file.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--neutral-400)', flexShrink: 0 }}>
                      {(qf.file.size / 1024).toFixed(0)} KB
                    </span>
                    {qf.status === 'error' && (
                      <span style={{ fontSize: 11, color: 'var(--error, #ef4444)', maxWidth: 160, flexShrink: 0 }}>{qf.error}</span>
                    )}
                    {!isProcessingFiles && (
                      <button
                        type="button"
                        onClick={() => removeFile(qf.file.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: 2, display: 'flex' }}
                        title="Quitar"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Status while processing */}
              {isProcessingFiles && uploadStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--primary-50)', border: '1px solid var(--primary-200)' }}>
                  <Loader2 size={15} className="animate-spin" style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--primary-800)', fontWeight: 500 }}>{uploadStatus}</span>
                </div>
              )}

              {/* Process button */}
              {!isProcessingFiles && (
                <button
                  type="button"
                  onClick={processAllFiles}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Sparkles size={16} />
                  Generar proyecto desde {fileQueue.length} archivo{fileQueue.length > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {uploadError && (
            <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              {uploadError}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: 1 }}>O CREAR MANUALMENTE</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

        {/* ── Templates ── */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <LayoutTemplate size={15} style={{ color: 'var(--primary-500)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-700)' }}>Partir desde una plantilla</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {PROJECT_TEMPLATES.map(tpl => {
              const active = formData.projectType === tpl.type && formData.description === tpl.description;
              return (
                <button
                  key={tpl.label}
                  type="button"
                  disabled={isProcessingFiles}
                  onClick={() => setFormData(prev => ({ ...prev, businessObjective: tpl.objective, description: tpl.description, projectType: tpl.type }))}
                  style={{
                    padding: '12px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                    border: active ? '2px solid var(--primary-500)' : '1px solid var(--border-light)',
                    background: active ? 'var(--primary-50)' : 'var(--neutral-50)',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{tpl.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-800)' }}>{tpl.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Manual Form with Voice ── */}
        <div className="card card-lift" style={{ padding: 32 }}>
          {voiceSupported && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '8px 14px', borderRadius: 8, background: 'var(--primary-50)', border: '1px solid var(--primary-100)', fontSize: 12, color: 'var(--primary-700)' }}>
              <Mic size={13} />
              <span>Podés dictar cada campo con el botón de micrófono</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>

            {/* Name + Project Type */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 20 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="name" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={14} style={{ color: 'var(--neutral-400)' }} />
                  Nombre del Proyecto
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" id="name" name="name" required
                    placeholder={isListeningFor('name') ? '🎤 Dictando...' : 'Ej: Migración Cloud 2025'}
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    style={{ paddingRight: voiceSupported ? 44 : undefined }}
                    disabled={isProcessingFiles}
                  />
                  <VoiceBtn
                    isListening={isListeningFor('name')}
                    isSupported={voiceSupported}
                    onStart={() => startVoice('name')}
                    onStop={() => stopVoice('name')}
                    disabled={isProcessingFiles}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="projectType" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} style={{ color: 'var(--neutral-400)' }} />
                  Tipo de Proyecto
                </label>
                <select id="projectType" name="projectType" value={formData.projectType} onChange={handleChange} className="form-input form-select" disabled={isProcessingFiles}>
                  <option value="Desarrollo de Software">Desarrollo de Software</option>
                  <option value="Infraestructura IT">Infraestructura IT</option>
                  <option value="Marketing / Campaña">Marketing / Campaña</option>
                  <option value="Mejora de Procesos">Mejora de Procesos</option>
                  <option value="Lanzamiento de Producto">Lanzamiento de Producto</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Methodology */}
            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Target size={14} style={{ color: 'var(--neutral-400)' }} />
                Metodología
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { value: 'predictive', label: 'Predictiva', desc: 'Waterfall / PMBOK', icon: '📊' },
                  { value: 'agile', label: 'Ágil', desc: 'Scrum / Kanban', icon: '🚀' },
                  { value: 'hybrid', label: 'Híbrida', desc: 'Predictiva + Ágil', icon: '🔀' },
                ].map(m => {
                  const active = formData.methodology === m.value;
                  return (
                    <button key={m.value} type="button" disabled={isProcessingFiles}
                      onClick={() => setFormData(prev => ({ ...prev, methodology: m.value as any }))}
                      style={{ padding: '12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', border: active ? '2px solid var(--primary-500)' : '1px solid var(--border-light)', background: active ? 'var(--primary-50)' : 'var(--neutral-50)' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-800)' }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--neutral-500)' }}>{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Business Objective */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label htmlFor="businessObjective" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={14} style={{ color: 'var(--neutral-400)' }} />
                Objetivo Principal (Negocio)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" id="businessObjective" name="businessObjective" required
                  placeholder={isListeningFor('businessObjective') ? '🎤 Dictando...' : 'Ej: Reducir costos operativos en un 15% para el Q3.'}
                  value={formData.businessObjective}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingRight: voiceSupported ? 44 : undefined }}
                  disabled={isProcessingFiles}
                />
                <VoiceBtn
                  isListening={isListeningFor('businessObjective')}
                  isSupported={voiceSupported}
                  onStart={() => startVoice('businessObjective')}
                  onStop={() => stopVoice('businessObjective')}
                  disabled={isProcessingFiles}
                />
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label htmlFor="description" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} style={{ color: 'var(--neutral-400)' }} />
                Descripción Breve
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="description" name="description" required rows={3}
                  placeholder={isListeningFor('description') ? '🎤 Dictando...' : 'Describe brevemente de qué trata el proyecto...'}
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input"
                  style={{ resize: 'none', paddingRight: voiceSupported ? 44 : undefined }}
                  disabled={isProcessingFiles}
                />
                <VoiceBtn
                  isListening={isListeningFor('description')}
                  isSupported={voiceSupported}
                  onStart={() => startVoice('description')}
                  onStop={() => stopVoice('description')}
                  disabled={isProcessingFiles}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px 24px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={isProcessingFiles}
            >
              Comenzar Asistente
              <Sparkles size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
