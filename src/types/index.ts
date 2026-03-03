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

export interface SubTask {
  id: string;
  name: string;
  done: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface Milestone {
  n: string;
  w: string;
  s: 'done' | 'active' | 'pending';
  date?: string;
}

export interface OEP { id: string; n: string; kpi: string; }
export interface Activity { n: string; r: string; d: string; s: 'pend' | 'prog' | 'ok'; }

export interface Task {
  id: string;
  name: string;
  description?: string;
  om: number;
  p: number;
  te: string;
  pred: string;
  rec: string;
  rc: boolean;
  start: number;
  dur: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  assigneeId?: string;
  labels?: string[];
  dueDate?: string;
  startDate?: string;
  progress?: number;
  subtasks?: SubTask[];
  column?: 'backlog' | 'in_progress' | 'review' | 'done';
  notes?: string;
}

export interface Risk {
  v: 'high' | 'mid' | 'low';
  id: string;
  title: string;
  badge: string;
  desc: string;
  probability?: number;
  impact?: number;
  owner?: string;
  status?: 'open' | 'mitigated' | 'closed';
}

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

  // Team & Labels
  team: TeamMember[];
  customLabels: Label[];

  // SVGs
  flowSvg: string;
  wbsSvg: string;

  // Project dates
  projectStartDate?: string;
  projectEndDate?: string;
}
