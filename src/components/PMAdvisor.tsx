import React, { useState, useRef, useEffect } from 'react';
import { ProjectData, Task } from '../types';
import { Brain, Send, Loader2, AlertTriangle, TrendingUp, Clock, Target, Zap, RotateCcw, FileText } from 'lucide-react';

interface Props {
  data: ProjectData;
  onUpdate: (data: ProjectData) => void;
}

interface AdvisorMessage {
  id: string;
  role: 'user' | 'advisor';
  content: string;
  type?: 'analysis' | 'suggestion' | 'warning' | 'general';
}

/* ── Helpers ── */
function formatDuration(hours: number): string {
  if (hours <= 0) return '0h';
  const d = Math.floor(hours / 8);
  const h = hours % 8;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

function parseDependency(predStr: string) {
  const match = predStr.match(/^([a-zA-Z0-9.-]+)(FS|SS|FF|SF)?([+-]\d+(?:\.\d+)?)?$/i);
  if (match) return { id: match[1], type: (match[2] || 'FS').toUpperCase(), lag: parseFloat(match[3] || '0') };
  return { id: predStr.replace(/[^0-9a-zA-Z.-]/g, ''), type: 'FS', lag: 0 };
}

function quickCPM(tasks: Task[]) {
  const nodes = new Map<string, any>();
  tasks.forEach(t => nodes.set(t.id, { ...t, dur: Number(t.dur) || 0, ES: 0, EF: 0, LS: 0, LF: 0, totalSlack: 0, isCritical: false, preds: [], succs: [] }));
  tasks.forEach(t => {
    const node = nodes.get(t.id);
    if (!t.pred) return;
    t.pred.split(',').map(p => p.trim()).filter(p => p && p !== '-').forEach(pStr => {
      const dep = parseDependency(pStr);
      if (nodes.has(dep.id)) { node.preds.push(dep); nodes.get(dep.id).succs.push({ id: t.id, type: dep.type, lag: dep.lag }); }
    });
  });
  const topoOrder: string[] = [];
  const inDegree = new Map<string, number>();
  nodes.forEach((node, id) => inDegree.set(id, node.preds.length));
  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });
  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);
    nodes.get(u).succs.forEach((v: any) => { inDegree.set(v.id, inDegree.get(v.id)! - 1); if (inDegree.get(v.id) === 0) queue.push(v.id); });
  }
  if (topoOrder.length < nodes.size) nodes.forEach((_, id) => { if (!topoOrder.includes(id)) topoOrder.push(id); });
  topoOrder.forEach(id => {
    const node = nodes.get(id);
    let maxES = 0;
    node.preds.forEach((p: any) => {
      const pN = nodes.get(p.id);
      let es = 0;
      if (p.type === 'FS') es = pN.EF + p.lag;
      else if (p.type === 'SS') es = pN.ES + p.lag;
      else if (p.type === 'FF') es = pN.EF + p.lag - node.dur;
      else if (p.type === 'SF') es = pN.ES + p.lag - node.dur;
      maxES = Math.max(maxES, es);
    });
    node.ES = maxES; node.EF = node.ES + node.dur;
  });
  let projectDuration = 0;
  nodes.forEach(node => { projectDuration = Math.max(projectDuration, node.EF); });
  [...topoOrder].reverse().forEach(id => {
    const node = nodes.get(id);
    if (node.succs.length > 0) {
      let minLF = projectDuration;
      node.succs.forEach((s: any) => { const sN = nodes.get(s.id); let lf = projectDuration; if (s.type === 'FS') lf = sN.LS - s.lag; minLF = Math.min(minLF, lf); });
      node.LF = minLF; node.LS = node.LF - node.dur;
    } else { node.LF = projectDuration; node.LS = node.LF - node.dur; }
  });
  nodes.forEach(node => { node.totalSlack = node.LS - node.ES; node.isCritical = node.totalSlack <= 0; });
  return { nodes: Array.from(nodes.values()), projectDuration };
}

