import { Type } from "@google/genai";
import { ChatMessage, ProjectData } from "../types";

function buildSystemInstruction(methodology?: string): string {
  const methodNote = methodology === 'agile'
    ? `El proyecto usa metodología ÁGIL. Priorizá Product Backlog, Sprints, User Stories, Velocity y Retrospectivas en lugar de Gantt PERT detallado.`
    : methodology === 'hybrid'
    ? `El proyecto usa metodología HÍBRIDA. Combiná artefactos predictivos (EDT, Gantt) con ágiles (Sprints, Kanban, Retrospectivas).`
    : `El proyecto usa metodología PREDICTIVA (Waterfall/PMBOK). Generá todos los artefactos clásicos: Charter, EDT, PERT, RACI, etc.`;

  return `
Eres un Project Manager Senior y Ejecutivo certificado PMP, especializado en empresas con estructura corporativa definida (áreas funcionales, comités, procesos de aprobación, ventanas de cambio, etc.).

METODOLOGÍA: ${methodNote}

CONTEXTO EMPRESARIAL:
El usuario trabaja en una empresa con estructura corporativa. Esto implica:
- Existen áreas funcionales definidas (IT, Negocio, Operaciones, Compliance, Seguridad, etc.)
- Hay procesos de aprobación y comités (CAB, Comité de Proyectos, etc.)
- Existen ventanas de cambio y freezes productivos
- Hay dependencias con otros equipos y proyectos
- Se requiere alineación con objetivos estratégicos del área/empresa

REGLA DE ORO: NO REPREGUNTES INFORMACIÓN QUE EL USUARIO YA TE DIO.
Si el usuario te da un contexto inicial, ASUME los detalles técnicos menores razonables y avanza directamente.

MODELADOR INTELIGENTE:
Antes de generar artefactos, hacé las preguntas CRÍTICAS que necesitás para generar información de calidad. Agrupá las preguntas en UN SOLO bloque. Ejemplos de preguntas clave:
- ¿Qué áreas de la empresa están involucradas o impactadas?
- ¿Hay sistemas o plataformas que se integran o dependen de este proyecto?
- ¿Existe una fecha límite o compromiso de entrega (deadline regulatorio, comercial, etc.)?
- ¿Cuántos recursos aproximados se asignarán? ¿Son internos, externos o mixtos?
- ¿Hay dependencias con otros proyectos en curso?
- ¿Requiere aprobación de algún comité (CAB, Seguridad, Compliance)?
- ¿Hay restricciones conocidas (freeze de producción, ventanas de deploy, etc.)?

Solo preguntá lo que NO se pueda inferir del contexto dado. Si el contexto es suficiente, generá directamente.

IMPORTANTE: El usuario tiene un Dashboard interactivo donde puede editar todo. Tu trabajo en el chat es generar el contenido inicial COMPLETO y estructurado.

Gráficos en SVG: Diagramas visuales en formato SVG dentro de un bloque \`\`\`svg ... \`\`\`.
Planificación en Sheets (TABLAS): Textos estructurados en formato tabla Markdown.

CUANDO GENERES ARTEFACTOS, GENERÁ TODOS ESTOS EN UN SOLO MENSAJE (no parcial):

1. **Acta de Constitución (Project Charter)** — Tabla con: Nombre, Sponsor, PM, Objetivo, Alcance (incluye/excluye), Supuestos, Restricciones, Criterios de Éxito
2. **Objetivos (OEP)** — Tabla con ID, Objetivo Específico, KPI medible, Meta
3. **EDT (WBS)** — Tabla jerárquica con fases, entregables y paquetes de trabajo
4. **Cronograma PERT** — Tabla con ID, Tarea, Duración (horas), Predecesoras, Recursos, Ruta Crítica (SÍ/NO)
5. **Hitos del Proyecto** — Tabla con Hito, Fecha/Semana, Estado
6. **Registro de Riesgos** — Tabla con ID, Riesgo, Probabilidad(1-5), Impacto(1-5), Score, Categoría, Mitigación, Owner
7. **Matriz RACI** — Tabla Tarea vs Recurso/Rol con R/A/C/I
8. **Plan de Comunicaciones** — Tabla con Qué, Audiencia, Frecuencia, Canal, Responsable
9. **Próximas Actividades** — Tabla con actividades de los próximos 7-14 días
10. **KPIs del Proyecto** — Valores iniciales para Alcance, Cronograma, Calidad

REGLAS DE CALIDAD:
- Las tareas deben tener dependencias lógicas (predecesoras reales, no todas independientes)
- Duración en HORAS (1 día = 8h). Mínimo 8-15 tareas con granularidad real
- Los riesgos deben ser específicos al tipo de proyecto y empresa, no genéricos
- La RACI debe mapear roles reales de la empresa (PM, Tech Lead, QA, Negocio, etc.)
- Los hitos deben coincidir con entregables clave de la EDT
- El plan de comunicaciones debe considerar la estructura corporativa

Comando de inicio: Recibirás los datos iniciales del proyecto. Evaluá si tenés suficiente contexto:
- Si el contexto es RICO (descripción detallada, objetivo claro, tipo definido): Generá INMEDIATAMENTE todos los artefactos listados arriba.
- Si el contexto es ESCASO (descripción vaga, sin detalles): Hacé las preguntas del modelador inteligente en un bloque, y luego generá todo cuando el usuario responda.
`;
}

