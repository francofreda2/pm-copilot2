import React, { useState, useRef, useCallback } from 'react';
import { ProjectData, Task, Risk, WBSNode, Milestone, OEP, Activity } from '../types';
import { Upload, FileSpreadsheet, Presentation, FileText, Loader2, CheckCircle, AlertTriangle, X, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  data: ProjectData;
  onUpdate: (data: ProjectData) => void;
  onClose: () => void;
}
import { FileType, processFileContent } from '../utils/fileUtils';

type ProcessingStep = 'idle' | 'reading' | 'parsing' | 'analyzing' | 'populating' | 'done' | 'error';

const STEP_LABELS: Record<ProcessingStep, string> = {
  idle: '',
  reading: 'Leyendo archivo...',
  parsing: 'Extrayendo contenido...',
  analyzing: 'Gemini está analizando y generando estructura del proyecto...',
  populating: 'Cargando datos al proyecto...',
  done: '¡Proyecto generado exitosamente!',
  error: 'Error en el procesamiento',
};

export default function FileUploadProcessor({ data, onUpdate, onClose }: Props) {
  const [step, setStep] = useState<ProcessingStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedPreview, setExtractedPreview] = useState<string>('');
  const [generatedSummary, setGeneratedSummary] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    setGeneratedSummary('');

    // 1 & 2. Read & Parse
    setStep('parsing');
    let extractedText = '';
    let fileType: FileType = 'unknown';

    try {
      const result = await processFileContent(file);
      extractedText = result.text;
      fileType = result.type;
    } catch (e: any) {
      setError(e.message);
      setStep('error');
      return;
    }

    setExtractedPreview(extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''));

    // 3. Send to Gemini
    setStep('analyzing');
    try {
      const { generateProjectFromFileData } = await import('../services/geminiService');
      const parsed = await generateProjectFromFileData(extractedText, fileType);

      // 4. Populate project
      setStep('populating');

      const newTasks: Task[] = (parsed.tasks || []).map((t: any, i: number) => ({
        id: t.id || `T${i + 1}`,
        name: t.name || 'Sin nombre',
        om: t.om || 1,
        p: t.p || Number(t.dur) || 8,
        te: t.te || String(Number(t.dur) || 8),
        pred: t.pred || '-',
        rec: t.rec || 'TBD',
        rc: t.rc !== false,
        start: 0,
        dur: Number(t.dur) || 8,
        status: t.status || 'pending',
      }));

      const newRisks: Risk[] = (parsed.risks || []).map((r: any) => ({
        id: r.id || 'R1',
        title: r.title || 'Riesgo',
        v: r.v || 'mid',
        badge: r.badge || 'Medio',
        desc: r.desc || '',
      }));

      const newWBS: WBSNode[] = (parsed.wbsNodes || []).map((n: any) => mapWBSNode(n));

      const newMilestones: Milestone[] = (parsed.milestones || []).map((m: any) => ({
        n: m.n || 'Hito',
        w: m.w || 'TBD',
        s: m.s || 'pending',
      }));

      const newOeps: OEP[] = (parsed.oeps || []).map((o: any) => ({
        id: o.id || 'OP1',
        n: o.n || 'Objetivo',
        kpi: o.kpi || 'TBD',
      }));

      const newActivities: Activity[] = (parsed.activities || []).map((a: any) => ({
        n: a.n || 'Actividad',
        r: a.r || 'TBD',
        d: a.d || 'TBD',
        s: a.s || 'pend',
      }));

      const updatedData: ProjectData = {
        ...data,
        name: parsed.name || data.name,
        businessObjective: parsed.businessObjective || data.businessObjective,
        projectType: parsed.projectType || data.projectType,
        status: parsed.status || data.status,
        tasks: newTasks,
        risks: newRisks,
        wbsNodes: newWBS,
        milestones: newMilestones,
        oeps: newOeps,
        activities: newActivities,
        changeLog: data.changeLog || [],
        projectStartDate: data.projectStartDate || new Date().toISOString().split('T')[0],
        kpiScope: parsed.kpiScope || data.kpiScope,
        kpiSchedule: parsed.kpiSchedule || data.kpiSchedule,
        kpiBudget: parsed.kpiBudget || data.kpiBudget,
        kpiQuality: parsed.kpiQuality || data.kpiQuality,
        flowSvg: parsed.flowSvg || data.flowSvg,
        wbsSvg: parsed.wbsSvg || data.wbsSvg,
        lastUpdated: new Date().toISOString(),
      };

      onUpdate(updatedData);

      setGeneratedSummary(`Generado: ${newTasks.length} tareas, ${newRisks.length} riesgos, ${newWBS.length} fases EDT, ${newMilestones.length} hitos, ${newOeps.length} objetivos`);
      setStep('done');

    } catch (e: any) {
      setError(`Error de Gemini: ${e.message}`);
      setStep('error');
    }
  }, [data, onUpdate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'analyzing') onClose(); }}
    >
      <div className="card animate-fade-in" style={{ width: 560, maxHeight: '85vh', overflow: 'auto', padding: 0, position: 'relative' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Importar Proyecto desde Archivo</h3>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>Excel · PowerPoint · CSV → Proyecto completo</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {step === 'idle' && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--primary-500)' : 'var(--neutral-200)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 40,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'var(--primary-50)' : 'var(--neutral-50)',
                  transition: 'all 0.2s',
                  marginBottom: 20,
                }}
              >
                <Upload size={40} style={{ color: isDragging ? 'var(--primary-500)' : 'var(--neutral-300)', marginBottom: 16 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 6 }}>
                  {isDragging ? 'Soltá el archivo acá' : 'Arrastrá un archivo o hacé click para seleccionar'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>
                  Formatos soportados: .xlsx, .xls, .pptx, .csv
                </p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.pptx,.csv" onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>

              {/* Format cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { icon: FileSpreadsheet, label: 'Excel', desc: 'Cronograma, tareas, presupuesto', color: '#10b981' },
                  { icon: Presentation, label: 'PowerPoint', desc: 'Presentación del proyecto', color: '#3b82f6' },
                  { icon: FileText, label: 'CSV', desc: 'Datos tabulares exportados', color: '#8b5cf6' },
                ].map((fmt, i) => (
                  <div key={i} style={{ padding: 14, background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <fmt.icon size={20} style={{ color: fmt.color, marginBottom: 6 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-700)' }}>{fmt.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--neutral-400)', marginTop: 2 }}>{fmt.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Processing state */}
          {step !== 'idle' && step !== 'done' && step !== 'error' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary-500)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-700)' }}>{STEP_LABELS[step]}</span>
              </div>

              {fileName && (
                <div style={{ padding: '8px 14px', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FileSpreadsheet size={14} style={{ color: 'var(--primary-500)' }} />
                  <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--neutral-600)' }}>{fileName}</span>
                </div>
              )}

              {extractedPreview && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--neutral-400)', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase' }}>Preview del contenido</div>
                  <pre style={{ fontSize: 10, color: 'var(--neutral-500)', background: 'var(--neutral-50)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {extractedPreview}
                  </pre>
                </div>
              )}

              {/* Progress steps */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                {(['reading', 'parsing', 'analyzing', 'populating'] as ProcessingStep[]).map((s, i) => (
                  <div key={s} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: step === s ? 'var(--primary-500)' : (['reading', 'parsing', 'analyzing', 'populating'].indexOf(step) > i ? '#10b981' : 'var(--neutral-200)'),
                    transition: 'all 0.3s',
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} style={{ color: '#10b981' }} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-800)', marginBottom: 8 }}>¡Proyecto generado!</h4>
              <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 6 }}>{generatedSummary}</p>
              <p style={{ fontSize: 11, color: 'var(--neutral-400)' }}>Revisá las pestañas Overview, EDT, Gantt, Tasks y Risks para ver todo lo generado.</p>
              <button onClick={onClose} className="btn btn-primary" style={{ marginTop: 20 }}>
                Ver Proyecto
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={28} style={{ color: '#ef4444' }} />
              </div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Error</h4>
              <p style={{ fontSize: 13, color: '#7f1d1d', marginBottom: 20 }}>{error}</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={() => { setStep('idle'); setError(null); }} className="btn btn-primary">Reintentar</button>
                <button onClick={onClose} className="btn btn-secondary">Cerrar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mapWBSNode(n: any): WBSNode {
  return {
    id: n.id || String(Math.random()).slice(2, 8),
    name: n.name || 'Sin nombre',
    level: n.level ?? 1,
    owner: n.owner,
    duration: n.duration,
    children: (n.children || []).map((c: any) => mapWBSNode(c)),
    collapsed: false,
  };
}