function buildProjectSummary(data: ProjectData) {
  const { nodes, projectDuration } = quickCPM(data.tasks);
  const criticalTasks = nodes.filter(t => t.isCritical);
  const completedTasks = data.tasks.filter(t => t.status === 'completed');
  const inProgressTasks = data.tasks.filter(t => t.status === 'in_progress');
  const pendingTasks = data.tasks.filter(t => t.status === 'pending' || !t.status);
  const totalHours = data.tasks.reduce((sum, t) => sum + (Number(t.dur) || 0), 0);

  return `ESTADO ACTUAL DEL PROYECTO "${data.name}":
- Tipo: ${data.projectType}
- Objetivo: ${data.businessObjective}
- Estado general: ${data.status}
- Total de tareas: ${data.tasks.length}
- Completadas: ${completedTasks.length} | En curso: ${inProgressTasks.length} | Pendientes: ${pendingTasks.length}
- Duración total del proyecto: ${formatDuration(projectDuration)}
- Horas totales de trabajo: ${formatDuration(totalHours)}
- Tareas en ruta crítica: ${criticalTasks.map(t => `${t.id} (${t.name})`).join(', ') || 'Ninguna'}
- Riesgos registrados: ${data.risks.length} (${data.risks.filter(r => r.v === 'high').length} altos)
- KPIs: Alcance=${data.kpiScope || 'N/A'}, Cronograma=${data.kpiSchedule || 'N/A'}, Presupuesto=${data.kpiBudget || 'N/A'}

DETALLE DE TAREAS:
${data.tasks.map(t => {
  const cpmNode = nodes.find(n => n.id === t.id);
  return `  ${t.id}: ${t.name} | Dur: ${formatDuration(Number(t.dur))} | Estado: ${t.status || 'pending'} | Pred: ${t.pred || '-'} | Rec: ${t.rec} | Holgura: ${cpmNode ? formatDuration(cpmNode.totalSlack) : 'N/A'} | Crítica: ${cpmNode?.isCritical ? 'SÍ' : 'NO'}`;
}).join('\n')}

RIESGOS:
${data.risks.length > 0 ? data.risks.map(r => `  ${r.id}: ${r.title} (${r.badge}) - ${r.desc}`).join('\n') : '  Sin riesgos registrados'}`;
}

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: '¿Qué pasa si se atrasa una tarea crítica?', color: '#ef4444' },
  { icon: TrendingUp, label: 'Analizar salud general del proyecto', color: '#3b82f6' },
  { icon: Target, label: 'Sugerir optimizaciones de recursos', color: '#10b981' },
  { icon: FileText, label: 'Generar reporte gerencial semanal', color: '#8b5cf6' },
];

