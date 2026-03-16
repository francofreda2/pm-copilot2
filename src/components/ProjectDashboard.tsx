// PM Copilot Dashboard v2
import React, { useState, useCallback } from "react";
import { ProjectData, Task, Milestone, OEP, Activity, Risk } from "../types";
import { RefreshCw, Edit2, Check, X, Upload } from "lucide-react";
import WBSEditor from "./WBSEditor";
import GanttChart from "./GanttChart";
import WBSChart from './WBSChart';
import PMAdvisor from "./PMAdvisor";
import ProjectHealth from "./ProjectHealth";
import FileUploadProcessor from "./FileUploadProcessor";
import { exportToJiraCSV, exportToICS } from "../utils/exportUtils";
import BurndownChart from "./BurndownChart";
import ResourceAllocation from "./ResourceAllocation";

interface Props {
  data: ProjectData;
  onUpdate: (data: ProjectData) => void;
  onSync: () => void;
  isSyncing: boolean;
}

const BAR_COLORS = ["#1d4ed8","#0369a1","#059669","#7c3aed","#b45309","#dc2626","#0891b2","#65a30d"];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const S: Record<string, any> = {
  shell: { display:"grid", gridTemplateColumns:"240px 1fr", minHeight:"100vh", fontFamily:"'Inter', system-ui, sans-serif", background:"var(--bg-app)" },
  sidebar: { background:"var(--brand-navy)", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" },
  logoBox: { padding:"24px 24px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)" },
  logoTitle: { fontFamily:"'Inter', sans-serif", fontWeight:800, fontSize:20, color:"#fff", letterSpacing:"-0.5px", display:"flex", alignItems:"center", gap:12 },
  logoIcon: { width:28, height:28, borderRadius:8, background:"var(--primary-600)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", boxShadow:"0 2px 8px rgba(37,99,235,0.4)" },
  logoSub: { display: "none" }, // Hidden in Payway design
  navSection: { padding:"16px 16px", flex:1 },
  navLabel: { fontSize:10, letterSpacing:1.5, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", fontWeight:600, marginBottom:12, paddingLeft:8 },
  navItem: (active: boolean) => ({
    display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:8, fontSize:14, cursor:"pointer", marginBottom:4,
    color: active ? "#ffffff" : "rgba(255,255,255,0.65)", 
    background: active ? "var(--primary-600)" : "transparent",
    fontWeight: active ? 600 : 500, transition:"all .2s ease", border:"none", width:"100%", textAlign:"left"
  }),
  sideFooter: { padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.05)", fontSize:11, color:"rgba(255,255,255,0.5)" },
  main: { padding:"0", display:"flex", flexDirection:"column", height:"100vh", overflowY:"hidden" },
  hdrWrap: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", background:"#fff", borderBottom:"1px solid var(--border-light)", height:"64px" },
  hdrLeft: { display:"flex", alignItems:"center", gap:16 },
  hdrH1: { fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:700, color:"var(--neutral-900)", margin:0 },
  hdrSub: { display: "none" },
  badgeRow: { display:"flex", gap:12, alignItems:"center" },
  badge: (variant: string) => {
    const v: any = { 
      warn:{bg:"var(--warning-light)",c:"var(--warning)",bd:"#fcd34d"}, 
      ok:{bg:"var(--success-light)",c:"var(--success)",bd:"#6ee7b7"}, 
      blue:{bg:"var(--primary-50)",c:"var(--primary-700)",bd:"var(--primary-200)"} 
    }[variant]||{bg:"var(--neutral-100)",c:"var(--neutral-600)",bd:"var(--neutral-200)"};
    return { background:v.bg, color:v.c, border:`1px solid ${v.bd}`, borderRadius:6, padding:"6px 12px", fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6 };
  },
  card: { background:"#fff", border:"1px solid var(--border-light)", borderRadius:"var(--radius-md)", padding:"24px", boxShadow:"var(--shadow-sm)" },
  sectionTitle: { fontFamily:"'Inter', sans-serif", fontSize:15, fontWeight:700, color:"var(--neutral-900)", display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  divider: { display: "none" },
  kpiGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 },
  kpiCard: (c: string) => ({ background:"#fff", border:"1px solid var(--border-light)", borderRadius:"var(--radius-md)", padding:"20px", position:"relative", boxShadow:"var(--shadow-sm)" }),
  kpiStripe: (c: string) => ({ display: "none" }), // Removed top stripe for cleaner look
  kpiTag: { fontSize:13, color:"var(--neutral-600)", fontWeight:500, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" },
  kpiVal: { fontSize:24, fontWeight:700, color:"var(--neutral-900)", lineHeight:1.2 },
  kpiDesc: { fontSize:13, color:"var(--success)", fontWeight:500, marginTop:8 },
  twoCol: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 },
  msRow: { display:"flex", alignItems:"flex-start", paddingBottom:8, flexWrap: "wrap", gap: "10px 0" },
  msItem: { display:"flex", flexDirection:"column", alignItems:"center", flex:1, position:"relative", minWidth: "80px" },
  msDot: (state: string) => {
    const s: any={done:{bg:"var(--success)",c:"#fff",bd:"var(--success)"},active:{bg:"var(--primary-600)",c:"#fff",bd:"var(--primary-600)",shadow:"0 0 0 4px rgba(37,99,235,0.15)"},pending:{bg:"#fff",c:"var(--neutral-400)",bd:"var(--neutral-300)"}}[state] || {bg:"#fff",c:"var(--neutral-400)",bd:"var(--neutral-300)"};
    return { width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, background:s.bg, color:s.c, border:`2px solid ${s.bd}`, boxShadow:s.shadow||"none", position:"relative", zIndex:1 };
  },
  msLine: (state: string) => ({ position:"absolute", top:12, left:"50%", right:"-50%", height:2, zIndex:0, background:state==="done"?"var(--success)":state==="active"?"linear-gradient(90deg,var(--success),var(--primary-600))":"var(--neutral-200)" }),
  msLabel: { fontSize:11, color:"var(--neutral-700)", marginTop:8, textAlign:"center", maxWidth:80, fontWeight:500 },
  msWeek: { fontSize:10, color:"var(--neutral-500)", marginTop:2 },
  oepItem: { display:"grid", gridTemplateColumns:"auto 1fr auto", gap:12, alignItems:"center", padding:"12px 16px", borderRadius:8, background:"#fff", border:"1px solid var(--border-light)", marginBottom:8, boxShadow:"var(--shadow-xs)" },
  oepId: { width:32, height:32, borderRadius:8, background:"var(--primary-50)", color:"var(--primary-700)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 },
  oepName: { fontSize:14, fontWeight:600, color:"var(--neutral-900)" },
  oepKpi: { fontSize:12, color:"var(--neutral-500)" },
  actItem: { display:"grid", gridTemplateColumns:"1fr auto auto auto auto", alignItems:"center", gap:16, padding:"12px 0", borderBottom:"1px solid var(--border-light)" },
  actName: { fontSize:14, fontWeight:500, color:"var(--neutral-900)" },
  actResp: { fontSize:12, color:"var(--neutral-500)" },
  actDay: { fontSize:12, color:"var(--neutral-700)", fontWeight:500 },
  actStatus: (s: string) => {
    const v: any={pend:{bg:"var(--warning-light)",c:"var(--warning)"},prog:{bg:"var(--primary-50)",c:"var(--primary-700)"},ok:{bg:"var(--success-light)",c:"var(--success)"}}[s]||{bg:"var(--neutral-100)",c:"var(--neutral-600)"};
    return { background:v.bg, color:v.c, fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:6 };
  },
  ganttHdr: (weeks: number) => ({ display:"grid", gridTemplateColumns:`200px repeat(${weeks},1fr)`, marginBottom:8 }),
  ganttHdrCell: (active: boolean) => ({ textAlign:"center", fontSize:11, color: active?"var(--primary-700)":"var(--neutral-500)", padding:"8px 0", fontWeight: active?600:500, borderBottom:`2px solid ${active?"var(--primary-600)":"transparent"}` }),
  ganttRowGrid: { display:"grid", gridTemplateColumns:"200px 1fr", alignItems:"center", gap:16, padding:"8px 0", borderBottom:"1px solid var(--border-light)" },
  ganttTrack: (weeks: number) => ({ display:"grid", gridTemplateColumns:`repeat(${weeks},1fr)`, background:"var(--neutral-50)", borderRadius:4, height:32, position:"relative" }),
  ganttBar: (c: string) => ({ position:"absolute", top:4, height:24, borderRadius:4, background:c, display:"flex", alignItems:"center", padding:"0 8px", fontSize:11, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.1)" }),
  ganttLabelName: { fontSize:13, color:"var(--neutral-900)", fontWeight:500 },
  ganttLabelSub: { fontSize:11, color:"var(--neutral-500)" },
  th: { fontSize:12, color:"var(--neutral-600)", padding:"12px 16px", textAlign:"left", borderBottom:"1px solid var(--border-light)", fontWeight:600, background:"var(--neutral-50)" },
  td: { padding:"12px 16px", fontSize:14, verticalAlign:"middle", borderBottom:"1px solid var(--border-light)", color:"var(--neutral-800)" },
  tdId: { padding:"12px 16px", fontSize:13, color:"var(--primary-700)", fontWeight:600, borderBottom:"1px solid var(--border-light)", verticalAlign:"middle" },
  tdRc: (ok: boolean) => ({ padding:"12px 16px", fontSize:12, fontWeight:600, color: ok?"var(--success)":"var(--danger)", borderBottom:"1px solid var(--border-light)", verticalAlign:"middle" }),
  tePill: { display:"inline-block", padding:"3px 10px", background:"var(--neutral-100)", color:"var(--neutral-700)", borderRadius:6, fontSize:12, fontWeight:500 },
  formWrap: { background:"#fff", border:"1px solid var(--border-light)", borderRadius:"var(--radius-md)", padding:"20px", marginTop:16, boxShadow:"var(--shadow-sm)" },
  formGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:12, alignItems:"end" },
  formLabel: { fontSize:12, color:"var(--neutral-700)", marginBottom:6, fontWeight:500 },
  input: { padding:"10px 12px", borderRadius:6, border:"1px solid var(--border-light)", background:"#fff", fontSize:14, color:"var(--neutral-900)", outline:"none", width:"100%", transition:"border-color 0.2s" },
  btnPrimary: { padding:"10px 20px", background:"var(--primary-600)", color:"#fff", border:"none", borderRadius:6, fontSize:14, fontWeight:600, cursor:"pointer", transition:"background 0.2s" },
  btnSecondary: { padding:"10px 16px", background:"#fff", color:"var(--neutral-700)", border:"1px solid var(--border-light)", borderRadius:6, fontSize:13, fontWeight:500, cursor:"pointer", transition:"background 0.2s" },
  btnDel: { background:"var(--danger-light)", border:"none", cursor:"pointer", color:"var(--danger)", padding:"6px 8px", borderRadius:6, display:"flex", alignItems:"center" },
  btnEdit: { background:"var(--neutral-100)", border:"none", cursor:"pointer", color:"var(--neutral-600)", padding:"6px 8px", borderRadius:6, display:"flex", alignItems:"center" },
  btnToggle: { display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:6, background:"#fff", color:"var(--primary-600)", border:"1px solid var(--border-light)", fontSize:13, fontWeight:600, cursor:"pointer", boxShadow:"var(--shadow-xs)" },
  riskCard: (v: string) => {
    const colors: any={high:{bg:"#fff",bd:"#fca5a5"},mid:{bg:"#fff",bd:"#fcd34d"},low:{bg:"#fff",bd:"var(--border-light)"}}[v] || {bg:"#fff",bd:"var(--border-light)"};
    return { display:"flex", gap:16, alignItems:"flex-start", padding:"20px", borderRadius:"var(--radius-md)", marginBottom:16, background:colors.bg, border:`1px solid ${colors.bd}`, boxShadow:"var(--shadow-sm)" };
  },
  riskIcon: (v: string) => {
    const c: any={high:"var(--danger)",mid:"var(--warning)",low:"var(--primary-600)"}[v] || "var(--primary-600)";
    return { flexShrink:0, width:12, height:12, borderRadius:"50%", background:c, marginTop:4 };
  },
  riskTitle: (v: string) => ({ fontSize:15, fontWeight:600, marginBottom:8, color:"var(--neutral-900)" }),
  riskBadge: (v: string) => {
    const s: any={high:{bg:"var(--danger-light)",c:"var(--danger)"},mid:{bg:"var(--warning-light)",c:"var(--warning)"},low:{bg:"var(--primary-50)",c:"var(--primary-700)"}}[v] || {bg:"var(--primary-50)",c:"var(--primary-700)"};
    return { display:"inline-block", padding:"4px 10px", borderRadius:6, fontSize:10, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", background:s.bg, color:s.c, marginLeft:"auto" };
  },
  riskDesc: { fontSize:13, color:"var(--neutral-600)", lineHeight:1.6 },
};

function FlowDiagram({ svg }: { svg?: string }) {
  if (svg && svg.trim().length > 10) return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', overflowX: 'auto' }} />;
  return (
    <svg viewBox="0 0 980 400" width="100%" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <defs>
        <marker id="a1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#3b82f6"/></marker>
        <marker id="a4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#d97706"/></marker>
        <filter id="cs"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1d4ed8" floodOpacity=".1"/></filter>
      </defs>
      <rect x="12" y="34" width="134" height="60" rx="10" fill="#fffbeb" stroke="#fde68a" strokeWidth="1.8" filter="url(#cs)"/>
      <rect x="12" y="34" width="134" height="6" rx="10" fill="#d97706"/>
      <text x="79" y="58" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="700">Fuente A</text>
      <text x="79" y="73" textAnchor="middle" fill="#78716c" fontSize="9">Sistema Origen</text>
      <rect x="208" y="74" width="140" height="176" rx="12" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.8" filter="url(#cs)"/>
      <rect x="208" y="74" width="140" height="8" rx="12" fill="#3b82f6"/>
      <text x="278" y="101" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="700">INGESTA</text>
      <rect x="410" y="54" width="155" height="216" rx="12" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.8" filter="url(#cs)"/>
      <rect x="410" y="54" width="155" height="8" rx="12" fill="#059669"/>
      <text x="487" y="80" textAnchor="middle" fill="#14532d" fontSize="11" fontWeight="700">PROCESAMIENTO</text>
      <path d="M146 64 Q186 64 186 162 Q186 162 206 162" fill="none" stroke="#d97706" strokeWidth="1.8" strokeDasharray="5,3" markerEnd="url(#a4)"/>
      <line x1="348" y1="162" x2="408" y2="162" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#a1)"/>
    </svg>
  );
}

function WBSDiagram({ svg }: { svg?: string }) {
  if (svg && svg.trim().length > 10) return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', overflowX: 'auto' }} />;
  return (
    <svg viewBox="0 0 880 260" width="100%" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <rect x="305" y="10" width="270" height="50" rx="10" fill="#1e3a8a"/>
      <text x="440" y="31" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">Proyecto Principal</text>
      <text x="440" y="49" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="10">Estructura WBS</text>
      <line x1="440" y1="60" x2="440" y2="82" stroke="#bfdbfe" strokeWidth="1.5"/>
      <line x1="265" y1="82" x2="615" y2="82" stroke="#bfdbfe" strokeWidth="1.5"/>
      {[
        { x:265, label:"1. Fase Inicial", sub:"Planificación", bg:"#fffbeb", bd:"#fde68a", tc:"#92400e" },
        { x:440, label:"2. Ejecución",    sub:"Desarrollo",    bg:"#eff6ff", bd:"#93c5fd", tc:"#1e40af" },
        { x:615, label:"3. Cierre",       sub:"Entregables",   bg:"#f0fdf4", bd:"#86efac", tc:"#14532d" },
      ].map(b => (
        <g key={b.x}>
          <line x1={b.x} y1="82" x2={b.x} y2="100" stroke={b.bd} strokeWidth="1.5"/>
          <rect x={b.x-72} y="100" width="144" height="46" rx="8" fill={b.bg} stroke={b.bd} strokeWidth="1.5"/>
          <text x={b.x} y="121" textAnchor="middle" fill={b.tc} fontSize="11" fontWeight="700">{b.label}</text>
          <text x={b.x} y="137" textAnchor="middle" fill="#64748b" fontSize="9">{b.sub}</text>
        </g>
      ))}
    </svg>
  );
}

function parseDependency(predStr: string) {
  const match = predStr.match(/^([a-zA-Z0-9.-]+)(FS|SS|FF|SF)?([+-]\d+(?:\.\d+)?)?$/i);
  if (match) {
    return {
      id: match[1],
      type: (match[2] || 'FS').toUpperCase(),
      lag: parseFloat(match[3] || '0')
    };
  }
  return { id: predStr.replace(/[^0-9a-zA-Z.-]/g, ''), type: 'FS', lag: 0 };
}

function getWorkingDate(hoursOffset: number): Date {
  const d = new Date(2024, 0, 1, 8, 0, 0); // Start at Mon, Jan 1, 2024, 8:00 AM
  let remaining = hoursOffset;
  
  while (remaining > 0.001) {
    if (d.getDay() === 0) { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); continue; }
    if (d.getDay() === 6) { d.setDate(d.getDate() + 2); d.setHours(8, 0, 0, 0); continue; }
    if (d.getHours() < 8) { d.setHours(8, 0, 0, 0); }
    if (d.getHours() >= 16) { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); continue; }
    
    let available = 16 - d.getHours() - (d.getMinutes() / 60);
    if (remaining <= available) {
      const totalMins = Math.round(d.getMinutes() + remaining * 60);
      d.setHours(d.getHours() + Math.floor(totalMins / 60));
      d.setMinutes(totalMins % 60);
      remaining = 0;
    } else {
      remaining -= available;
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
    }
  }
  return d;
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const h = date.getHours() % 12 || 12;
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear().toString().slice(-2)} ${pad(h)}:${pad(date.getMinutes())} ${ampm}`;
}

function formatDuration(hours: number): string {
  const d = Math.floor(hours / 8);
  const h = hours % 8;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

function calculateCPM(tasks: Task[]) {
  const nodes = new Map<string, any>();
  tasks.forEach(t => {
    nodes.set(t.id, {
      ...t,
      dur: Number(t.dur) || 0,
      ES: 0, EF: 0, LS: 0, LF: 0,
      totalSlack: 0, freeSlack: 0,
      isCritical: false,
      status: t.status || 'pending',
      preds: [], succs: []
    });
  });

  // Parse dependencies
  tasks.forEach(t => {
    const node = nodes.get(t.id);
    if (!t.pred) return;
    const predStrs = t.pred.split(',').map(p => p.trim()).filter(p => p && p !== '-');
    predStrs.forEach(pStr => {
      const dep = parseDependency(pStr);
      if (nodes.has(dep.id)) {
        node.preds.push(dep);
        nodes.get(dep.id).succs.push({ id: t.id, type: dep.type, lag: dep.lag });
      }
    });
  });

  // Topological Sort for Forward Pass
  const topoOrder: string[] = [];
  const inDegree = new Map<string, number>();
  nodes.forEach((node, id) => inDegree.set(id, node.preds.length));

  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);
    nodes.get(u).succs.forEach((v: any) => {
      inDegree.set(v.id, inDegree.get(v.id)! - 1);
      if (inDegree.get(v.id) === 0) queue.push(v.id);
    });
  }

  // Handle cycles by appending remaining nodes
  if (topoOrder.length < nodes.size) {
    nodes.forEach((_, id) => {
      if (!topoOrder.includes(id)) topoOrder.push(id);
    });
  }

  // Forward Pass (ES, EF)
  topoOrder.forEach(id => {
    const node = nodes.get(id);
    let maxES = 0;
    node.preds.forEach((p: any) => {
      const pNode = nodes.get(p.id);
      let es = 0;
      if (p.type === 'FS') es = pNode.EF + p.lag;
      else if (p.type === 'SS') es = pNode.ES + p.lag;
      else if (p.type === 'FF') es = pNode.EF + p.lag - node.dur;
      else if (p.type === 'SF') es = pNode.ES + p.lag - node.dur;
      maxES = Math.max(maxES, es);
    });
    node.ES = maxES;
    node.EF = node.ES + node.dur;
  });

  // Project Duration
  let projectDuration = 0;
  nodes.forEach(node => {
    projectDuration = Math.max(projectDuration, node.EF);
  });

  // Backward Pass (LS, LF)
  const reverseTopo = [...topoOrder].reverse();
  reverseTopo.forEach(id => {
    const node = nodes.get(id);
    if (node.succs.length > 0) {
      let minLF = projectDuration;
      node.succs.forEach((s: any) => {
        const sNode = nodes.get(s.id);
        let lf = projectDuration;
        if (s.type === 'FS') lf = sNode.LS - s.lag;
        else if (s.type === 'SS') lf = sNode.LS - s.lag + node.dur;
        else if (s.type === 'FF') lf = sNode.LF - s.lag;
        else if (s.type === 'SF') lf = sNode.LF - s.lag + node.dur;
        minLF = Math.min(minLF, lf);
      });
      node.LF = minLF;
      node.LS = node.LF - node.dur;
    } else {
      node.LF = projectDuration;
      node.LS = node.LF - node.dur;
    }
  });

  // Calculate Slack
  nodes.forEach(node => {
    node.totalSlack = node.LS - node.ES;
    
    if (node.succs.length > 0) {
      let minES = projectDuration;
      node.succs.forEach((s: any) => {
        const sNode = nodes.get(s.id);
        let es = projectDuration;
        if (s.type === 'FS') es = sNode.ES - s.lag;
        else if (s.type === 'SS') es = sNode.ES - s.lag + node.dur;
        else if (s.type === 'FF') es = sNode.EF - s.lag;
        else if (s.type === 'SF') es = sNode.EF - s.lag + node.dur;
        minES = Math.min(minES, es);
      });
      node.freeSlack = minES - node.EF;
    } else {
      node.freeSlack = node.totalSlack;
    }

    node.isCritical = node.totalSlack <= 0;
  });

  return Array.from(nodes.values());
}

export default function ProjectDashboard({ data, onUpdate, onSync, isSyncing }: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: data.name, businessObjective: data.businessObjective, projectType: data.projectType, status: data.status,
    kpiScope: data.kpiScope, kpiSchedule: data.kpiSchedule, kpiBudget: data.kpiBudget, kpiQuality: data.kpiQuality,
    projectStartDate: data.projectStartDate,
    flowSvg: data.flowSvg || "", wbsSvg: data.wbsSvg || ""
  });

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMsForm, setShowMsForm] = useState(false);
  const [showOepForm, setShowOepForm] = useState(false);
  const [showActForm, setShowActForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);

  const [editIndex, setEditIndex] = useState<{type: string, idx: number | null}>({type: '', idx: null});

  const [taskForm, setTaskForm] = useState<{id:string, name:string, om:string, p:string, te:string, pred:string, rec:string, rc:string, dur:string, status: 'pending'|'in_progress'|'completed'}>({ id:"", name:"", om:"", p:"", te:"", pred:"", rec:"", rc:"SÍ", dur:"", status:"pending" });
  const [msForm, setMsForm] = useState({ n:"", w:"", s:"pending" });
  const [oepForm, setOepForm] = useState({ id:"", n:"", kpi:"" });
  const [actForm, setActForm] = useState({ n:"", r:"", d:"", s:"pend" });
  const [riskForm, setRiskForm] = useState({ v:"low", id:"", title:"", badge:"Bajo", desc:"" });

  const [formError, setFormError] = useState("");
  const [hoverTask, setHoverTask] = useState<number | null>(null);
  const [ganttEditTaskId, setGanttEditTaskId] = useState<string | null>(null);
  const [ganttEditForm, setGanttEditForm] = useState<{dur: string, pred: string, status: 'pending'|'in_progress'|'completed'}>({ dur: "", pred: "", status: "pending" });
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const pushLog = (action: string, detail: string, currentData: ProjectData = data): ProjectData => {
    const newLog = {
      action,
      detail,
      timestamp: new Date().toISOString()
    };
    return {
      ...currentData,
      changeLog: [...(currentData.changeLog || []), newLog]
    };
  };

  const WEEKS = Math.max(9, ...data.tasks.map(t => t.start + t.dur + 1));
  const CURRENT_WEEK = 2;

  const handleSaveProject = () => {
    onUpdate(pushLog('Actualización General', 'Se modificaron datos generales del proyecto', { ...data, ...projectForm, lastUpdated: new Date().toISOString() }));
    setIsEditingProject(false);
  };

  const handleAddTask = useCallback(() => {
    setFormError("");
    const id = taskForm.id.trim().toUpperCase();
    const name = taskForm.name.trim();
    const rec  = taskForm.rec.trim();
    if (!id || !name || !rec) return setFormError("ID, Nombre y Recursos son obligatorios");
    if (editIndex.idx === null && data.tasks.find(t => t.id === id)) return setFormError(`Ya existe la tarea "${id}"`);
    
    const p = parseInt(taskForm.p) || 5;
    const lastEnd = data.tasks.length ? Math.max(...data.tasks.map(t => t.start + t.dur)) : 0;
    const dur = taskForm.dur ? parseInt(taskForm.dur) : Math.max(1, Math.round(p / 5));
    const start = clamp(lastEnd, 0, WEEKS - 1);
    
    const newTask: Task = {
      id, name, om: parseInt(taskForm.om)||1, p,
      te: taskForm.te.trim() || String(p), pred: taskForm.pred.trim()||"-",
      rec, rc: taskForm.rc === "SÍ", start, dur, status: taskForm.status
    };
    
    let newTasks = [...data.tasks];
    let actionName = 'Nueva Tarea';
    if (editIndex.type === 'task' && editIndex.idx !== null) {
      newTasks[editIndex.idx] = newTask;
      actionName = 'Tarea Actualizada';
    } else {
      newTasks.push(newTask);
    }
    
    onUpdate(pushLog(actionName, `Se actualizó la tarea ${newTask.id} (${newTask.name})`, { ...data, tasks: newTasks }));
    setTaskForm({ id:"", name:"", om:"", p:"", te:"", pred:"", rec:"", rc:"SÍ", dur:"", status:"pending" });
    setShowTaskForm(false);
    setEditIndex({type: '', idx: null});
  }, [taskForm, data, WEEKS, onUpdate, editIndex]);

  const editTask = (idx: number) => {
    const t = data.tasks[idx];
    setTaskForm({ id: t.id, name: t.name, om: String(t.om), p: String(t.p), te: t.te, pred: t.pred, rec: t.rec, rc: t.rc ? "SÍ" : "NO", dur: String(t.dur), status: t.status || "pending" });
    setEditIndex({type: 'task', idx});
    setShowTaskForm(true);
  };

  const handleDeleteTask = (idx: number) => {
    const deletedId = data.tasks[idx].id;
    onUpdate(pushLog('Tarea Eliminada', `Se eliminó la tarea ${deletedId}`, { ...data, tasks: data.tasks.filter((_, i) => i !== idx) }));
  };

  const handleAddMs = () => {
    if (!msForm.n || !msForm.w) return;
    let newArr = [...data.milestones];
    if (editIndex.type === 'ms' && editIndex.idx !== null) newArr[editIndex.idx] = msForm as Milestone;
    else newArr.push(msForm as Milestone);
    onUpdate({ ...data, milestones: newArr });
    setMsForm({ n:"", w:"", s:"pending" });
    setShowMsForm(false);
    setEditIndex({type: '', idx: null});
  };
  const editMs = (idx: number) => { setMsForm(data.milestones[idx]); setEditIndex({type: 'ms', idx}); setShowMsForm(true); };

  const handleAddOep = () => {
    if (!oepForm.id || !oepForm.n) return;
    let newArr = [...data.oeps];
    if (editIndex.type === 'oep' && editIndex.idx !== null) newArr[editIndex.idx] = oepForm as OEP;
    else newArr.push(oepForm as OEP);
    onUpdate({ ...data, oeps: newArr });
    setOepForm({ id:"", n:"", kpi:"" });
    setShowOepForm(false);
    setEditIndex({type: '', idx: null});
  };
  const editOep = (idx: number) => { setOepForm(data.oeps[idx]); setEditIndex({type: 'oep', idx}); setShowOepForm(true); };

  const handleAddAct = () => {
    if (!actForm.n || !actForm.r) return;
    let newArr = [...data.activities];
    if (editIndex.type === 'act' && editIndex.idx !== null) newArr[editIndex.idx] = actForm as Activity;
    else newArr.push(actForm as Activity);
    onUpdate({ ...data, activities: newArr });
    setActForm({ n:"", r:"", d:"", s:"pend" });
    setShowActForm(false);
    setEditIndex({type: '', idx: null});
  };
  const editAct = (idx: number) => { setActForm(data.activities[idx]); setEditIndex({type: 'act', idx}); setShowActForm(true); };

  const handleAddRisk = () => {
    if (!riskForm.id || !riskForm.title) return;
    let newArr = [...data.risks];
    let actionName = 'Nuevo Riesgo';
    if (editIndex.type === 'risk' && editIndex.idx !== null) {
      newArr[editIndex.idx] = riskForm as Risk;
      actionName = 'Riesgo Actualizado';
    } else {
      newArr.push(riskForm as Risk);
    }
    onUpdate(pushLog(actionName, `Riesgo: ${riskForm.title}`, { ...data, risks: newArr }));
    setRiskForm({ v:"low", id:"", title:"", badge:"Bajo", desc:"" });
    setShowRiskForm(false);
    setEditIndex({type: '', idx: null});
  };
  const editRisk = (idx: number) => { setRiskForm(data.risks[idx]); setEditIndex({type: 'risk', idx}); setShowRiskForm(true); };

  const tabs = [
    { id:"overview",  icon:"⊞", label:"Overview" },
    { id:"edt",       icon:"🌳", label:"EDT" },
    { id:"gantt",     icon:"▬", label:"Gantt" },
    { id:"asesor",    icon:"🧠", label:"Asesor" },
    { id:"flow",      icon:"◎", label:"Flow" },
    { id:"resources", icon:"👥", label:"Recursos" },
    { id:"tasks",     icon:"≡", label:"Tasks" },
    { id:"risks",     icon:"⚠", label:"Risks" },
  ];

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.logoBox}>
          <div style={S.logoTitle}>
            <div style={S.logoIcon}>
              {/* Payway P logo mock */}
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h8a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4z" />
                <path d="M12 12h4a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H4" />
              </svg>
            </div>
            Payway
          </div>
          <div style={S.logoSub}>{data.projectType || "Gestión de Proyecto"}</div>
        </div>
        <div style={S.navSection}>
          <div style={S.navLabel}>Vistas</div>
          {tabs.map(t => (
            <button key={t.id} style={S.navItem(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>
              <span style={{fontSize:16,opacity:(activeTab===t.id ? 1 : 0.7)}}>{t.icon}</span>{t.label}
              {t.id==="tasks" && <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:600}}>{data.tasks.length}</span>}
            </button>
          ))}
        </div>
        <div style={S.sideFooter}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,color:"rgba(255,255,255,0.65)"}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#34d399",display:"inline-block",animation:"pulse 2s infinite"}}/>
            {data.status}
          </div>
          <div>Actualizado: {new Date(data.lastUpdated).toLocaleDateString()}</div>
        </div>

        {/* Change Log Timeline */}
        {data.changeLog && data.changeLog.length > 0 && (
          <div style={{...S.card, margin: 24, padding: 16 }}>
            <div style={{fontSize: 12, fontWeight: 700, color: "var(--neutral-800)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5}}>Historial Reciente</div>
            <div style={{display: "flex", flexDirection: "column", gap: 12}}>
              {[...data.changeLog].reverse().slice(0, 5).map((log, i) => (
                <div key={i} style={{display: "flex", gap: 8}}>
                  <div style={{marginTop: 4, width: 6, height: 6, borderRadius: "50%", background: "var(--primary-400)", flexShrink: 0}} />
                  <div>
                    <div style={{fontSize: 11, fontWeight: 600, color: "var(--neutral-700)"}}>{log.action}</div>
                    <div style={{fontSize: 10, color: "var(--neutral-500)", marginTop: 2}}>{log.detail}</div>
                    <div style={{fontSize: 9, color: "var(--neutral-400)", fontFamily: "'JetBrains Mono', monospace", marginTop: 4}}>
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main style={S.main}>
        <header style={S.hdrWrap}>
          <div style={S.hdrLeft}>
            {isEditingProject ? (
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <input style={{...S.input, width: 200, fontSize: 16, fontWeight: 600}} value={projectForm.name} onChange={e=>setProjectForm({...projectForm, name: e.target.value})} placeholder="Nombre del Proyecto" />
                <input style={{...S.input, width: 200}} value={projectForm.businessObjective} onChange={e=>setProjectForm({...projectForm, businessObjective: e.target.value})} placeholder="Objetivo de Negocio" />
                <div style={{display: "flex", alignItems: "center", gap: 8}}>
                  <span style={{fontSize: 13, color: "var(--neutral-600)", fontWeight: 500}}>Inicio:</span>
                  <input type="date" style={{...S.input, width: "auto", padding: "8px 12px"}} value={projectForm.projectStartDate} onChange={e=>setProjectForm({...projectForm, projectStartDate: e.target.value})} />
                </div>
              </div>
            ) : (
              <div>
                <h1 style={S.hdrH1}>PM Copilot</h1>
              </div>
            )}
          </div>
          <div style={S.badgeRow}>
            {isEditingProject ? (
              <button onClick={handleSaveProject} style={{...S.btnPrimary, display: "flex", alignItems: "center", gap: 6}}><Check size={16}/> Guardar</button>
            ) : (
              // Empty space for layout balance, edit form is handled mostly via sub-sections if needed. 
              <div style={{display: 'flex', gap: 24, alignItems: 'center', color: 'var(--neutral-700)', fontSize: 14, fontWeight: 500}}>
                <button onClick={onSync} disabled={isSyncing} style={{background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--neutral-700)', fontWeight:500, fontSize:14}}>
                  <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? 'Sincronizando...' : 'Chat'}
                </button>
                <div style={{color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer'}}>Dashboard</div>
                <div style={{color: 'var(--neutral-900)'}}>demo@pmcopilot.com</div>
                <div style={{width: 32, height: 32, borderRadius: 16, background: 'var(--neutral-200)'}}></div>
              </div>
            )}
          </div>
        </header>

        {/* Tab Header specific content */}
        <div style={{padding: '0 32px 0'}}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingTop: 16 }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: 0 }}>
              {tabs.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '12px 20px', fontSize: 14, fontWeight: activeTab === t.id ? 600 : 500,
                    color: activeTab === t.id ? 'var(--primary-600)' : 'var(--neutral-500)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === t.id ? '2px solid var(--primary-600)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.2s',
                    marginBottom: '-1px'
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
              <button onClick={() => setShowFileUpload(true)} style={{...S.btnSecondary, padding: '8px 14px', fontSize: 13, display: "flex", alignItems: "center", gap: "6px"}}>
                <Upload size={14} /> Importar
              </button>
              <div style={{position: 'relative'}}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)} 
                  style={{...S.btnSecondary, padding: '8px 14px', fontSize: 13, display: "flex", alignItems: "center", gap: "6px"}}>
                  <Upload size={14} style={{transform: "rotate(180deg)"}}/> Exportar ▾
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', 
                    border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', 
                    boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 180, overflow: 'hidden'
                  }}>
                    <button onClick={() => { exportToJiraCSV(data); setShowExportMenu(false); }} style={{width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-700)'}} className="hover:bg-slate-50">
                      Exportar a Jira (CSV)
                    </button>
                    <button onClick={() => { exportToICS(data); setShowExportMenu(false); }} style={{width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-700)'}} className="hover:bg-slate-50">
                      Exportar Calendario (.ics)
                    </button>
                    <button onClick={() => { window.print(); setShowExportMenu(false); }} style={{width: '100%', padding: '10px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--neutral-700)'}} className="hover:bg-slate-50">
                      Exportar a PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{flex: 1, padding: "24px 32px 32px", overflowY: "auto"}}>

        {activeTab==="overview" && <>
          <ProjectHealth data={data} onUpdate={onUpdate} />
          <BurndownChart data={data} />
          <div style={S.kpiGrid}>
            {[
              { tag:"Scope Health", key: "kpiScope", val: data.kpiScope || "N/A", c:"#059669", ico:"✓" },
              { tag:"Schedule",     key: "kpiSchedule", val: data.kpiSchedule || "N/A", c:"#d97706", ico:"⏱" },
              { tag:"Budget",       key: "kpiBudget", val: data.kpiBudget || "N/A", c:"#1d4ed8", ico:"$" },
              { tag:"Quality Index",key: "kpiQuality", val: data.kpiQuality || "N/A", c:"#7c3aed", ico:"⚠" },
            ].map(k => (
              <div key={k.tag} style={S.kpiCard(k.c)}>
                <div style={S.kpiStripe(k.c)}/>
                <div style={S.kpiTag}>{k.tag}</div>
                {isEditingProject ? (
                  <input style={{...S.input, marginTop: 4}} value={(projectForm as any)[k.key]} onChange={e=>setProjectForm({...projectForm, [k.key]: e.target.value})} placeholder={k.tag} />
                ) : (
                  <div style={{...S.kpiVal, color:k.c, fontSize: k.val.length > 10 ? 16 : 20}}>{k.val}</div>
                )}
                <div style={{position:"absolute",right:14,bottom:10,fontSize:32,opacity:.07}}>{k.ico}</div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{...S.sectionTitle, marginBottom:0}}>Hitos del Proyecto<div style={S.divider}/></div>
              <button style={{...S.btnToggle, padding:"4px 8px", fontSize:11}} onClick={()=>{setShowMsForm(!showMsForm); setEditIndex({type:'', idx:null});}}>{showMsForm?"✕":"+ Hito"}</button>
            </div>
            {showMsForm && (
              <div style={{...S.formWrap, marginBottom:16}}>
                <div style={S.formGrid}>
                  <div><div style={S.formLabel}>Nombre</div><input style={S.input} value={msForm.n} onChange={e=>setMsForm({...msForm,n:e.target.value})} placeholder="Ej. Kick-off"/></div>
                  <div><div style={S.formLabel}>Semana/Fecha</div><input style={S.input} value={msForm.w} onChange={e=>setMsForm({...msForm,w:e.target.value})} placeholder="Sem 1"/></div>
                  <div><div style={S.formLabel}>Estado</div>
                    <select style={S.input} value={msForm.s} onChange={e=>setMsForm({...msForm,s:e.target.value})}>
                      <option value="pending">Pendiente</option><option value="active">Activo</option><option value="done">Completado</option>
                    </select>
                  </div>
                  <div style={{display:"flex", gap:4}}>
                    <button style={S.btnPrimary} onClick={handleAddMs}>{editIndex.idx !== null ? 'Actualizar' : 'Guardar'}</button>
                  </div>
                </div>
              </div>
            )}
            <div style={S.msRow}>
              {data.milestones.length === 0 && (
                <div style={{width: "100%", textAlign:"center",padding:40,background:"var(--neutral-50)",borderRadius:8,border:"1px dashed var(--border-light)"}}><div style={{fontSize: 24, marginBottom: 8}}>🚩</div><h4 style={{fontSize: 14, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 4}}>Sin hitos</h4><p style={{fontSize: 12, color: "var(--neutral-500)", marginBottom: 16}}>Marca los momentos clave del proyecto.</p><button onClick={()=>{setShowMsForm(true); setEditIndex({type:'', idx:null});}} className="btn btn-primary btn-sm">+ Agregar Hito</button></div>
              )}
              {data.milestones.map((m,i,arr) => (
                <div key={i} style={S.msItem} className="group">
                  {i < arr.length-1 && <div style={{...S.msLine(m.s), background: m.s==="done"?"#059669":m.s==="active"?"linear-gradient(90deg,#059669,#3b82f6)":"#e2e8f0"}}/>}
                  <div style={S.msDot(m.s)}>{m.s==="done"?"✓":m.s==="active"?"●":i+1}</div>
                  <div style={S.msLabel}>{m.n}</div>
                  <div style={S.msWeek}>{m.w}</div>
                  <div style={{position:"absolute", top:-10, right:10, display:"flex", gap:2, opacity:0}} className="group-hover:opacity-100">
                    <button onClick={()=>editMs(i)} style={S.btnEdit}><Edit2 size={12}/></button>
                    <button onClick={()=>onUpdate({...data, milestones: data.milestones.filter((_,idx)=>idx!==i)})} style={S.btnDel}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.twoCol}>
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{...S.sectionTitle, marginBottom:0}}>Objetivos OEP<div style={S.divider}/></div>
                <button style={{...S.btnToggle, padding:"4px 8px", fontSize:11}} onClick={()=>{setShowOepForm(!showOepForm); setEditIndex({type:'', idx:null});}}>{showOepForm?"✕":"+ OEP"}</button>
              </div>
              {showOepForm && (
                <div style={{...S.formWrap, marginBottom:16}}>
                  <div style={S.formGrid}>
                    <div><div style={S.formLabel}>ID</div><input style={S.input} value={oepForm.id} onChange={e=>setOepForm({...oepForm,id:e.target.value})} placeholder="OP1"/></div>
                    <div><div style={S.formLabel}>Nombre</div><input style={S.input} value={oepForm.n} onChange={e=>setOepForm({...oepForm,n:e.target.value})} placeholder="Integración"/></div>
                    <div><div style={S.formLabel}>KPI</div><input style={S.input} value={oepForm.kpi} onChange={e=>setOepForm({...oepForm,kpi:e.target.value})} placeholder="100% archivos"/></div>
                    <button style={S.btnPrimary} onClick={handleAddOep}>{editIndex.idx !== null ? 'Actualizar' : 'Guardar'}</button>
                  </div>
                </div>
              )}
              {data.oeps.length === 0 && (
                <div style={{textAlign:"center",padding:40,background:"var(--neutral-50)",borderRadius:8,border:"1px dashed var(--border-light)"}}><div style={{fontSize: 24, marginBottom: 8}}>🎯</div><h4 style={{fontSize: 14, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 4}}>Sin objetivos</h4><p style={{fontSize: 12, color: "var(--neutral-500)", marginBottom: 16}}>Define OEPs para medir el éxito.</p><button onClick={()=>{setShowOepForm(true); setEditIndex({type:'', idx:null});}} className="btn btn-primary btn-sm">+ Agregar OEP</button></div>
              )}
              {data.oeps.map((o,i) => (
                <div key={i} style={{...S.oepItem, marginBottom: i===data.oeps.length-1?0:10}} className="group relative">
                  <div style={S.oepId}>{o.id}</div>
                  <div><div style={S.oepName}>{o.n}</div><div style={S.oepKpi}>{o.kpi}</div></div>
                  <div style={{display:"flex", gap:2, opacity:0}} className="group-hover:opacity-100">
                    <button onClick={()=>editOep(i)} style={S.btnEdit}><Edit2 size={12}/></button>
                    <button onClick={()=>onUpdate({...data, oeps: data.oeps.filter((_,idx)=>idx!==i)})} style={S.btnDel}>🗑</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <div style={{...S.sectionTitle, marginBottom:0}}>Próximas Actividades<div style={S.divider}/></div>
                <button style={{...S.btnToggle, padding:"4px 8px", fontSize:11}} onClick={()=>{setShowActForm(!showActForm); setEditIndex({type:'', idx:null});}}>{showActForm?"✕":"+ Actividad"}</button>
              </div>
              {showActForm && (
                <div style={{...S.formWrap, marginBottom:16}}>
                  <div style={S.formGrid}>
                    <div><div style={S.formLabel}>Actividad</div><input style={S.input} value={actForm.n} onChange={e=>setActForm({...actForm,n:e.target.value})} placeholder="Reunión"/></div>
                    <div><div style={S.formLabel}>Resp.</div><input style={S.input} value={actForm.r} onChange={e=>setActForm({...actForm,r:e.target.value})} placeholder="IT"/></div>
                    <div><div style={S.formLabel}>Día</div><input style={S.input} value={actForm.d} onChange={e=>setActForm({...actForm,d:e.target.value})} placeholder="Día 3"/></div>
                    <div><div style={S.formLabel}>Estado</div>
                      <select style={S.input} value={actForm.s} onChange={e=>setActForm({...actForm,s:e.target.value})}>
                        <option value="pend">Pendiente</option><option value="prog">En curso</option><option value="ok">Completado</option>
                      </select>
                    </div>
                    <button style={S.btnPrimary} onClick={handleAddAct}>{editIndex.idx !== null ? 'Actualizar' : 'Guardar'}</button>
                  </div>
                </div>
              )}
              {data.activities.length === 0 && (
                <div style={{textAlign:"center",padding:40,background:"var(--neutral-50)",borderRadius:8,border:"1px dashed var(--border-light)"}}><div style={{fontSize: 24, marginBottom: 8}}>📅</div><h4 style={{fontSize: 14, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 4}}>Calendario libre</h4><p style={{fontSize: 12, color: "var(--neutral-500)", marginBottom: 16}}>No tienes actividades próximas asignadas.</p><button onClick={()=>{setShowActForm(true); setEditIndex({type:'', idx:null});}} className="btn btn-primary btn-sm">+ Nueva Actividad</button></div>
              )}
              {data.activities.map((a,i,arr) => (
                <div key={i} style={{...S.actItem, borderBottom: i===arr.length-1?"none":undefined}} className="group">
                  <div><div style={S.actName}>{a.n}</div><div style={S.actResp}>{a.r}</div></div>
                  <div style={S.actDay}>{a.d}</div>
                  <span style={S.actStatus(a.s)}>{a.s==="pend"?"Pendiente":a.s==="prog"?"En curso":"OK"}</span>
                  <div style={{display:"flex", gap:2, opacity:0}} className="group-hover:opacity-100">
                    <button onClick={()=>editAct(i)} style={S.btnEdit}><Edit2 size={12}/></button>
                    <button onClick={()=>onUpdate({...data, activities: data.activities.filter((_,idx)=>idx!==i)})} style={S.btnDel}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {activeTab==="gantt" && (
          <GanttChart
            tasks={data.tasks}
            projectStartDate={data.projectStartDate}
            onUpdateTasks={(newTasks) => onUpdate({ ...data, tasks: newTasks })}
          />
        )}

        {activeTab==="asesor" && (
          <PMAdvisor
            data={data}
            onUpdate={onUpdate}
          />
        )}

        {activeTab==="resources" && (
          <ResourceAllocation data={data} />
        )}

        {activeTab==="flow" && <>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{...S.sectionTitle, marginBottom:0}}>Arquitectura · Flujo de Datos<div style={S.divider}/></div>
              {isEditingProject && <span style={{fontSize:11, color:"#1d4ed8"}}>Editando SVG...</span>}
            </div>
            {isEditingProject ? (
              <textarea style={{...S.input, height: 200, fontFamily: "monospace", fontSize: 11, background: "#f8fafc"}} value={projectForm.flowSvg} onChange={e=>setProjectForm({...projectForm, flowSvg: e.target.value})} placeholder="<svg>...</svg>" />
            ) : <FlowDiagram svg={data.flowSvg} />}
          </div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{...S.sectionTitle, marginBottom:0}}>WBS · Estructura de Desglose del Trabajo<div style={S.divider}/></div>
            </div>
            <WBSChart nodes={data.wbsNodes || []} />
          </div>
        </>}

        {activeTab==="edt" && (
          <WBSEditor
            nodes={data.wbsNodes || []}
            projectName={data.name}
            onChange={(newNodes) => onUpdate({ ...data, wbsNodes: newNodes })}
          />
        )}

        {activeTab==="tasks" && (
          <div style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <div style={S.sectionTitle}>Tareas EDT<div style={S.divider}/></div>
              <button style={S.btnToggle} onClick={()=>{setShowTaskForm(v=>!v);setFormError("");setEditIndex({type:'', idx:null});}}>
                <span style={{fontSize:16,lineHeight:1}}>{showTaskForm?"✕":"+"}</span>{showTaskForm?"Cancelar":"Nueva Tarea"}
              </button>
            </div>
            {showTaskForm && (
              <div style={{...S.formWrap, marginBottom:20}}>
                <div style={{fontSize:11,fontFamily:"monospace",color:"#1d4ed8",fontWeight:700,letterSpacing:1,marginBottom:12}}>{editIndex.idx !== null ? 'EDITAR TAREA' : '+ NUEVA TAREA'}</div>
                <div style={S.formGrid}>
                  <div><div style={S.formLabel}>ID</div><input style={S.input} value={taskForm.id} onChange={e=>setTaskForm({...taskForm,id:e.target.value})} placeholder="T8"/></div>
                  <div><div style={S.formLabel}>Nombre</div><input style={S.input} value={taskForm.name} onChange={e=>setTaskForm({...taskForm,name:e.target.value})} placeholder="Ej. SFTP"/></div>
                  <div><div style={S.formLabel}>Duración (h)</div><input style={S.input} type="number" value={taskForm.dur} onChange={e=>setTaskForm({...taskForm,dur:e.target.value})} placeholder="Auto (P/5)"/></div>
                  <div><div style={S.formLabel}>Estado</div>
                    <select style={S.input} value={taskForm.status} onChange={e=>setTaskForm({...taskForm,status:e.target.value as any})}>
                      <option value="pending">Pendiente</option><option value="in_progress">En curso</option><option value="completed">Completado</option>
                    </select>
                  </div>
                  <div><div style={S.formLabel}>Predecesoras</div><input style={S.input} value={taskForm.pred} onChange={e=>setTaskForm({...taskForm,pred:e.target.value})} placeholder="T2, T3"/></div>
                  <div><div style={S.formLabel}>Recursos</div><input style={S.input} value={taskForm.rec} onChange={e=>setTaskForm({...taskForm,rec:e.target.value})} placeholder="Data Eng."/></div>
                  <div><div style={S.formLabel}>RC</div><select style={S.input} value={taskForm.rc} onChange={e=>setTaskForm({...taskForm,rc:e.target.value})}><option value="SÍ">SÍ</option><option value="NO">NO</option></select></div>
                  <div><div style={S.formLabel}>OM</div><input style={S.input} type="number" value={taskForm.om} onChange={e=>setTaskForm({...taskForm,om:e.target.value})} placeholder="3"/></div>
                  <div><div style={S.formLabel}>P</div><input style={S.input} type="number" value={taskForm.p} onChange={e=>setTaskForm({...taskForm,p:e.target.value})} placeholder="8"/></div>
                  <div><div style={S.formLabel}>TE</div><input style={S.input} value={taskForm.te} onChange={e=>setTaskForm({...taskForm,te:e.target.value})} placeholder="5.3"/></div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:12,alignItems:"center"}}>
                  <button style={S.btnPrimary} onClick={handleAddTask}>{editIndex.idx !== null ? 'Actualizar' : 'Agregar Tarea'}</button>
                  <button style={S.btnSecondary} onClick={()=>{setShowTaskForm(false);setFormError("");}}>Cancelar</button>
                  {formError && <span style={{fontSize:11,color:"#dc2626",fontFamily:"monospace"}}>{formError}</span>}
                </div>
              </div>
            )}
            {data.tasks.length===0 ? (
              <div style={{textAlign:"center",padding:40,background:"var(--neutral-50)",borderRadius:8,border:"1px dashed var(--border-light)"}}><div style={{fontSize: 24, marginBottom: 8}}>📂</div><h4 style={{fontSize: 14, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 4}}>No hay tareas</h4><p style={{fontSize: 12, color: "var(--neutral-500)", marginBottom: 16}}>Aún no se han definido tareas para el proyecto.</p><button onClick={()=>{setShowTaskForm(true); setEditIndex({type:'', idx:null});}} className="btn btn-primary btn-sm">+ Crear Tarea</button></div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                  <thead><tr>{["ID","Tarea","Estado","Dur.","Predecesoras","Recursos","RC",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.tasks.map((t,i) => (
                      <tr key={i} className="group">
                        <td style={S.tdId}>{t.id}</td><td style={S.td}><strong>{t.name}</strong></td>
                        <td style={S.td}>
                          <span style={{
                            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                            background: t.status === 'completed' ? '#dcfce7' : t.status === 'in_progress' ? '#fef08a' : '#f1f5f9',
                            color: t.status === 'completed' ? '#166534' : t.status === 'in_progress' ? '#854d0e' : '#475569'
                          }}>
                            {t.status === 'completed' ? 'Completado' : t.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                          </span>
                        </td>
                        <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:"#64748b"}}>{formatDuration(t.dur)}</td>
                        <td style={{...S.td,fontSize:11,color:"#64748b",fontFamily:"monospace"}}>{t.pred}</td>
                        <td style={S.td}>{t.rec}</td><td style={S.tdRc(t.rc)}>{t.rc?"SÍ":"NO"}</td>
                        <td style={{...S.td, width:60}}>
                          <div style={{display:"flex", gap:2, opacity:0}} className="group-hover:opacity-100">
                            <button onClick={()=>editTask(i)} style={S.btnEdit}><Edit2 size={14}/></button>
                            <button onClick={()=>handleDeleteTask(i)} style={S.btnDel}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab==="risks" && (
          <div style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <div style={S.sectionTitle}>Registro de Riesgos<div style={S.divider}/></div>
              <button style={S.btnToggle} onClick={()=>{setShowRiskForm(v=>!v); setEditIndex({type:'', idx:null});}}>
                <span style={{fontSize:16,lineHeight:1}}>{showRiskForm?"✕":"+"}</span>{showRiskForm?"Cancelar":"Nuevo Riesgo"}
              </button>
            </div>
            {showRiskForm && (
              <div style={{...S.formWrap, marginBottom:20}}>
                <div style={S.formGrid}>
                  <div><div style={S.formLabel}>ID</div><input style={S.input} value={riskForm.id} onChange={e=>setRiskForm({...riskForm,id:e.target.value})} placeholder="R01"/></div>
                  <div><div style={S.formLabel}>Título</div><input style={S.input} value={riskForm.title} onChange={e=>setRiskForm({...riskForm,title:e.target.value})} placeholder="Ej. Insumos Técnicos"/></div>
                  <div><div style={S.formLabel}>Nivel</div>
                    <select style={S.input} value={riskForm.v} onChange={e=>setRiskForm({...riskForm,v:e.target.value, badge: e.target.value==='high'?'Alto':e.target.value==='mid'?'Medio':'Bajo'})}>
                      <option value="low">Bajo</option><option value="mid">Medio</option><option value="high">Alto</option>
                    </select>
                  </div>
                  <div style={{gridColumn: "1 / -1"}}><div style={S.formLabel}>Descripción y Mitigación</div><input style={S.input} value={riskForm.desc} onChange={e=>setRiskForm({...riskForm,desc:e.target.value})} placeholder="Detalle del riesgo..."/></div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button style={S.btnPrimary} onClick={handleAddRisk}>{editIndex.idx !== null ? 'Actualizar' : 'Agregar Riesgo'}</button>
                </div>
              </div>
            )}
            {data.risks.length === 0 && (
              <div style={{textAlign:"center",padding:40,background:"var(--neutral-50)",borderRadius:8,border:"1px dashed var(--border-light)"}}><div style={{fontSize: 24, marginBottom: 8}}>🛡️</div><h4 style={{fontSize: 14, fontWeight: 600, color: "var(--neutral-900)", marginBottom: 4}}>No hay riesgos registrados</h4><p style={{fontSize: 12, color: "var(--neutral-500)", marginBottom: 16}}>Identifica posibles amenazas para mitigarlas a tiempo.</p><button onClick={()=>{setShowRiskForm(true); setEditIndex({type:'', idx:null});}} className="btn btn-primary btn-sm">+ Identificar Riesgo</button></div>
            )}
            {data.risks.map((r,i) => (
              <div key={i} style={S.riskCard(r.v)} className="group relative">
                <div style={S.riskIcon(r.v)}>{r.v==="high"?"🔴":r.v==="mid"?"🟡":"🔵"}</div>
                <div style={{flex: 1}}>
                  <div style={S.riskTitle(r.v)}>{r.id} · {r.title}<span style={S.riskBadge(r.v)}>{r.badge}</span></div>
                  <div style={S.riskDesc}>{r.desc}</div>
                </div>
                <div style={{position:"absolute", top:10, right:10, display:"flex", gap:2, opacity:0}} className="group-hover:opacity-100">
                  <button onClick={()=>editRisk(i)} style={S.btnEdit}><Edit2 size={14}/></button>
                  <button onClick={()=>onUpdate({...data, risks: data.risks.filter((_,idx)=>idx!==i)})} style={S.btnDel}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} } 
        button:hover { opacity:.9; }
        @media print {
          nav, .btn, button, .tabs, .header-buttons { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin-bottom: 20px !important; }
        }
      `}</style>
      {showFileUpload && (
        <FileUploadProcessor
          data={data}
          onUpdate={(newData) => { onUpdate(newData); setShowFileUpload(false); }}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
}
