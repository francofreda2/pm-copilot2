import React, { useState, useRef, useEffect } from 'react';
import { ProjectData, Task } from '../types';
import { Brain, Send, Loader2, AlertTriangle, TrendingUp, Clock, Target, Zap, RotateCcw, FileText, Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
- Metodología: ${data.methodology || 'predictive'}
- Objetivo: ${data.businessObjective}
- Estado general: ${data.status}
- Total de tareas: ${data.tasks.length}
- Completadas: ${completedTasks.length} | En curso: ${inProgressTasks.length} | Pendientes: ${pendingTasks.length}
- Duración total del proyecto: ${formatDuration(projectDuration)}
- Horas totales de trabajo: ${formatDuration(totalHours)}
- Tareas en ruta crítica: ${criticalTasks.map(t => `${t.id} (${t.name})`).join(', ') || 'Ninguna'}
- Riesgos registrados: ${data.risks.length} (${data.risks.filter(r => r.v === 'high' && r.status !== 'closed').length} altos abiertos)
- Issues abiertos: ${(data.issues || []).filter(i => i.status === 'open' || i.status === 'in_progress').length}
- Solicitudes de cambio pendientes: ${(data.changeRequests || []).filter(c => c.status === 'pending').length}
- Recursos definidos: ${(data.resources || []).length}
- Plan de comunicaciones: ${(data.communicationPlan || []).length} items
- KPIs: Alcance=${data.kpiScope || 'N/A'}, Cronograma=${data.kpiSchedule || 'N/A'}, Calidad=${data.kpiQuality || 'N/A'}

DETALLE DE TAREAS:
${data.tasks.map(t => {
  const cpmNode = nodes.find(n => n.id === t.id);
  return `  ${t.id}: ${t.name} | Dur: ${formatDuration(Number(t.dur))} | Estado: ${t.status || 'pending'} | Pred: ${t.pred || '-'} | Rec: ${t.rec} | Holgura: ${cpmNode ? formatDuration(cpmNode.totalSlack) : 'N/A'} | Crítica: ${cpmNode?.isCritical ? 'SÍ' : 'NO'} | %: ${t.percentComplete ?? 0}% | Hs Reales: ${t.actualHours ?? 0}`;
}).join('\n')}

RIESGOS:
${data.risks.length > 0 ? data.risks.map(r => `  ${r.id}: ${r.title} (${r.badge}${r.status === 'closed' ? ' - CERRADO' : ''}) - P:${r.probability || '?'} I:${r.impact || '?'} Score:${r.riskScore || '?'} - ${r.desc}`).join('\n') : '  Sin riesgos registrados'}

ISSUES ABIERTOS:
${(data.issues || []).filter(i => i.status !== 'closed').map(i => `  ${i.id}: ${i.title} (${i.priority}) - ${i.assignee || 'Sin asignar'}`).join('\n') || '  Sin issues'}`;
}

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: '¿Qué pasa si se atrasa una tarea crítica?', color: '#ef4444' },
  { icon: TrendingUp, label: 'Analizar salud general del proyecto', color: '#3b82f6' },
  { icon: Target, label: 'Sugerir optimizaciones de recursos', color: '#10b981' },
  { icon: FileText, label: 'Generar reporte gerencial semanal', color: '#8b5cf6' },
  { icon: AlertTriangle, label: 'Identificar riesgos no registrados', color: '#f59e0b' },
  { icon: Target, label: 'Revisar matriz RACI y sugerir mejoras', color: '#06b6d4' },
];

export default function PMAdvisor({ data, onUpdate }: Props) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, isSupported: voiceSupported, startListening, stopListening, interimTranscript } = useVoiceInput({
    onTranscript: (text) => setInput(prev => (prev ? prev + ' ' : '') + text),
    onError: (msg) => { setVoiceError(msg); setTimeout(() => setVoiceError(null), 4000); },
  });

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
      const projectContext = buildProjectSummary(data);

      const systemInstruction = `Eres un PM Asesor Senior experto en gestión de proyectos. Tienes acceso al estado actual del proyecto del usuario.

${projectContext}

INSTRUCCIONES:
- Responde en español.
- Sé ejecutivo y concreto. No divagues.
- Ante preguntas "¿Qué pasa si...?", calcula el impacto real usando los datos de las tareas (duración, dependencias, ruta crítica).
- Para análisis de impacto, muestra ANTES y DESPUÉS con números concretos.
- Si hay tareas críticas, menciona específicamente cuáles son y por qué.
- Usa tablas markdown cuando sea útil.
- Al final de tu respuesta agrega una sección "### 💡 Recomendación" con 1-2 acciones concretas.

🚨 INSTRUCCIÓN CRÍTICA DE ACCIÓN 🚨
Si el usuario te solicita EXPLÍCITAMENTE modificar el proyecto (ej. "Agregá esta tarea", "Cambia la fecha", "Añadí este riesgo", "Asignale esto a X"), o si te aprueba una sugerencia que implica cambiar la tabla, DEBES agregar EXCLUYENTEMENTE la siguiente etiqueta técnica al FINAL de tu respuesta, en una nueva línea:
[REQUIRES_UPDATE]

Solo usa esa etiqueta si hay un pedido directo de modificación al plan, cronograma, riesgos, u objetivos.`;

      const history = messages.slice(0, -1).map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          history: history.length > 0 ? history : undefined,
          message: question,
          temperature: 0.5,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data_res = await res.json();
      const rawResponse = data_res.text || 'No se pudo generar una respuesta.';
      const hasUpdateKeyword = rawResponse.includes('[REQUIRES_UPDATE]');
      const cleanResponse = rawResponse.replace('[REQUIRES_UPDATE]', '').trim();
      
      let msgType: 'analysis' | 'suggestion' | 'warning' | 'general' = 'general';
      if (question.toLowerCase().includes('qué pasa si') || question.toLowerCase().includes('impacto')) msgType = 'warning';
      else if (question.toLowerCase().includes('sugerir') || question.toLowerCase().includes('optimiz') || question.toLowerCase().includes('mejora')) msgType = 'suggestion';
      else if (question.toLowerCase().includes('anali') || question.toLowerCase().includes('estado') || question.toLowerCase().includes('salud')) msgType = 'analysis';

      const advisorMsg: AdvisorMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'advisor', 
        content: cleanResponse, 
        type: msgType, 
        requiresUpdate: hasUpdateKeyword 
      } as AdvisorMessage & { requiresUpdate?: boolean };
      
      setMessages(prev => [...prev, advisorMsg]);
    } catch (err: any) {
      setError(err.message || 'Error al consultar al asesor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = async (msgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // Construct a fake chat history to send to the extraction function
      const history = messages.map(m => ({ role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', content: m.content, id: m.id }));
      const { extractDashboardData } = await import('../services/geminiService');
      const updatedData = await extractDashboardData(history, data);
      onUpdate(updatedData);
      
      // Remove the action button from the message by clearing the flag
      setMessages(messages.map(m => m.id === msgId ? { ...m, requiresUpdate: false } as any : m));
    } catch (err: any) {
      setError(err.message || "Error al intentar aplicar los cambios.");
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
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>Análisis de impacto · Escenarios What-If · Acciones Directas</p>
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
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 8 }}>¿Qué te gustaría analizar o accionar?</h4>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', textAlign: 'center', maxWidth: 400, marginBottom: 24, lineHeight: 1.6 }}>
              Haceme preguntas o <strong style={{color:'var(--primary-600)'}}>pedime directamente que modifique el plan, agregue tareas o riesgos</strong> y lo aplicaré en tu Dashboard.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%', maxWidth: 600 }}>
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
                background: msg.type === 'warning' ? 'var(--warning-light)' : msg.type === 'analysis' ? 'var(--primary-50)' : msg.type === 'suggestion' ? 'var(--success-light)' : 'var(--bg-card)',
                border: `1.5px solid ${msg.type === 'warning' ? 'var(--warning)' : msg.type === 'analysis' ? 'var(--primary-200)' : msg.type === 'suggestion' ? 'var(--success)' : 'var(--border-light)'}`,
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
                <div className="advisor-markdown" style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--neutral-800)' }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-900)', margin: '20px 0 10px', borderBottom: '2px solid var(--border-light)', paddingBottom: 8 }}>{children}</h1>,
                      h2: ({children}) => <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-900)', margin: '18px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</h2>,
                      h3: ({children}) => <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-900)', margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>{children}</h3>,
                      h4: ({children}) => <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-800)', margin: '12px 0 6px' }}>{children}</h4>,
                      p: ({children}) => <p style={{ margin: '0 0 10px', lineHeight: 1.7 }}>{children}</p>,
                      ul: ({children}) => <ul style={{ margin: '8px 0 12px', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ul>,
                      ol: ({children}) => <ol style={{ margin: '8px 0 12px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</ol>,
                      li: ({children, ordered, index}: any) => (
                        <li style={{ paddingLeft: 14, borderLeft: '2.5px solid var(--primary-200)', fontSize: 13, lineHeight: 1.6, color: 'var(--neutral-700)' }}>
                          {children}
                        </li>
                      ),
                      strong: ({children}) => <strong style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>{children}</strong>,
                      em: ({children}) => <em style={{ fontStyle: 'italic', color: 'var(--neutral-600)' }}>{children}</em>,
                      blockquote: ({children}) => (
                        <blockquote style={{ margin: '12px 0', padding: '10px 16px', borderLeft: '3px solid var(--primary-400)', background: 'var(--primary-50)', borderRadius: '0 8px 8px 0', fontSize: 13, color: 'var(--neutral-700)' }}>
                          {children}
                        </blockquote>
                      ),
                      table: ({children}) => (
                        <div style={{ overflow: 'auto', margin: '12px 0', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>{children}</table>
                        </div>
                      ),
                      thead: ({children}) => <thead style={{ background: 'var(--neutral-50)' }}>{children}</thead>,
                      th: ({children}) => <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid var(--border-light)' }}>{children}</th>,
                      td: ({children}) => <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--neutral-700)', borderBottom: '1px solid var(--border-subtle, var(--border-light))' }}>{children}</td>,
                      code({node, inline, className, children, ...props}: any) {
                        return !inline ? (
                          <pre style={{ background: 'var(--neutral-900)', color: '#e2e8f0', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 11, margin: '12px 0', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                            <code className={className} {...props}>{children}</code>
                          </pre>
                        ) : (
                          <code style={{ background: 'var(--neutral-100)', color: 'var(--primary-700)', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }} {...props}>{children}</code>
                        );
                      },
                      hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '16px 0' }} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {(msg as any).requiresUpdate && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--border-light)' }}>
                    <button 
                      onClick={() => handleApplyChanges(msg.id)}
                      disabled={isLoading}
                      className="btn btn-primary" 
                      style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-600)' }}>
                      <Zap size={14} /> ⚡ Aplicar a mi Proyecto
                    </button>
                    <p style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 8, marginBottom: 0 }}>
                      Al hacer clic, el Asesor leerá la conversación y actualizará tu Dashboard con estos cambios.
                    </p>
                  </div>
                )}
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
        {voiceError && (
          <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--error, #ef4444)', textAlign: 'center' }}>{voiceError}</div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={isListening && interimTranscript ? input + interimTranscript : input}
              onChange={e => setInput(e.target.value)}
              placeholder={isListening ? '🎤 Escuchando...' : 'Ej: Agregá la tarea T5 con 8 horas, predecesora T3'}
              className="form-input"
              style={{ paddingRight: voiceSupported ? 72 : 48 }}
              disabled={isLoading}
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                title={isListening ? 'Detener grabación' : 'Comando de voz'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: isListening ? 'var(--error, #ef4444)' : 'var(--neutral-200)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isListening ? '#fff' : 'var(--neutral-600)',
                  transition: 'all 0.2s',
                  animation: isListening ? 'pulse 1.2s infinite' : 'none',
                }}
              >
                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
            )}
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