export default function PMAdvisor({ data, onUpdate }: Props) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const askAdvisor = async (question: string) => {
    if (!question.trim()) return;
    setError(null);
    setIsLoading(true);

    const userMsg: AdvisorMessage = { id: Date.now().toString(), role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key no configurada');

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const projectContext = buildProjectSummary(data);

      const prompt = `Eres un PM Asesor Senior experto en gestión de proyectos. Tienes acceso al estado actual del proyecto del usuario.

${projectContext}

INSTRUCCIONES:
- Responde en español.
- Sé ejecutivo y concreto. No divagues.
- Ante preguntas "¿Qué pasa si...?", calcula el impacto real usando los datos de las tareas (duración, dependencias, ruta crítica).
- Para análisis de impacto, muestra ANTES y DESPUÉS con números concretos.
- Si hay tareas críticas, menciona específicamente cuáles son y por qué.
- Usa tablas markdown cuando sea útil.
- Al final de tu respuesta agrega una sección "### 💡 Recomendación" con 1-2 acciones concretas.

PREGUNTA DEL PM: ${question}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 1024 },
          httpOptions: { timeout: 60000 },
          temperature: 0.5,
        }
      });

      const responseText = response.text || 'No se pudo generar una respuesta.';
      
      let msgType: 'analysis' | 'suggestion' | 'warning' | 'general' = 'general';
      if (question.toLowerCase().includes('qué pasa si') || question.toLowerCase().includes('impacto')) msgType = 'warning';
      else if (question.toLowerCase().includes('sugerir') || question.toLowerCase().includes('optimiz') || question.toLowerCase().includes('mejora')) msgType = 'suggestion';
      else if (question.toLowerCase().includes('anali') || question.toLowerCase().includes('estado') || question.toLowerCase().includes('salud')) msgType = 'analysis';

      const advisorMsg: AdvisorMessage = { id: (Date.now() + 1).toString(), role: 'advisor', content: responseText, type: msgType };
      setMessages(prev => [...prev, advisorMsg]);
    } catch (err: any) {
      setError(err.message || 'Error al consultar al asesor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askAdvisor(input);
  };

  const { projectDuration } = quickCPM(data.tasks);
  const completedCount = data.tasks.filter(t => t.status === 'completed').length;
  const progressPct = data.tasks.length > 0 ? Math.round((completedCount / data.tasks.length) * 100) : 0;

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', minHeight: 500 }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <Brain size={22} color="#a5b4fc" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>PM Asesor Inteligente</h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>Análisis de impacto · Escenarios What-If</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} color="#a5b4fc" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e0e7ff', fontFamily: "'JetBrains Mono', monospace" }}>{formatDuration(projectDuration)}</span>
            </div>
            <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} color={progressPct >= 75 ? '#34d399' : progressPct >= 40 ? '#fbbf24' : '#f87171'} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e0e7ff', fontFamily: "'JetBrains Mono', monospace" }}>{progressPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={48} style={{ color: 'var(--neutral-200)', marginBottom: 16 }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 8 }}>¿Qué te gustaría analizar?</h4>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', textAlign: 'center', maxWidth: 400, marginBottom: 24, lineHeight: 1.6 }}>
              Preguntá sobre impacto de cambios, escenarios hipotéticos, optimizaciones o el estado general del proyecto.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 500 }}>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => askAdvisor(action.label)}
                  className="card card-interactive"
                  style={{ padding: '14px 16px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10, border: '1.5px solid var(--border-light)', cursor: isLoading ? 'wait' : 'pointer' }}
                  disabled={isLoading}
                >
                  <action.icon size={16} style={{ color: action.color, flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--neutral-700)', lineHeight: 1.4, fontWeight: 500 }}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="animate-fade-in">
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <div className="chat-bubble-user" style={{ maxWidth: '80%' }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{msg.content}</p>
                </div>
              </div>
            ) : (
              <div style={{
                background: msg.type === 'warning' ? '#fefce8' : msg.type === 'analysis' ? '#eff6ff' : msg.type === 'suggestion' ? '#f0fdf4' : '#fff',
                border: `1.5px solid ${msg.type === 'warning' ? '#fde68a' : msg.type === 'analysis' ? '#bfdbfe' : msg.type === 'suggestion' ? '#bbf7d0' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                maxWidth: '95%',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Brain size={16} style={{ color: msg.type === 'warning' ? '#d97706' : msg.type === 'analysis' ? '#2563eb' : msg.type === 'suggestion' ? '#16a34a' : 'var(--primary-600)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase',
                    color: msg.type === 'warning' ? '#92400e' : msg.type === 'analysis' ? '#1e40af' : msg.type === 'suggestion' ? '#166534' : 'var(--neutral-500)'
                  }}>
                    {msg.type === 'warning' ? 'Análisis de Impacto' : msg.type === 'analysis' ? 'Análisis de Estado' : msg.type === 'suggestion' ? 'Recomendaciones' : 'PM Asesor'}
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--neutral-800)' }}>
                  {msg.content.split('\n').map((line, i) => {
                    if (line.startsWith('### ')) return <h4 key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-900)', margin: '16px 0 8px' }}>{line.replace(/^###\s/, '').replace(/^[💡⚠🔴🟡🟢📊]+\s?/, '')}</h4>;
                    if (line.startsWith('## ')) return <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-900)', margin: '16px 0 8px' }}>{line.replace(/^##\s/, '')}</h3>;
                    if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--border-light)', marginBottom: 6 }}>{line.replace(/^[-*]\s/, '')}</div>;
                    if (line.startsWith('|')) return <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, whiteSpace: 'pre' }}>{line}</div>;
                    if (line.trim() === '') return <div key={i} style={{ height: 8 }} />;
                    return <p key={i} style={{ margin: '0 0 6px' }}>{line}</p>;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--primary-100)' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary-500)' }} />
            <span style={{ fontSize: 13, color: 'var(--primary-700)' }}>Analizando proyecto y calculando impacto...</span>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ej: ¿Qué pasa si aumento la duración de T3 a 16 horas?"
              className="form-input"
              style={{ paddingRight: 48 }}
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={!input.trim() || isLoading} className="btn btn-primary" style={{ flexShrink: 0 }}>
            <Send size={16} />
          </button>
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="btn btn-ghost" title="Limpiar conversación" style={{ flexShrink: 0, padding: '10px' }}>
              <RotateCcw size={16} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
