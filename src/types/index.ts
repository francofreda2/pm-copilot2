export interface ProjectInput {
  name: string;
  businessObjective: string;
  description: string;
  projectType: string;
  methodology?: 'predictive' | 'agile' | 'hybrid';
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

export interface Task {
  id: string;
  name: string;
  om: number;
  p: number;
  te: string;
  pred: string;
  rec: string;
  rc: boolean;
  start: number;
  dur: number;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  costPlanned?: number;
  costActual?: number;
  actualHours?: number;
  percentComplete?: number;
  baselineStart?: number;
  baselineDur?: number;
  parentId?: string;
}

export interface Risk {
  v: 'high'|'mid'|'low';
  id: string;
  title: string;
  badge: string;
  desc: string;
  status?: 'open' | 'closed';
  probability?: number;
  impact?: number;
  riskScore?: number;
  category?: 'technical' | 'organizational' | 'external' | 'management';
  triggerCondition?: string;
  contingencyPlan?: string;
  owner?: string;
}

export interface Resource {
  id: string;
  name: string;
  role: string;
  availability: number;
  costPerHour: number;
  email?: string;
}

export interface RACIEntry {
  taskId: string;
  resourceId: string;
  role: 'R' | 'A' | 'C' | 'I';
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignee: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  impactScope: string;
  impactSchedule: string;
  impactCost: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface LessonLearned {
  id: string;
  phase: string;
  category: 'process' | 'technical' | 'management' | 'communication';
  description: string;
  recommendation: string;
  createdAt: string;
}

export interface CommunicationItem {
  id: string;
  what: string;
  audience: string;
  frequency: string;
  channel: string;
  responsible: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  organization: string;
  influence: 'high' | 'medium' | 'low';
  interest: 'high' | 'medium' | 'low';
  strategy: string;
  contactInfo?: string;
}

export interface BudgetLine {
  id: string;
  category: string;
  description: string;
  planned: number;
  actual: number;
  taskId?: string;
}

export interface WBSNode {
  id: string;
  name: string;
  owner?: string;
  duration?: string;
  level: number;
  children: WBSNode[];
  collapsed?: boolean;
}

export interface ChangeLogEntry {
  timestamp: string;
  action: string;
  detail: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  user?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  businessObjective: string;
  description: string;
  projectType: string;
  methodology: 'predictive' | 'agile' | 'hybrid';
  status: 'Planificación' | 'En Ejecución' | 'Completado';
  lastUpdated: string;
  projectStartDate: string;
  chatMessages: ChatMessage[];

  kpiScope: string;
  kpiSchedule: string;
  kpiBudget: string;
  kpiQuality: string;

  milestones: Milestone[];
  oeps: OEP[];
  activities: Activity[];
  tasks: Task[];
  risks: Risk[];
  wbsNodes: WBSNode[];
  changeLog: ChangeLogEntry[];

  resources: Resource[];
  raciMatrix: RACIEntry[];
  issues: Issue[];
  changeRequests: ChangeRequest[];
  lessonsLearned: LessonLearned[];
  communicationPlan: CommunicationItem[];
  stakeholders: Stakeholder[];
  budgetLines: BudgetLine[];

  flowSvg: string;
  wbsSvg: string;

  baseline?: {
    savedAt: string;
    tasks: Array<{ id: string; start: number; dur: number }>;
  };
  baselineHistory?: Array<{
    id: string;
    savedAt: string;
    tasks: Array<{ id: string; start: number; dur: number }>;
  }>;

  accentColor?: string;
}

// ── Incidencias ──

export interface IncidentTimelineEntry {
  timestamp: string;
  action: string;
  detail: string;
  user?: string;
}

export interface IncidentData {
  id: string;
  title: string;
  description: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'Detectado' | 'En Análisis' | 'En Resolución' | 'Resuelto' | 'Cerrado';
  category: 'Infraestructura' | 'Aplicación' | 'Base de Datos' | 'Red' | 'Seguridad' | 'Terceros' | 'Otro';
  impactedSystems: string[];
  impactedAreas: string[];
  detectedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  rootCause?: string;
  resolution?: string;
  workaround?: string;
  assignee: string;
  escalatedTo?: string;
  affectedUsers?: string;
  timeline: IncidentTimelineEntry[];
  chatMessages: ChatMessage[];
  lessonsLearned?: string;
  preventiveActions?: string;
  lastUpdated: string;
  relatedIncidents?: string[];
  tags?: string[];
}
