export interface ProjectInput {
  name: string;
  businessObjective: string;
  description: string;
  projectType: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export interface ChatSession {
  id: string;
  createdAt: string;
  title: string;
  messages: ChatMessage[];
}

export interface Milestone { n: string; w: string; s: 'done'|'active'|'pending'; }
export interface OEP { id: string; n: string; kpi: string; }
export interface Activity { n: string; r: string; d: string; s: 'pend'|'prog'|'ok'; }
export interface Task { id: string; name: string; om: number; p: number; te: string; pred: string; rec: string; rc: boolean; start: number; dur: number; status?: 'pending' | 'in_progress' | 'completed'; }
export interface Risk { v: 'high'|'mid'|'low'; id: string; title: string; badge: string; desc: string; }

export interface ProjectData {
  id: string;
  name: string;
  businessObjective: string;
  description: string;
  projectType: string;
  status: 'Planificación' | 'En Ejecución' | 'Completado';
  lastUpdated: string;
  chatMessages: ChatMessage[];
  
  // KPIs
  kpiScope: string;
  kpiSchedule: string;
  kpiBudget: string;
  kpiQuality: string;

  // Structured Artifacts
  milestones: Milestone[];
  oeps: OEP[];
  activities: Activity[];
  tasks: Task[];
  risks: Risk[];
  
  // SVGs
  flowSvg: string;
  wbsSvg: string;
}