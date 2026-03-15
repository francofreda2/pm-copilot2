import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, ProjectData } from "../types";

export class PMChatService {
  private chat: any;

  constructor(history?: ChatMessage[]) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'AI Studio Free Tier') {
      throw new Error("Por favor, configura una API Key válida en las variables de entorno (VITE_GEMINI_API_KEY).");
    }

    const ai = new GoogleGenAI({ apiKey });

    const SYSTEM_INSTRUCTION = `
Eres un Project Manager Senior y Ejecutivo. Tu objetivo es guiar al usuario para completar un dashboard de gestión de proyectos de forma iterativa, pero SIN FRUSTRARLO.

REGLA DE ORO: NO REPREGUNTES INFORMACIÓN QUE EL USUARIO YA TE DIO.
Si el usuario te da un contexto inicial, ASUME los detalles técnicos menores razonables y avanza directamente a generar el entregable. Si falta un dato crítico, haz UNA sola pregunta directa. No pidas confirmación para cada pequeño paso. Sé ejecutivo, proactivo y resolutivo.

IMPORTANTE: El usuario ahora tiene un Dashboard interactivo donde puede editar todo. Tu trabajo en el chat es generar el contenido inicial estructurado para que luego él lo modifique en el Dashboard.

Gráficos en SVG: Todo lo que sean representaciones visuales, mapas o diagramas (como el Diagrama de Red o el Roadmap) debes generarlos escribiendo el código fuente en formato SVG dentro de un bloque de código con el lenguaje "svg" (\`\`\`svg ... \`\`\`), para que yo pueda renderizarlo.

Planificación en Sheets (TABLAS): Todo lo que sean textos estructurados, listados, estimaciones, cronogramas y matrices (Acta de Constitución, Objetivos, EDT, PERT, RACI, etc.) debes generarlo ESTRICTAMENTE en formato de tabla Markdown compatible para copiar y pegar en Excel o Google Sheets. NO uses listas con viñetas para el Acta ni para los Objetivos, usa Tablas con columnas claras (Ej. Categoría | Descripción).

Estructura del Proyecto a Desarrollar (Nuestra Hoja de Ruta):

FASE 1: INICIACIÓN Y VISTA MACRO
1. Acta de Constitución del Proyecto (Project Charter): Documento con el propósito, objetivos de negocio, requisitos de alto nivel y presupuesto preliminar. (EN FORMATO TABLA).
2. Plan a Alto Nivel (Roadmap / Diagrama de Fases): Esquema visual a alto nivel en código SVG que distribuya las fases principales del proyecto en el tiempo, marcando hitos clave.

FASE 2: PLANIFICACIÓN DETALLADA (Modelo OEP: Objetivos, Entregables, Plan)
3. Objetivos: Definición de los objetivos del proyecto (OP) claros y medibles. (EN FORMATO TABLA).
4. EDT (Estructura de Descomposición del Trabajo / WBS): Desglose jerárquico en entregables y paquetes de trabajo, presentado en formato Tabla.
5. Diagrama de Red y Dependencias: Identificación de la secuencia lógica (predecesoras/sucesoras). Genera el diagrama visual en código SVG.
6. Cronograma de Alto Nivel: Resumen de fases, hitos y fechas clave en formato Tabla.
7. Cronograma Detallado y Estimaciones (PERT): Tabla estructurada para Sheet que sirva de base para un Gantt. Debe incluir: ID de tarea, Nombre, Duración (O, M, P, Esperada), Inicio, Fin, Predecesoras, Recursos y marcar cuál es la Ruta Crítica.
8. Matriz de Responsabilidades (RACI): Matriz asignando roles (Responsable, Autoridad, Consultado, Informado) en formato Tabla.

FASE 3: EJECUCIÓN Y CONTROL
9. Mapa de Próximas Actividades: Una tabla clara con las actividades inmediatas (próximos 7-14 días), responsables y estado esperado.
10. Lista de Pendientes (Issue Log): Formato en Tabla para registrar problemas, fecha de alta, estado, responsables y prioridad.
11. Solicitudes de Cambio: Plantilla tabular para documentar impactos en alcance, tiempo o costo ante modificaciones.
12. Informe Gerencial de Desempeño: Dashboard en texto (o tabla) detallando avance programado vs. ejecutado y desviaciones.

Comando de inicio: Recibirás los datos iniciales del proyecto. Preséntate brevemente como PM, confirma que has entendido el contexto, y genera INMEDIATAMENTE el paso 1 de la FASE 1 (Acta de Constitución del Proyecto EN TABLA) basado en esa información. No hagas preguntas en este primer mensaje, solo entrega el Acta y pregunta si está bien para avanzar a la Fase 2.
`;

    const formattedHistory = history ? history.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })) : undefined;

    this.chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: formattedHistory
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const response = await this.chat.sendMessage({ message });
      return response.text || "Lo siento, no pude generar una respuesta.";
    } catch (error) {
      console.error("Error al comunicarse con Gemini:", error);
      throw new Error("Error de conexión con el asistente.");
    }
  }
}

