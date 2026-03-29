import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, Bot, User, Zap, Clipboard, AlertTriangle } from 'lucide-react';
import { IncidentData, ChatMessage } from '../types';

interface Props {
  incident: IncidentData;
  onUpdate: (data: IncidentData) => void;
}

const QUICK_PROMPTS = [
  { icon: '📋', label: 'Pegar log/chat de la incidencia', prompt: 'Te voy a pegar el chat/log de la incidencia para que lo ordenes:' },
  { icon: '🔍', label: 'Analizar causa raíz', prompt: 'Analizá la información disponible y sugerí posibles causas raíz de esta incidencia.' },
  { icon: '📊', label: 'Generar timeline', prompt: 'Generá un timeline detallado de la incidencia con todos los eventos que tenemos.' },
  { icon: '📝', label: 'Redactar RCA', prompt: 'Redactá un Root Cause Analysis (RCA) formal de esta incidencia.' },
  { icon: '🛡️', label: 'Acciones preventivas', prompt: 'Sugerí acciones preventivas para evitar que esta incidencia se repita.' },
  { icon: '📧', label: 'Comunicación a management', prompt: 'Redactá un comunicado ejecutivo sobre esta incidencia para enviar a management.' },
];

function buildIncidentSystemInstruction(): string {
  return `Eres un Incident Manager Senior especializado en gestión de incidencias IT en empresas con estructura corporativa.

TU ROL PRINCIPAL: Recibir información desordenada (chats, logs, dumps de conversaciones, emails) y ESTRUCTURARLA automáticamente en datos de incidencia.

CUANDO EL USUARIO PEGUE TEXTO DESORDENADO (chats, logs, etc.):
1. Extraé automáticamente: título, descripción, severidad, sistemas impactados, áreas afectadas, timeline de eventos, causa raíz probable, workaround aplicado, resolución
2. Presentá la información estructurada en tablas markdown
3. Sugerí campos que faltan completar
4. Identificá patrones y correlaciones

CUANDO EL USUARIO PREGUNTE O PIDA ANÁLISIS:
- Sé ejecutivo y concreto
- Usá tablas markdown para estructurar
- Incluí siempre una sección "### 💡 Recomendación"

FORMATO DE TIMELINE: Siempre en tabla con columnas: Hora | Evento | Responsable | Detalle

SEVERIDADES:
- P1: Servicio caído, impacto masivo en producción
- P2: Degradación severa, funcionalidad crítica afectada
- P3: Impacto moderado, workaround disponible
- P4: Impacto menor, no urgente

🚨 INSTRUCCIÓN CRÍTICA: Si del texto extraés datos estructurables (título, severidad, sistemas, timeline, etc.), agregá al FINAL de tu respuesta en una nueva línea:
[INCIDENT_UPDATE]

Seguido de un bloque JSON con los campos que pudiste extraer:
\`\`\`json
{
  "title": "...",
  "severity": "P1|P2|P3|P4",
  "category": "Infraestructura|Aplicación|Base de Datos|Red|Seguridad|Terceros|Otro",
  "impactedSystems": ["..."],
  "impactedAreas": ["..."],
  "rootCause": "...",
  "workaround": "...",
  "resolution": "...",
  "affectedUsers": "...",
  "timeline": [{"timestamp": "HH:MM", "action": "...", "detail": "...", "user": "..."}],
  "tags": ["..."]
}
\`\`\`
Solo incluí los campos que pudiste extraer con confianza. No inventes datos.`;
}