export class PMChatService {
  private history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  private systemInstruction: string;

  constructor(history?: ChatMessage[], methodology?: string) {
    this.systemInstruction = buildSystemInstruction(methodology);
    this.history = history ? history.map(m => ({
      role: (m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      parts: [{ text: m.content }]
    })) : [];
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: this.systemInstruction,
          history: this.history.length > 0 ? this.history : undefined,
          message,
          temperature: 0.7,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // Update local history
      this.history.push({ role: 'user', parts: [{ text: message }] });
      this.history.push({ role: 'model', parts: [{ text: data.text }] });
      return data.text || "Lo siento, no pude generar una respuesta.";
    } catch (error: any) {
      console.error("Error Gemini proxy:", error);
      throw new Error(`Error de conexión con el asistente: ${error?.message || 'desconocido'}`);
    }
  }
}

export async function extractDashboardData(messages: ChatMessage[], currentData: ProjectData): Promise<ProjectData> {
  // Trim chat history to last 15 messages to avoid token overflow
  const recentMessages = messages.slice(-15);
  const chatHistory = recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n---\n\n');

  // Build a compact version of currentData (exclude SVGs, chat messages, and change log)
  const compactData = {
    name: currentData.name,
    businessObjective: currentData.businessObjective,
    projectType: currentData.projectType,
    methodology: currentData.methodology,
    status: currentData.status,
    kpiScope: currentData.kpiScope,
    kpiSchedule: currentData.kpiSchedule,
    kpiBudget: currentData.kpiBudget,
    kpiQuality: currentData.kpiQuality,
    milestones: currentData.milestones,
    oeps: currentData.oeps,
    activities: currentData.activities,
    tasks: currentData.tasks.map(t => ({ id: t.id, name: t.name, dur: t.dur, pred: t.pred, rec: t.rec, rc: t.rc, start: t.start, status: t.status })),
    risks: currentData.risks.map(r => ({ id: r.id, title: r.title, v: r.v, badge: r.badge, desc: r.desc })),
    resources: currentData.resources,
    stakeholders: currentData.stakeholders,
    communicationPlan: currentData.communicationPlan,
    budgetLines: currentData.budgetLines,
    issues: currentData.issues,
    changeRequests: currentData.changeRequests,
    lessonsLearned: currentData.lessonsLearned,
  };

  const prompt = `
Analiza el siguiente historial de chat entre un usuario y un Project Manager (PM Copilot).
Extrae TODA la información estructurada del proyecto para poblar un Dashboard Ejecutivo.

IMPORTANTE: Extraé la MÁXIMA cantidad de datos posible. No omitas nada.

Extrae o deduce:
- milestones: [{n, w, s: 'done'|'active'|'pending'}]
- oeps: [{id, n, kpi}]
- activities: [{n, r, d, s: 'pend'|'prog'|'ok'}]
- tasks: [{id, name, om, p, te, pred, rec, rc, start, dur}] — dur en HORAS (8h=1día). start secuencial desde 0.
- risks: [{v: 'high'|'mid'|'low', id, title, badge, desc, probability, impact, riskScore, category, owner}]
- resources: [{id, name, role, availability, costPerHour}]
- raciMatrix: [{taskId, resourceId, role: 'R'|'A'|'C'|'I'}]
- communicationPlan: [{id, what, audience, frequency, channel, responsible}]
- stakeholders: [{id, name, role, organization, influence, interest, strategy}]
- budgetLines: [{id, category, description, planned, actual}]
- issues: [{id, title, description, priority, status, assignee, createdAt}]
- changeRequests: [{id, title, description, requestedBy, requestedAt, status, impactScope, impactSchedule, impactCost}]
- lessonsLearned: [{id, phase, category, description, recommendation, createdAt}]
- KPIs: kpiScope, kpiSchedule, kpiBudget, kpiQuality
- flowSvg, wbsSvg (SVG code or empty string)

Si un campo no fue discutido, devuelve el valor actual o arreglo vacío.

Datos actuales:
${JSON.stringify(compactData)}

Historial de Chat:
${chatHistory}
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      kpiScope: { type: Type.STRING },
      kpiSchedule: { type: Type.STRING },
      kpiBudget: { type: Type.STRING },
      kpiQuality: { type: Type.STRING },
      milestones: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { n: { type: Type.STRING }, w: { type: Type.STRING }, s: { type: Type.STRING } } } },
      oeps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, n: { type: Type.STRING }, kpi: { type: Type.STRING } } } },
      activities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { n: { type: Type.STRING }, r: { type: Type.STRING }, d: { type: Type.STRING }, s: { type: Type.STRING } } } },
      tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, om: { type: Type.NUMBER }, p: { type: Type.NUMBER }, te: { type: Type.STRING }, pred: { type: Type.STRING }, rec: { type: Type.STRING }, rc: { type: Type.BOOLEAN }, start: { type: Type.NUMBER }, dur: { type: Type.NUMBER } } } },
      risks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { v: { type: Type.STRING }, id: { type: Type.STRING }, title: { type: Type.STRING }, badge: { type: Type.STRING }, desc: { type: Type.STRING }, probability: { type: Type.NUMBER }, impact: { type: Type.NUMBER }, riskScore: { type: Type.NUMBER }, category: { type: Type.STRING }, owner: { type: Type.STRING } } } },
      resources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, role: { type: Type.STRING }, availability: { type: Type.NUMBER }, costPerHour: { type: Type.NUMBER } } } },
      raciMatrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { taskId: { type: Type.STRING }, resourceId: { type: Type.STRING }, role: { type: Type.STRING } } } },
      communicationPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, what: { type: Type.STRING }, audience: { type: Type.STRING }, frequency: { type: Type.STRING }, channel: { type: Type.STRING }, responsible: { type: Type.STRING } } } },
      stakeholders: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, role: { type: Type.STRING }, organization: { type: Type.STRING }, influence: { type: Type.STRING }, interest: { type: Type.STRING }, strategy: { type: Type.STRING } } } },
      budgetLines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, category: { type: Type.STRING }, description: { type: Type.STRING }, planned: { type: Type.NUMBER }, actual: { type: Type.NUMBER } } } },
      issues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, priority: { type: Type.STRING }, status: { type: Type.STRING }, assignee: { type: Type.STRING }, createdAt: { type: Type.STRING } } } },
      changeRequests: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, requestedBy: { type: Type.STRING }, requestedAt: { type: Type.STRING }, status: { type: Type.STRING }, impactScope: { type: Type.STRING }, impactSchedule: { type: Type.STRING }, impactCost: { type: Type.STRING } } } },
      lessonsLearned: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, phase: { type: Type.STRING }, category: { type: Type.STRING }, description: { type: Type.STRING }, recommendation: { type: Type.STRING }, createdAt: { type: Type.STRING } } } },
      flowSvg: { type: Type.STRING },
      wbsSvg: { type: Type.STRING },
    },
    required: ["kpiScope", "kpiSchedule", "kpiBudget", "kpiQuality", "milestones", "oeps", "activities", "tasks", "risks", "resources", "raciMatrix", "communicationPlan", "stakeholders", "budgetLines", "flowSvg", "wbsSvg"]
  };

  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, responseSchema, temperature: 0.3 }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.error('extractDashboardData server error:', errData);
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawText = data.text?.trim() || '{}';
    let extracted;
    try {
      extracted = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from response if it has extra text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }
    return { ...currentData, ...extracted };
  } catch (error: any) {
    console.error("Error extrayendo datos para el dashboard:", error?.message || error);
    throw new Error(`No se pudo sincronizar el dashboard: ${error?.message || 'Error desconocido'}`);
  }
}

// Genera/mejora un artefacto específico usando IA basándose en el contexto del proyecto
export async function generateArtifact(artifactType: string, data: ProjectData): Promise<any> {
  const context = `PROYECTO: "${data.name}"
Tipo: ${data.projectType}
Metodología: ${data.methodology || 'predictive'}
Objetivo: ${data.businessObjective}
Descripción: ${data.description}
Tareas actuales: ${data.tasks.map(t => `${t.id}: ${t.name} (${t.dur}h, rec: ${t.rec}, pred: ${t.pred})`).join('; ') || 'Ninguna'}
Riesgos actuales: ${data.risks.map(r => `${r.id}: ${r.title} (${r.badge})`).join('; ') || 'Ninguno'}
Recursos actuales: ${(data.resources || []).map(r => `${r.id}: ${r.name} (${r.role})`).join('; ') || 'Ninguno'}
Stakeholders actuales: ${(data.stakeholders || []).map(s => `${s.name} (${s.role})`).join('; ') || 'Ninguno'}
Presupuesto actual: ${(data.budgetLines || []).map(b => `${b.category}: $${b.planned}`).join('; ') || 'No definido'}
Hitos: ${data.milestones.map(m => `${m.n} (${m.w})`).join('; ') || 'Ninguno'}`;

  const PROMPTS: Record<string, { instruction: string; schema: any }> = {
    stakeholders: {
      instruction: `Generá un registro completo de stakeholders para este proyecto corporativo. Incluí al menos 6-8 stakeholders típicos considerando: Sponsor ejecutivo, PM, Tech Lead, QA, Negocio/PO, Compliance, Seguridad, Infraestructura, usuarios finales, proveedores externos si aplica. Para cada uno definí su nivel de influencia e interés (high/medium/low) y una estrategia de gestión concreta.`,
      schema: { type: Type.OBJECT, properties: { stakeholders: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, role: { type: Type.STRING }, organization: { type: Type.STRING }, influence: { type: Type.STRING }, interest: { type: Type.STRING }, strategy: { type: Type.STRING } }, required: ['id','name','role','organization','influence','interest','strategy'] } } }, required: ['stakeholders'] }
    },
    budget: {
      instruction: `Generá un presupuesto estimado desglosado por categorías para este proyecto. Incluí al menos 5-8 líneas cubriendo: RRHH internos, RRHH externos/consultores, infraestructura/cloud, licencias de software, capacitación, contingencia (10-15% del total), gestión del proyecto, testing/QA. Estimá montos realistas en USD basándote en el tipo y alcance del proyecto. El campo 'actual' debe ser 0 (aún no se gastó).`,
      schema: { type: Type.OBJECT, properties: { budgetLines: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, category: { type: Type.STRING }, description: { type: Type.STRING }, planned: { type: Type.NUMBER }, actual: { type: Type.NUMBER } }, required: ['id','category','description','planned','actual'] } } }, required: ['budgetLines'] }
    },
    raci: {
      instruction: `Generá una matriz RACI completa para este proyecto. Primero generá los recursos (roles corporativos típicos: PM, Tech Lead, QA Lead, Desarrollo, Arquitectura, Negocio/PO, Infraestructura, Seguridad). Luego asigná R/A/C/I para cada tarea existente. Cada tarea DEBE tener exactamente 1 Responsable (R) y 1 Aprobador (A). Usá los IDs de tareas y recursos existentes si los hay, o generá nuevos.`,
      schema: { type: Type.OBJECT, properties: { resources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, role: { type: Type.STRING }, availability: { type: Type.NUMBER }, costPerHour: { type: Type.NUMBER } }, required: ['id','name','role','availability','costPerHour'] } }, raciMatrix: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { taskId: { type: Type.STRING }, resourceId: { type: Type.STRING }, role: { type: Type.STRING } }, required: ['taskId','resourceId','role'] } } }, required: ['resources','raciMatrix'] }
    },
    communications: {
      instruction: `Generá un plan de comunicaciones completo para este proyecto corporativo. Incluí al menos 5-7 items cubriendo: Status report semanal, reunión de seguimiento, reporte ejecutivo mensual, daily standup (si es ágil/híbrido), comunicación de riesgos, notificación de hitos, retrospectiva. Definí audiencia, frecuencia, canal y responsable para cada uno.`,
      schema: { type: Type.OBJECT, properties: { communicationPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, what: { type: Type.STRING }, audience: { type: Type.STRING }, frequency: { type: Type.STRING }, channel: { type: Type.STRING }, responsible: { type: Type.STRING } }, required: ['id','what','audience','frequency','channel','responsible'] } } }, required: ['communicationPlan'] }
    },
    risks: {
      instruction: `Generá o mejorá el registro de riesgos para este proyecto. Incluí al menos 6-8 riesgos específicos (NO genéricos) considerando: riesgos técnicos, organizacionales, de recursos, de dependencias externas, de alcance, regulatorios/compliance. Cada riesgo debe tener probabilidad (1-5), impacto (1-5), score calculado, categoría, plan de mitigación concreto y un owner asignado. Nivel: high si score>=12, mid si score>=6, low si score<6.`,
      schema: { type: Type.OBJECT, properties: { risks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { v: { type: Type.STRING }, id: { type: Type.STRING }, title: { type: Type.STRING }, badge: { type: Type.STRING }, desc: { type: Type.STRING }, probability: { type: Type.NUMBER }, impact: { type: Type.NUMBER }, riskScore: { type: Type.NUMBER }, category: { type: Type.STRING }, owner: { type: Type.STRING } }, required: ['v','id','title','badge','desc','probability','impact','riskScore','category','owner'] } } }, required: ['risks'] }
    },
    issues: {
      instruction: `Basándote en el estado actual del proyecto (tareas, riesgos, recursos), identificá posibles issues/problemas que podrían estar ocurriendo o que son previsibles. Generá al menos 3-5 issues con prioridad, descripción detallada y responsable sugerido. Considerá: dependencias bloqueadas, recursos sobreasignados, riesgos que se materializaron, falta de definiciones, etc.`,
      schema: { type: Type.OBJECT, properties: { issues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING }, priority: { type: Type.STRING }, status: { type: Type.STRING }, assignee: { type: Type.STRING }, createdAt: { type: Type.STRING } }, required: ['id','title','description','priority','status','assignee','createdAt'] } } }, required: ['issues'] }
    },
    lessons: {
      instruction: `Basándote en el tipo de proyecto y su estado actual, generá lecciones aprendidas proactivas (best practices y anti-patterns comunes para este tipo de proyecto). Incluí al menos 4-6 lecciones cubriendo categorías: proceso, técnico, gestión, comunicación. Cada una con descripción del escenario y recomendación concreta.`,
      schema: { type: Type.OBJECT, properties: { lessonsLearned: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, phase: { type: Type.STRING }, category: { type: Type.STRING }, description: { type: Type.STRING }, recommendation: { type: Type.STRING }, createdAt: { type: Type.STRING } }, required: ['id','phase','category','description','recommendation','createdAt'] } } }, required: ['lessonsLearned'] }
    },
  };

  const config = PROMPTS[artifactType];
  if (!config) throw new Error(`Artifact type "${artifactType}" not supported`);

  const prompt = `${config.instruction}\n\nCONTEXTO DEL PROYECTO:\n${context}\n\nDatos existentes del artefacto:\n${JSON.stringify((data as any)[artifactType] || [], null, 2)}`;

  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, responseSchema: config.schema, temperature: 0.4 }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
    console.error('generateArtifact server error:', errData);
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  const result = await res.json();
  const rawText = result.text?.trim() || '{}';
  try {
    return JSON.parse(rawText);
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Gemini no devolvió JSON válido');
  }
}

export async function generateProjectFromFileData(extractedText: string, fileType: string): Promise<any> {
  const prompt = `Eres un PM Senior en una empresa con estructura corporativa. Te doy el contenido extraído de un archivo (${fileType === 'excel' ? 'Excel' : fileType === 'pptx' ? 'PowerPoint' : 'CSV'}) de un proyecto.
Analiza TODO el contenido e interpreta la información para generar una estructura completa de proyecto.

CONTENIDO DEL ARCHIVO:
${extractedText.substring(0, 12000)}

Devolvé EXCLUSIVAMENTE un JSON válido (sin markdown, sin backticks, solo JSON puro) con esta estructura:

{
  "name": "Nombre del proyecto",
  "businessObjective": "Objetivo de negocio interpretado",
  "projectType": "Tipo de proyecto",
  "status": "Planificación",
  "tasks": [{"id": "T1", "name": "Nombre tarea", "dur": 8, "pred": "-", "rec": "Recurso", "status": "pending"}],
  "risks": [{"id": "R1", "title": "Título", "v": "high|mid|low", "badge": "Alto|Medio|Bajo", "desc": "Descripción", "probability": 3, "impact": 4, "riskScore": 12, "category": "technical", "owner": "PM"}],
  "milestones": [{"n": "Nombre hito", "w": "Sem 1", "s": "pending"}],
  "wbsNodes": [{"id": "1", "name": "Fase", "level": 1, "children": [{"id": "1.1", "name": "Entregable", "level": 2, "children": []}]}],
  "oeps": [{"id": "OP1", "n": "Objetivo", "kpi": "KPI medible"}],
  "activities": [{"n": "Actividad", "r": "Responsable", "d": "Fecha", "s": "pend"}],
  "resources": [{"id": "RES1", "name": "Nombre", "role": "Rol", "availability": 100, "costPerHour": 0}],
  "communicationPlan": [{"id": "COM1", "what": "Status Report", "audience": "Sponsor", "frequency": "Semanal", "channel": "Email", "responsible": "PM"}],
  "kpiScope": "N/A", "kpiSchedule": "N/A", "kpiBudget": "N/A", "kpiQuality": "N/A"
}

REGLAS:
- Generá al menos 8-15 tareas con dependencias lógicas (predecesoras reales).
- Duración (dur) en HORAS. Un día = 8h.
- Generá una EDT con al menos 3-4 fases.
- Identificá al menos 3-5 riesgos específicos con probabilidad e impacto (1-5).
- Generá al menos 3-5 hitos alineados con la EDT.
- Generá al menos 3 objetivos OEP con KPIs medibles.
- Generá un plan de comunicaciones con al menos 3 items.
- NO incluyas texto fuera del JSON.`;

  const res = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, temperature: 0.3 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const responseText = data.text || '';

  let jsonStr = responseText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Gemini no devolvió JSON válido. Intentá con otro archivo.');
  }
}