export async function extractDashboardData(messages: ChatMessage[], currentData: ProjectData): Promise<ProjectData> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'AI Studio Free Tier') {
    throw new Error("API Key no configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const chatHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n---\n\n');
  
  const prompt = `
Analiza el siguiente historial de chat entre un usuario y un Project Manager (PM Copilot).
Tu objetivo es extraer la información estructurada del proyecto para poblar un Dashboard Ejecutivo interactivo.

Debes extraer o deducir los siguientes arreglos de datos basándote en la conversación:
- milestones: Hitos principales (n: nombre, w: semana/fecha, s: 'done'|'active'|'pending').
- oeps: Objetivos del proyecto (id: ej. OP1, n: nombre, kpi: métrica clave).
- activities: Próximas actividades (n: nombre, r: responsable, d: día/fecha, s: 'pend'|'prog'|'ok').
- tasks: Tareas de la EDT/Cronograma (id: ej. T1, name: nombre, om: optimista, p: pesimista, te: tiempo esperado, pred: predecesoras, rec: recursos, rc: ruta crítica boolean, start: semana inicio, dur: duración semanas).
- risks: Riesgos identificados (v: 'high'|'mid'|'low', id: ej. R01, title: título, badge: Alto/Medio/Bajo, desc: descripción y mitigación).

Además, deduce 4 KPIs cortos (máximo 3-4 palabras cada uno):
- kpiScope: Estado del alcance (ej. "Estable", "Riesgo de Creep").
- kpiSchedule: Estado del cronograma (ej. "En Tiempo", "Atrasado 2 días").
- kpiBudget: Estado del presupuesto (ej. "Dentro del límite").
- kpiQuality: Índice de calidad o riesgos (ej. "Alta", "Riesgos críticos").

Extrae también el código SVG puro (sin comillas invertidas de markdown) si se generaron diagramas de flujo (flowSvg) o WBS (wbsSvg). Si no hay, déjalos vacíos.

Si un campo aún no ha sido discutido, devuelve el valor actual proporcionado o un arreglo vacío.

Datos actuales:
${JSON.stringify(currentData, null, 2)}

Historial de Chat:
${chatHistory}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            kpiScope: { type: Type.STRING },
            kpiSchedule: { type: Type.STRING },
            kpiBudget: { type: Type.STRING },
            kpiQuality: { type: Type.STRING },
            milestones: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { n: { type: Type.STRING }, w: { type: Type.STRING }, s: { type: Type.STRING } } }
            },
            oeps: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, n: { type: Type.STRING }, kpi: { type: Type.STRING } } }
            },
            activities: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { n: { type: Type.STRING }, r: { type: Type.STRING }, d: { type: Type.STRING }, s: { type: Type.STRING } } }
            },
            tasks: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, om: { type: Type.NUMBER }, p: { type: Type.NUMBER }, te: { type: Type.STRING }, pred: { type: Type.STRING }, rec: { type: Type.STRING }, rc: { type: Type.BOOLEAN }, start: { type: Type.NUMBER }, dur: { type: Type.NUMBER } } }
            },
            risks: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { v: { type: Type.STRING }, id: { type: Type.STRING }, title: { type: Type.STRING }, badge: { type: Type.STRING }, desc: { type: Type.STRING } } }
            },
            flowSvg: { type: Type.STRING },
            wbsSvg: { type: Type.STRING }
          },
          required: ["kpiScope", "kpiSchedule", "kpiBudget", "kpiQuality", "milestones", "oeps", "activities", "tasks", "risks", "flowSvg", "wbsSvg"]
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("Respuesta vacía");
    
    const extracted = JSON.parse(jsonStr);
    
    return {
      ...currentData,
      ...extracted
    };
  } catch (error) {
    console.error("Error extrayendo datos para el dashboard:", error);
    throw new Error("No se pudo sincronizar el dashboard con el chat.");
  }
}