export default function IncidentChat({ incident, onUpdate }: Props) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = incident.chatMessages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    onUpdate({ ...incident, chatMessages: newMessages, lastUpdated: new Date().toISOString() });
    setInput('');

    try {
      const history = newMessages.slice(0, -1).map(m => ({
        role: (m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: m.content }]
      }));

      const incidentContext = `INCIDENCIA ACTUAL:
- ID: ${incident.id}
- Título: ${incident.title}
- Severidad: ${incident.severity}
- Estado: ${incident.status}
- Categoría: ${incident.category}
- Sistemas: ${incident.impactedSystems.join(', ') || 'No definidos'}
- Áreas: ${incident.impactedAreas.join(', ') || 'No definidas'}
- Detectada: ${incident.detectedAt}
- Causa raíz: ${incident.rootCause || 'Pendiente'}
- Workaround: ${incident.workaround || 'No definido'}
- Resolución: ${incident.resolution || 'Pendiente'}
- Timeline: ${incident.timeline.length} eventos registrados

MENSAJE DEL USUARIO:
${text.trim()}`;

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: buildIncidentSystemInstruction(),
          history: history.length > 0 ? history : undefined,
          message: incidentContext,
          temperature: 0.4,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let responseText = data.text || 'No se pudo generar una respuesta.';

      // Parse structured update if present
      let updatedIncident = { ...incident, chatMessages: newMessages };
      if (responseText.includes('[INCIDENT_UPDATE]')) {
        const parts = responseText.split('[INCIDENT_UPDATE]');
        responseText = parts[0].trim();
        try {
          const jsonMatch = parts[1].match(/```json\s*([\s\S]*?)\s*```/) || parts[1].match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            if (extracted.title && incident.title === 'Nueva Incidencia') updatedIncident.title = extracted.title;
            if (extracted.severity) updatedIncident.severity = extracted.severity;
            if (extracted.category) updatedIncident.category = extracted.category;
            if (extracted.impactedSystems?.length) updatedIncident.impactedSystems = extracted.impactedSystems;
            if (extracted.impactedAreas?.length) updatedIncident.impactedAreas = extracted.impactedAreas;
            if (extracted.rootCause) updatedIncident.rootCause = extracted.rootCause;
            if (extracted.workaround) updatedIncident.workaround = extracted.workaround;
            if (extracted.resolution) updatedIncident.resolution = extracted.resolution;
            if (extracted.affectedUsers) updatedIncident.affectedUsers = extracted.affectedUsers;
            if (extracted.tags?.length) updatedIncident.tags = extracted.tags;
            if (extracted.timeline?.length) {
              const newEntries = extracted.timeline.map((t: any) => ({
                timestamp: t.timestamp || new Date().toISOString(),
                action: t.action || 'Evento',
                detail: t.detail || '',
                user: t.user,
              }));
              updatedIncident.timeline = [...updatedIncident.timeline, ...newEntries];
            }
          }
        } catch { /* ignore parse errors */ }
      }

      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: responseText };
      updatedIncident.chatMessages = [...newMessages, modelMsg];
      updatedIncident.lastUpdated = new Date().toISOString();
      onUpdate(updatedIncident);
    } catch (err: any) {
      setError(err.message || 'Error al consultar al asistente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then(text => {
      if (text.trim()) setInput(text);
    }).catch(() => {});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 400 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={48} style={{ color: 'var(--neutral-200)', marginBottom: 16 }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 8 }}>Gestión Agéntica de Incidencias</h4>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', textAlign: 'center', maxWidth: 480, marginBottom: 24, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--primary-600)' }}>Pegá chats, logs, emails o cualquier texto</strong> y el asistente lo va a estructurar automáticamente en datos de incidencia (timeline, causa raíz, sistemas impactados, etc.)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%', maxWidth: 600 }}>
              {QUICK_PROMPTS.map((qp, i) => (
                <button key={i} onClick={() => sendMessage(qp.prompt)} disabled={isLoading}
                  className="card card-interactive" style={{ padding: '12px 14px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 8, border: '1.5px solid var(--border-light)', cursor: isLoading ? 'wait' : 'pointer' }}>
                  <span style={{ fontSize: 16 }}>{qp.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--neutral-700)', lineHeight: 1.4, fontWeight: 500 }}>{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="animate-fade-in" style={{ display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div className={msg.role === 'user' ? 'chat-avatar chat-avatar-user' : 'chat-avatar chat-avatar-bot'} style={{ width: 28, height: 28, flexShrink: 0 }}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'} style={{ maxWidth: '85%' }}>
              {msg.role === 'user' ? (
                <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13, lineHeight: 1.6 }}>{msg.content.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content}</p>
              ) : (
                <div className="prose" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    table({ children }) { return <div style={{ overflow: 'auto', margin: '12px 0' }}><table className="table" style={{ minWidth: 300 }}>{children}</table></div>; },
                    th({ children }) { return <th style={{ padding: '8px 12px', background: 'var(--neutral-50)', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--neutral-500)', borderBottom: '2px solid var(--border-light)' }}>{children}</th>; },
                    td({ children }) { return <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--neutral-700)', borderBottom: '1px solid var(--border-subtle)' }}>{children}</td>; },
                  }}>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef3c7', borderRadius: 'var(--radius-lg)', border: '1.5px solid #fde68a' }}>
            <Loader2 size={16} className="animate-spin" style={{ color: '#d97706' }} />
            <span style={{ fontSize: 13, color: '#92400e' }}>Analizando y estructurando la información...</span>
          </div>
        )}
        {error && <div className="error-box">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 800, margin: '0 auto' }}>
          <button type="button" onClick={handlePaste} className="btn btn-secondary" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }} title="Pegar desde portapapeles">
            <Clipboard size={14} /> Pegar
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            placeholder="Pegá el chat/log de la incidencia o escribí tu consulta..."
            className="form-input"
            style={{ flex: 1, resize: 'none', minHeight: 42, maxHeight: 120, fontSize: 13 }}
            rows={1}
            disabled={isLoading}
          />
          <button type="submit" disabled={!input.trim() || isLoading} className="btn btn-primary" style={{ flexShrink: 0 }}>
            <Send size={16} />
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: 'var(--neutral-400)' }}>
          Pegá chats de Teams/Slack/WhatsApp y el asistente los estructura automáticamente
        </div>
      </div>
    </div>
  );
}
