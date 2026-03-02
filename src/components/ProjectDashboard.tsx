import React, { useState, useCallback } from "react";
import { ProjectData, Task, Milestone, OEP, Activity, Risk } from "../types";
import { RefreshCw, Edit2, Check, X } from "lucide-react";

interface Props {
  data: ProjectData;
  onUpdate: (data: ProjectData) => void;
  onSync: () => void;
  isSyncing: boolean;
}

const BAR_COLORS = ["#1d4ed8","#0369a1","#059669","#7c3aed","#b45309","#dc2626","#0891b2","#65a30d"];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const S: Record<string, any> = {
  shell: { display:"grid", gridTemplateColumns:"220px 1fr", minHeight:"100vh", fontFamily:"'DM Sans', system-ui, sans-serif", background:"#f0f5ff" },
  sidebar: { background:"#1e3a8a", display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" },
  logoBox: { padding:"24px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.1)" },
  logoTitle: { fontFamily:"Georgia, serif", fontWeight:700, fontSize:17, color:"#fff", letterSpacing:.5, display:"flex", alignItems:"center", gap:10 },
  logoSub: { fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", marginTop:5, fontFamily:"monospace" },
  navSection: { padding:"16px 12px 8px", flex:1 },
  navLabel: { fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", fontFamily:"monospace", padding:"0 8px 8px" },
  navItem: (active: boolean) => ({
    display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, fontSize:13, cursor:"pointer", marginBottom:2,
    color: active ? "#fff" : "rgba(255,255,255,0.6)", background: active ? "rgba(255,255,255,0.15)" : "transparent",
    fontWeight: active ? 600 : 400, transition:"all .15s", border:"none", width:"100%", textAlign:"left"
  }),
  sideFooter: { padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,0.1)", fontSize:10, color:"rgba(255,255,255,0.45)", fontFamily:"monospace" },
  main: { padding:"28px 32px", display:"flex", flexDirection:"column", gap:20, overflowY:"auto" },
  hdrWrap: { display:"flex", alignItems:"flex-start", justifyContent:"space-between" },
  hdrH1: { fontFamily:"Georgia, serif", fontSize:24, fontWeight:700, color:"#0f172a", lineHeight:1.25 },
  hdrSub: { fontSize:12, color:"#64748b", marginTop:4 },
  badgeRow: { display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" },
  badge: (variant: string) => {
    const v: any = { warn:{bg:"#fef3c7",c:"#92400e",bd:"#fde68a"}, ok:{bg:"#dcfce7",c:"#14532d",bd:"#bbf7d0"}, blue:{bg:"#dbeafe",c:"#1e3a8a",bd:"#93c5fd"} }[variant]||{bg:"#f1f5f9",c:"#475569",bd:"#e2e8f0"};
    return { background:v.bg, color:v.c, border:`1px solid ${v.bd}`, borderRadius:20, padding:"4px 12px", fontSize:11, fontFamily:"monospace", fontWeight:600 };
  },
  card: { background:"#fff", border:"1px solid #bfdbfe", borderRadius:14, padding:"22px 24px", boxShadow:"0 1px 4px rgba(30,64,175,0.07), 0 4px 16px rgba(30,64,175,0.05)" },
  sectionTitle: { fontFamily:"Georgia, serif", fontSize:12, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#1d4ed8", display:"flex", alignItems:"center", gap:10, marginBottom:18 },
  divider: { flex:1, height:1.5, background:"#dbeafe" },
  kpiGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 },
  kpiCard: (c: string) => ({ background:"#fff", border:`1px solid ${c}30`, borderRadius:12, padding:"18px 20px", position:"relative", overflow:"hidden", boxShadow:"0 1px 4px rgba(30,64,175,0.06)" }),
  kpiStripe: (c: string) => ({ position:"absolute", top:0, left:0, right:0, height:4, background:c, borderRadius:"12px 12px 0 0" }),
  kpiTag: { fontSize:9, letterSpacing:2, color:"#94a3b8", textTransform:"uppercase", fontFamily:"monospace", marginBottom:6 },
  kpiVal: { fontSize:20, fontWeight:700, fontFamily:"Georgia, serif", color:"#0f172a", lineHeight:1, marginBottom:3 },
  kpiDesc: { fontSize:11, color:"#64748b" },
  twoCol: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 },
  msRow: { display:"flex", alignItems:"flex-start", paddingBottom:8, flexWrap: "wrap", gap: "10px 0" },
  msItem: { display:"flex", flexDirection:"column", alignItems:"center", flex:1, position:"relative", minWidth: "80px" },
  msDot: (state: string) => {
    const s: any={done:{bg:"#dcfce7",c:"#059669",bd:"#059669"},active:{bg:"#dbeafe",c:"#1d4ed8",bd:"#1d4ed8",shadow:"0 0 0 4px rgba(59,130,246,0.15)"},pending:{bg:"#f1f5f9",c:"#94a3b8",bd:"#e2e8f0"}}[state] || {bg:"#f1f5f9",c:"#94a3b8",bd:"#e2e8f0"};
    return { width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, fontFamily:"monospace", background:s.bg, color:s.c, border:`2px solid ${s.bd}`, boxShadow:s.shadow||"none", position:"relative", zIndex:1 };
  },
  msLine: (state: string) => ({ position:"absolute", top:18, left:"50%", right:"-50%", height:2, zIndex:0, background:state==="done"?"#059669":state==="active"?"linear-gradient(90deg,#059669,#3b82f6)":"#e2e8f0" }),
  msLabel: { fontSize:10, color:"#64748b", marginTop:7, textAlign:"center", maxWidth:76, lineHeight:1.4 },
  msWeek: { fontSize:9, fontFamily:"monospace", color:"#1d4ed8", marginTop:2, fontWeight:600 },
  oepItem: { display:"grid", gridTemplateColumns:"auto 1fr auto", gap:12, alignItems:"start", padding:13, borderRadius:10, background:"#eff6ff", border:"1px solid #bfdbfe", marginBottom:10 },
  oepId: { width:32, height:32, borderRadius:7, background:"#1d4ed8", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontSize:10, fontWeight:700, flexShrink:0 },
  oepName: { fontSize:13, fontWeight:600, color:"#0f172a", marginBottom:2 },
  oepKpi: { fontSize:11, color:"#64748b" },
  actItem: { display:"grid", gridTemplateColumns:"1fr auto auto auto auto", alignItems:"center", gap:12, padding:"11px 0", borderBottom:"1px solid #f1f5f9" },
  actName: { fontSize:13, fontWeight:500, color:"#0f172a" },
  actResp: { fontSize:10, color:"#94a3b8", fontFamily:"monospace" },
  actDay: { fontSize:11, fontFamily:"monospace", color:"#b45309", fontWeight:600 },
  actStatus: (s: string) => {
    const v: any={pend:{bg:"#fef3c7",c:"#92400e"},prog:{bg:"#dbeafe",c:"#1e3a8a"},ok:{bg:"#dcfce7",c:"#14532d"}}[s]||{bg:"#f1f5f9",c:"#64748b"};
    return { background:v.bg, color:v.c, fontSize:10, fontFamily:"monospace", fontWeight:600, padding:"3px 9px", borderRadius:5 };
  },
  ganttHdr: (weeks: number) => ({ display:"grid", gridTemplateColumns:`190px repeat(${weeks},1fr)`, marginBottom:8 }),
  ganttHdrCell: (active: boolean) => ({ textAlign:"center", fontSize:9, fontFamily:"monospace", color: active?"#1d4ed8":"#94a3b8", letterSpacing:1, padding:"5px 0", fontWeight: active?700:400 }),
  ganttRowGrid: { display:"grid", gridTemplateColumns:"190px 1fr", alignItems:"center", gap:12, marginBottom:10 },
  ganttTrack: (weeks: number) => ({ display:"grid", gridTemplateColumns:`repeat(${weeks},1fr)`, background:"#f8faff", borderRadius:6, height:28, overflow:"hidden", border:"1px solid #e2e8f0", position:"relative" }),
  ganttBar: (c: string) => ({ position:"absolute", top:4, height:20, borderRadius:5, background:c, display:"flex", alignItems:"center", padding:"0 7px", fontSize:10, fontFamily:"monospace", fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.15)", transition:"opacity .2s" }),
  ganttLabelName: { fontSize:12, color:"#0f172a", fontWeight:500 },
  ganttLabelSub: { fontSize:10, color:"#94a3b8", fontFamily:"monospace" },
  th: { fontSize:9, fontFamily:"monospace", letterSpacing:1.5, textTransform:"uppercase", color:"#94a3b8", padding:"0 10px 12px", textAlign:"left", borderBottom:"2px solid #dbeafe" },
  td: { padding:"10px 10px", fontSize:12, verticalAlign:"middle", borderBottom:"1px solid #f1f5f9", color:"#0f172a" },
  tdId: { padding:"10px 10px", fontSize:11, fontFamily:"monospace", color:"#1d4ed8", fontWeight:700, borderBottom:"1px solid #f1f5f9", verticalAlign:"middle" },
  tdRc: (ok: boolean) => ({ padding:"10px 10px", fontSize:10, fontFamily:"monospace", fontWeight:700, color: ok?"#059669":"#dc2626", borderBottom:"1px solid #f1f5f9", verticalAlign:"middle" }),
  tePill: { display:"inline-block", padding:"2px 8px", background:"#eff6ff", color:"#1d4ed8", borderRadius:4, fontFamily:"monospace", fontSize:11, border:"1px solid #bfdbfe" },
  formWrap: { background:"#eff6ff", border:"1.5px dashed #93c5fd", borderRadius:12, padding:"18px 16px", marginTop:14 },
  formGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:8, alignItems:"end" },
  formLabel: { fontSize:10, color:"#64748b", marginBottom:4 },
  input: { padding:"8px 10px", borderRadius:7, border:"1.5px solid #bfdbfe", background:"#fff", fontSize:12, color:"#0f172a", outline:"none", width:"100%", fontFamily:"inherit", boxSizing:"border-box" },
  btnPrimary: { padding:"8px 18px", background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  btnSecondary: { padding:"8px 14px", background:"#fff", color:"#64748b", border:"1.5px solid #bfdbfe", borderRadius:8, fontSize:12, cursor:"pointer", fontFamily:"inherit" },
  btnDel: { background:"none", border:"none", cursor:"pointer", color:"#cbd5e1", padding:"4px 6px", borderRadius:5, display:"flex", alignItems:"center", fontSize:16, lineHeight:1, transition:"all .15s" },
  btnEdit: { background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:"4px 6px", borderRadius:5, display:"flex", alignItems:"center", fontSize:14, lineHeight:1, transition:"all .15s" },
  btnToggle: { display:"flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:8, background:"#eff6ff", color:"#1d4ed8", border:"1.5px solid #bfdbfe", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  riskCard: (v: string) => {
    const colors: any={high:{bg:"#fff5f5",bd:"#fecaca"},mid:{bg:"#fffbeb",bd:"#fde68a"},low:{bg:"#eff6ff",bd:"#bfdbfe"}}[v] || {bg:"#eff6ff",bd:"#bfdbfe"};
    return { display:"flex", gap:14, alignItems:"flex-start", padding:16, borderRadius:10, marginBottom:12, background:colors.bg, border:`1.5px solid ${colors.bd}` };
  },
  riskIcon: (v: string) => {
    const c: any={high:"#dc2626",mid:"#d97706",low:"#1d4ed8"}[v] || "#1d4ed8";
    return { flexShrink:0, width:36, height:36, borderRadius:8, background:`${c}18`, display:"flex", alignItems:"center", justifyContent:"center", color:c, fontSize:18 };
  },
  riskTitle: (v: string) => ({ fontSize:13, fontWeight:700, marginBottom:4, color:{high:"#991b1b",mid:"#92400e",low:"#1e3a8a"}[v] || "#1e3a8a" }),
  riskBadge: (v: string) => {
    const s: any={high:{bg:"#fee2e2",c:"#991b1b"},mid:{bg:"#fef3c7",c:"#92400e"},low:{bg:"#dbeafe",c:"#1e3a8a"}}[v] || {bg:"#dbeafe",c:"#1e3a8a"};
    return { display:"inline-block", padding:"1px 8px", borderRadius:4, fontSize:9, fontFamily:"monospace", fontWeight:700, letterSpacing:1, textTransform:"uppercase", background:s.bg, color:s.c, marginLeft:6 };
  },
  riskDesc: { fontSize:12, color:"#334155", lineHeight:1.6 },
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

  const WEEKS = Math.max(9, ...data.tasks.map(t => t.start + t.dur + 1));
  const CURRENT_WEEK = 2;

  const handleSaveProject = () => {
    onUpdate({ ...data, ...projectForm, lastUpdated: new Date().toISOString() });
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
    if (editIndex.type === 'task' && editIndex.idx !== null) {
      newTasks[editIndex.idx] = newTask;
    } else {
      newTasks.push(newTask);
    }
    
    onUpdate({ ...data, tasks: newTasks });
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
    onUpdate({ ...data, tasks: data.tasks.filter((_, i) => i !== idx) });
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
    if (editIndex.type === 'risk' && editIndex.idx !== null) newArr[editIndex.idx] = riskForm as Risk;
    else newArr.push(riskForm as Risk);
    onUpdate({ ...data, risks: newArr });
    setRiskForm({ v:"low", id:"", title:"", badge:"Bajo", desc:"" });
    setShowRiskForm(false);
    setEditIndex({type: '', idx: null});
  };
  const editRisk = (idx: number) => { setRiskForm(data.risks[idx]); setEditIndex({type: 'risk', idx}); setShowRiskForm(true); };

  const tabs = [
    { id:"overview",  icon:"⊞", label:"Overview" },
    { id:"gantt",     icon:"▬", label:"Gantt" },
    { id:"flow",      icon:"◎", label:"Flow" },
    { id:"tasks",     icon:"≡", label:"Tasks" },
    { id:"risks",     icon:"⚠", label:"Risks" },
  ];

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.logoBox}>
          <div style={S.logoTitle}>
            <div style={{ width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>📋</div>
            PM Cop.net
          </div>
          <div style={S.logoSub}>{data.projectType || "Gestión de Proyecto"}</div>
        </div>
        <div style={S.navSection}>
          <div style={S.navLabel}>Vistas</div>
          {tabs.map(t => (
            <button key={t.id} style={S.navItem(activeTab===t.id)} onClick={()=>setActiveTab(t.id)}>
              <span style={{fontSize:14,opacity:.9}}>{t.icon}</span>{t.label}
              {t.id==="tasks" && <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"1px 7px",fontSize:9,fontFamily:"monospace"}}>{data.tasks.length}</span>}
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
      </aside>

      <main style={S.main}>
        <div style={S.hdrWrap}>
          {isEditingProject ? (
            <div style={{flex: 1, marginRight: 20}}>
              <input style={{...S.input, fontSize: 24, fontWeight: 700, marginBottom: 8}} value={projectForm.name} onChange={e=>setProjectForm({...projectForm, name: e.target.value})} placeholder="Nombre del Proyecto" />
              <input style={S.input} value={projectForm.businessObjective} onChange={e=>setProjectForm({...projectForm, businessObjective: e.target.value})} placeholder="Objetivo de Negocio" />
            </div>
          ) : (
            <div>
              <h1 style={S.hdrH1}>{data.name || "Proyecto Sin Nombre"}</h1>
              <p style={S.hdrSub}>{data.businessObjective || "Sin objetivo definido"}</p>
            </div>
          )}
          <div style={S.badgeRow}>
            {isEditingProject ? (
              <button onClick={handleSaveProject} style={{...S.btnPrimary, display: "flex", alignItems: "center", gap: 4}}><Check size={14}/> Guardar</button>
            ) : (
              <button onClick={()=>{
                setProjectForm({
                  name: data.name, businessObjective: data.businessObjective, projectType: data.projectType, status: data.status,
                  kpiScope: data.kpiScope, kpiSchedule: data.kpiSchedule, kpiBudget: data.kpiBudget, kpiQuality: data.kpiQuality,
                  flowSvg: data.flowSvg || "", wbsSvg: data.wbsSvg || ""
                });
                setIsEditingProject(true);
              }} style={{...S.btnSecondary, display: "flex", alignItems: "center", gap: 4}}><Edit2 size={14}/> Editar Info</button>
            )}
            <button onClick={onSync} disabled={isSyncing} style={{...S.badge("blue"), cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", border: "1px solid #93c5fd", background: "#eff6ff"}}>
              <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Sincronizando..." : "Sincronizar Chat"}
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', marginTop: '16px', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t.id ? '2px solid #1d4ed8' : '2px solid transparent',
                padding: '8px 4px',
                fontSize: '14px',
                fontWeight: activeTab === t.id ? 600 : 500,
                color: activeTab === t.id ? '#1d4ed8' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '16px' }}>{t.icon}</span>
              {t.label}
              {t.id === "tasks" && (
                <span style={{
                  background: activeTab === t.id ? '#eff6ff' : '#f1f5f9',
                  color: activeTab === t.id ? '#1d4ed8' : '#64748b',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 700
                }}>
                  {data.tasks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab==="overview" && <>
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
              {data.milestones.length === 0 && <span style={{fontSize:12, color:"#94a3b8"}}>No hay hitos definidos.</span>}
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
              {data.oeps.length === 0 && <span style={{fontSize:12, color:"#94a3b8"}}>No hay objetivos definidos.</span>}
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
              {data.activities.length === 0 && <span style={{fontSize:12, color:"#94a3b8"}}>No hay actividades próximas.</span>}
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

        {activeTab==="gantt" && (() => {
          const cpmTasks = calculateCPM(data.tasks);
          const projectDuration = Math.max(10, ...cpmTasks.map(t => t.EF));
          const TOTAL_UNITS = Math.ceil(projectDuration) + 2; // Add some padding
          const UNIT_WIDTH = 30; // pixels per hour/unit
          
          // Sort tasks: Critical path first, then by ES, then by ID
          const sortedTasks = [...cpmTasks].sort((a, b) => {
            if (a.ES !== b.ES) return a.ES - b.ES;
            if (a.totalSlack !== b.totalSlack) return a.totalSlack - b.totalSlack;
            return a.id.localeCompare(b.id);
          });

          return (
            <div style={{...S.card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px'}}>
              <div style={{padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{...S.sectionTitle, marginBottom: 0}}>Gantt & Ruta Crítica (Horas)<div style={S.divider}/></div>
                <div style={{display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 500, color: '#64748b'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: 12, height: 12, borderRadius: 2, background: '#ef4444'}}></div>Crítica</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: 12, height: 12, borderRadius: 2, background: '#3b82f6'}}></div>Normal</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: 12, height: 12, borderRadius: 2, background: '#eab308'}}></div>En curso</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}><div style={{width: 12, height: 12, borderRadius: 2, background: '#22c55e'}}></div>Completado</div>
                </div>
              </div>
              
              <div style={{display: 'flex', flex: 1, overflow: 'hidden'}}>
                {/* Left side: Table */}
                <div style={{width: '520px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0}}>
                  <div style={{display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '11px', color: '#64748b'}}>
                    <div style={{padding: '8px', width: '40px', borderRight: '1px solid #e2e8f0', textAlign: 'center'}}>ID</div>
                    <div style={{padding: '8px', flex: 1, borderRight: '1px solid #e2e8f0'}}>Nombre</div>
                    <div style={{padding: '8px', width: '50px', borderRight: '1px solid #e2e8f0', textAlign: 'center'}}>Dur.</div>
                    <div style={{padding: '8px', width: '60px', borderRight: '1px solid #e2e8f0', textAlign: 'center'}}>Holgura</div>
                    <div style={{padding: '8px', width: '100px', borderRight: '1px solid #e2e8f0', textAlign: 'center'}}>Inicio</div>
                    <div style={{padding: '8px', width: '100px', textAlign: 'center'}}>Fin</div>
                  </div>
                  <div style={{overflowY: 'auto', flex: 1}}>
                    {sortedTasks.map(t => (
                      <div key={t.id} style={{display: 'flex', borderBottom: '1px solid #f1f5f9', fontSize: '12px', alignItems: 'center', background: t.isCritical ? '#fef2f2' : '#fff', height: '33px'}}>
                        <div style={{padding: '0 8px', width: '40px', borderRight: '1px solid #f1f5f9', textAlign: 'center', fontWeight: 600, color: '#1d4ed8'}}>{t.id}</div>
                        <div style={{padding: '0 8px', flex: 1, borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={t.name}>{t.name}</div>
                        <div style={{padding: '0 8px', width: '50px', borderRight: '1px solid #f1f5f9', textAlign: 'center'}}>{formatDuration(t.dur)}</div>
                        <div style={{padding: '0 8px', width: '60px', borderRight: '1px solid #f1f5f9', textAlign: 'center', color: t.totalSlack <= 0 ? '#ef4444' : '#64748b', fontWeight: t.totalSlack <= 0 ? 700 : 400}}>{formatDuration(t.totalSlack)}</div>
                        <div style={{padding: '0 8px', width: '100px', borderRight: '1px solid #f1f5f9', textAlign: 'center', fontSize: '10px'}}>{formatDate(getWorkingDate(t.ES))}</div>
                        <div style={{padding: '0 8px', width: '100px', textAlign: 'center', fontSize: '10px'}}>{formatDate(getWorkingDate(t.EF))}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side: Gantt Chart */}
                <div style={{flex: 1, overflow: 'auto', background: '#fff', position: 'relative'}}>
                  <div style={{display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10}}>
                    {Array.from({length: TOTAL_UNITS}, (_, i) => (
                      <div key={i} style={{minWidth: `${UNIT_WIDTH}px`, padding: '8px 0', textAlign: 'center', fontSize: '10px', color: '#64748b', borderRight: '1px solid #e2e8f0'}}>
                        {i}
                      </div>
                    ))}
                  </div>
                  <div style={{position: 'relative', paddingTop: '8px'}}>
                    {/* Background grid */}
                    <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none'}}>
                      {Array.from({length: TOTAL_UNITS}, (_, i) => (
                        <div key={i} style={{minWidth: `${UNIT_WIDTH}px`, borderRight: '1px solid #f1f5f9'}} />
                      ))}
                    </div>
                    
                    {/* Task bars */}
                    {sortedTasks.map((t, i) => {
                      const top = i * 33 + 4; // 33px per row
                      const left = t.ES * UNIT_WIDTH;
                      const width = t.dur * UNIT_WIDTH;
                      const slackWidth = t.totalSlack * UNIT_WIDTH;
                      
                      return (
                        <div key={t.id} style={{position: 'absolute', top, left: 0, height: '24px', width: '100%'}}>
                          {/* Slack line (accordion) */}
                          {t.totalSlack > 0 && (
                            <div style={{
                              position: 'absolute', 
                              left: left + width, 
                              width: slackWidth, 
                              top: '11px', 
                              height: '4px', 
                              background: '#cbd5e1',
                              borderBottom: '2px solid #94a3b8',
                              opacity: 0.6
                            }} title={`Holgura: ${formatDuration(t.totalSlack)}`} />
                          )}
                          
                          {/* Task bar */}
                          <div 
                            onClick={() => {
                              setGanttEditTaskId(t.id);
                              setGanttEditForm({ dur: String(t.dur), pred: t.pred, status: t.status || "pending" });
                            }}
                            style={{
                            position: 'absolute',
                            left,
                            width: Math.max(width, 4), // min width
                            height: '16px',
                            top: '4px',
                            background: t.status === 'completed' ? '#22c55e' : t.status === 'in_progress' ? '#eab308' : t.isCritical ? '#ef4444' : '#3b82f6',
                            borderRadius: '2px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 4px',
                            fontSize: '9px',
                            color: '#fff',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                            cursor: 'pointer'
                          }}>
                            {t.dur > 1 ? t.name : ''}
                          </div>
                          
                          {ganttEditTaskId === t.id && (
                            <div style={{
                              position: 'absolute',
                              left: left,
                              top: '24px',
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '4px',
                              padding: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              zIndex: 100,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              width: '200px'
                            }}>
                              <div style={{fontSize: 10, fontWeight: 600, color: '#1e293b'}}>Editar Tarea {t.id}</div>
                              <div>
                                <div style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>Duración (h)</div>
                                <input style={{...S.input, padding: '2px 4px', fontSize: 10}} type="number" value={ganttEditForm.dur} onChange={e => setGanttEditForm({...ganttEditForm, dur: e.target.value})} />
                              </div>
                              <div>
                                <div style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>Predecesoras</div>
                                <input style={{...S.input, padding: '2px 4px', fontSize: 10}} value={ganttEditForm.pred} onChange={e => setGanttEditForm({...ganttEditForm, pred: e.target.value})} />
                              </div>
                              <div>
                                <div style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>Estado</div>
                                <select style={{...S.input, padding: '2px 4px', fontSize: 10}} value={ganttEditForm.status} onChange={e => setGanttEditForm({...ganttEditForm, status: e.target.value as any})}>
                                  <option value="pending">Pendiente</option>
                                  <option value="in_progress">En curso</option>
                                  <option value="completed">Completado</option>
                                </select>
                              </div>
                              <div style={{display: 'flex', gap: '4px', marginTop: '4px'}}>
                                <button style={{...S.btnPrimary, padding: '2px 6px', fontSize: 10}} onClick={() => {
                                  const newTasks = data.tasks.map(task => {
                                    if (task.id === t.id) {
                                      return { ...task, dur: parseInt(ganttEditForm.dur) || 1, pred: ganttEditForm.pred, status: ganttEditForm.status };
                                    }
                                    return task;
                                  });
                                  onUpdate({ ...data, tasks: newTasks });
                                  setGanttEditTaskId(null);
                                }}>Guardar</button>
                                <button style={{...S.btnSecondary, padding: '2px 6px', fontSize: 10}} onClick={() => setGanttEditTaskId(null)}>Cancelar</button>
                              </div>
                            </div>
                          )}
                          
                          {/* Dependencies arrows */}
                          {t.succs.map((succ: any) => {
                            const succId = succ.id;
                            const succTask = sortedTasks.find(s => s.id === succId);
                            if (!succTask) return null;
                            const succIndex = sortedTasks.findIndex(s => s.id === succId);
                            const succTop = succIndex * 33 + 4 + 8;
                            const startX = left + width;
                            const startY = top + 12;
                            const endX = succTask.ES * UNIT_WIDTH;
                            const endY = succTop;
                            
                            // Draw simple SVG line
                            return (
                              <svg key={`${t.id}-${succId}`} style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible'}}>
                                <path 
                                  d={`M ${startX} ${startY} L ${startX + 5} ${startY} L ${startX + 5} ${endY} L ${endX} ${endY}`} 
                                  fill="none" 
                                  stroke={t.isCritical && succTask.isCritical ? '#ef4444' : '#94a3b8'} 
                                  strokeWidth="1.5"
                                  markerEnd="url(#arrowhead)"
                                />
                              </svg>
                            );
                          })}
                        </div>
                      );
                    })}
                    
                    {/* SVG Definitions for arrows */}
                    <svg style={{width: 0, height: 0, position: 'absolute'}}>
                      <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                          <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                        </marker>
                      </defs>
                    </svg>
                    
                    {/* Spacer to ensure scrollability */}
                    <div style={{height: `${sortedTasks.length * 33 + 20}px`}} />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
              {isEditingProject && <span style={{fontSize:11, color:"#1d4ed8"}}>Editando SVG...</span>}
            </div>
            {isEditingProject ? (
              <textarea style={{...S.input, height: 200, fontFamily: "monospace", fontSize: 11, background: "#f8fafc"}} value={projectForm.wbsSvg} onChange={e=>setProjectForm({...projectForm, wbsSvg: e.target.value})} placeholder="<svg>...</svg>" />
            ) : <WBSDiagram svg={data.wbsSvg} />}
          </div>
        </>}

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
              <div style={{textAlign:"center",padding:40,color:"#94a3b8",fontSize:13}}>No hay tareas. Usá el botón <strong>"Nueva Tarea"</strong> para agregar.</div>
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
            {data.risks.length === 0 && <span style={{fontSize:12, color:"#94a3b8"}}>No hay riesgos registrados.</span>}
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
      </main>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} } button:hover { opacity:.9; }`}</style>
    </div>
  );
}
