import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ProjectData, Task } from '../types';
import { AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp, Shield, Zap, Bell, BellOff, ArrowRight } from 'lucide-react';

interface Props {
  data: ProjectData;
  onUpdate: (data: ProjectData) => void;
}

/* ── CPM Helper ── */
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
  while (queue.length > 0) { const u = queue.shift()!; topoOrder.push(u); nodes.get(u).succs.forEach((v: any) => { inDegree.set(v.id, inDegree.get(v.id)! - 1); if (inDegree.get(v.id) === 0) queue.push(v.id); }); }
  if (topoOrder.length < nodes.size) nodes.forEach((_, id) => { if (!topoOrder.includes(id)) topoOrder.push(id); });
  topoOrder.forEach(id => { const node = nodes.get(id); let maxES = 0; node.preds.forEach((p: any) => { const pN = nodes.get(p.id); let es = 0; if (p.type === 'FS') es = pN.EF + p.lag; else if (p.type === 'SS') es = pN.ES + p.lag; maxES = Math.max(maxES, es); }); node.ES = maxES; node.EF = node.ES + node.dur; });
  let projectDuration = 0;
  nodes.forEach(node => { projectDuration = Math.max(projectDuration, node.EF); });
  [...topoOrder].reverse().forEach(id => { const node = nodes.get(id); if (node.succs.length > 0) { let minLF = projectDuration; node.succs.forEach((s: any) => { const sN = nodes.get(s.id); let lf = projectDuration; if (s.type === 'FS') lf = sN.LS - s.lag; minLF = Math.min(minLF, lf); }); node.LF = minLF; node.LS = node.LF - node.dur; } else { node.LF = projectDuration; node.LS = node.LF - node.dur; } });
  nodes.forEach(node => { node.totalSlack = node.LS - node.ES; node.isCritical = node.totalSlack <= 0; });
  return { nodes: Array.from(nodes.values()), projectDuration };
}

function formatDuration(hours: number): string {
  if (hours <= 0) return '0h';
  const d = Math.floor(hours / 8);
  const h = hours % 8;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

/* ── Alerts Engine ── */
interface Alert { level: 'critical' | 'warning' | 'info' | 'success'; title: string; message: string; action?: { label: string; onClick: () => void }; }

function generateAlerts(data: ProjectData, cpmNodes: any[]): Alert[] {
  const alerts: Alert[] = [];
  const totalTasks = data.tasks.length;
  if (totalTasks === 0) return [{ level: 'info', title: 'Sin tareas', message: 'No hay tareas definidas todavía. Agregá tareas para activar el monitoreo autónomo.' }];

  const completedCount = data.tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = data.tasks.filter(t => t.status === 'in_progress').length;
  const pendingCount = data.tasks.filter(t => t.status === 'pending' || !t.status).length;
  const criticalTasks = cpmNodes.filter(t => t.isCritical);
  const criticalPending = criticalTasks.filter(t => t.status !== 'completed');
  const highRisks = data.risks.filter(r => r.v === 'high');

  // Critical path tasks not started
  const criticalNotStarted = criticalTasks.filter(t => (!t.status || t.status === 'pending'));
  if (criticalNotStarted.length > 0) {
    alerts.push({
      level: 'critical',
      title: `${criticalNotStarted.length} tarea(s) crítica(s) sin iniciar`,
      message: `Las tareas ${criticalNotStarted.map((t: any) => t.id).join(', ')} están en la ruta crítica y no se han iniciado. Cualquier retraso impactará directamente la fecha de entrega.`
    });
  }

  // Blocked tasks (predecessor not completed)
  const blocked: string[] = [];
  cpmNodes.forEach(node => {
    if (node.status === 'pending' || !node.status) {
      node.preds.forEach((p: any) => {
        const predNode = cpmNodes.find((n: any) => n.id === p.id);
        if (predNode && predNode.status === 'in_progress') {
          blocked.push(node.id);
        }
      });
    }
  });
  if (blocked.length > 0) {
    alerts.push({
      level: 'warning',
      title: `${blocked.length} tarea(s) esperando predecesoras`,
      message: `Las tareas ${blocked.join(', ')} dependen de tareas que aún están en curso.`
    });
  }

  // High risks
  if (highRisks.length > 0) {
    alerts.push({
      level: 'warning',
      title: `${highRisks.length} riesgo(s) de nivel alto`,
      message: `Riesgos activos: ${highRisks.map(r => r.title).join(', ')}. Requieren atención inmediata.`
    });
  }

  // No risks registered
  if (data.risks.length === 0 && totalTasks > 2) {
    alerts.push({
      level: 'info',
      title: 'Sin riesgos registrados',
      message: 'Se recomienda identificar al menos 3-5 riesgos potenciales para una gestión proactiva.'
    });
  }

  // High risks without mitigation owner
  const unownedHighRisks = data.risks.filter(r => r.v === 'high' && r.status !== 'closed' && !r.owner);
  if (unownedHighRisks.length > 0) {
    alerts.push({
      level: 'warning',
      title: `${unownedHighRisks.length} riesgo(s) alto(s) sin dueño asignado`,
      message: `Los riesgos ${unownedHighRisks.map(r => r.id).join(', ')} no tienen un responsable de mitigación.`
    });
  }

  // Open critical issues
  const criticalIssues = (data.issues || []).filter(i => i.priority === 'critical' && (i.status === 'open' || i.status === 'in_progress'));
  if (criticalIssues.length > 0) {
    alerts.push({
      level: 'critical',
      title: `${criticalIssues.length} issue(s) crítico(s) abierto(s)`,
      message: `Issues: ${criticalIssues.map(i => i.title).join(', ')}. Requieren resolución inmediata.`
    });
  }

  // Pending change requests
  const pendingCRs = (data.changeRequests || []).filter(c => c.status === 'pending');
  if (pendingCRs.length > 0) {
    alerts.push({
      level: 'info',
      title: `${pendingCRs.length} solicitud(es) de cambio pendiente(s)`,
      message: `Hay solicitudes de cambio esperando aprobación: ${pendingCRs.map(c => c.title).join(', ')}.`
    });
  }

  // No resources registered
  if ((data.resources || []).length === 0 && totalTasks > 2) {
    alerts.push({
      level: 'info',
      title: 'Sin recursos registrados',
      message: 'Definí los recursos del proyecto para habilitar la matriz RACI y la asignación de carga.'
    });
  }

  // Progress check
  if (completedCount === totalTasks) {
    alerts.push({ level: 'success', title: '¡Todas las tareas completadas!', message: 'El proyecto ha finalizado todas sus tareas con éxito.' });
  } else if (completedCount > 0 && inProgressCount === 0 && pendingCount > 0) {
    alerts.push({
      level: 'warning',
      title: 'Sin tareas en curso',
      message: `Hay ${pendingCount} tareas pendientes pero ninguna en ejecución. Verificá si corresponde iniciar alguna.`
    });
  }

  // Good progress
  const progressPct = (completedCount / totalTasks) * 100;
  if (progressPct >= 50 && progressPct < 100) {
    alerts.push({ level: 'success', title: `Avance del ${Math.round(progressPct)}%`, message: `${completedCount} de ${totalTasks} tareas completadas. ¡Buen ritmo!` });
  }

  return alerts;
}

/* ── Auto-Status Suggestions ── */
interface StatusSuggestion { taskId: string; taskName: string; currentStatus: string; suggestedStatus: string; reason: string; }

function generateStatusSuggestions(data: ProjectData, cpmNodes: any[]): StatusSuggestion[] {
  const suggestions: StatusSuggestion[] = [];

  cpmNodes.forEach(node => {
    // Tasks with all predecessors completed should be in_progress
    if ((!node.status || node.status === 'pending') && node.preds.length > 0) {
      const allPredsCompleted = node.preds.every((p: any) => {
        const predNode = cpmNodes.find((n: any) => n.id === p.id);
        return predNode && predNode.status === 'completed';
      });
      if (allPredsCompleted) {
        suggestions.push({
          taskId: node.id,
          taskName: node.name,
          currentStatus: 'Pendiente',
          suggestedStatus: 'En curso',
          reason: 'Todas las predecesoras fueron completadas'
        });
      }
    }
  });

  return suggestions;
}

/* ── Component ── */
export default function ProjectHealth({ data, onUpdate }: Props) {
  const { nodes: cpmNodes, projectDuration } = useMemo(() => quickCPM(data.tasks), [data.tasks]);

  // Feature 4: Browser notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const sentNotifIds = useRef<Set<string>>(new Set());

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') localStorage.setItem('pm_notifications_enabled', '1');
  };
  
  // EVM Calculations — corrected PV based on working hours elapsed
  const evm = useMemo(() => {
    const now = new Date();
    const startDate = new Date(data.projectStartDate || new Date());
    startDate.setHours(8, 0, 0, 0);

    // Calculate working hours elapsed since project start
    let workingHoursElapsed = 0;
    const cursor = new Date(startDate);
    while (cursor < now) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) workingHoursElapsed += 8;
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalBudget = cpmNodes.reduce((s, t) => s + (t.dur || 0), 0);
    let pv = 0; // Planned Value at current date
    let ev = 0; // Earned Value
    let ac = 0; // Actual Cost (hours)

    cpmNodes.forEach(t => {
      const dur = t.dur || 0;
      const es = t.ES || 0;
      const ef = t.EF || (es + dur);

      // PV: how much of this task SHOULD be done by now based on schedule
      let plannedPct = 0;
      if (workingHoursElapsed >= ef) plannedPct = 1;
      else if (workingHoursElapsed > es && dur > 0) plannedPct = (workingHoursElapsed - es) / dur;
      pv += dur * plannedPct;

      // EV: actual % complete * budget
      const pct = (t.percentComplete ?? (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0)) / 100;
      ev += dur * pct;

      // AC: actual hours logged, fallback to EV-based estimate
      ac += t.actualHours || (dur * pct);
    });

    const spi = pv > 0 ? ev / pv : (ev > 0 ? 1.0 : 0);
    const cpi = ac > 0 ? ev / ac : (ev > 0 ? 1.0 : 0);
    const bac = totalBudget;
    const eac = cpi > 0 ? bac / cpi : bac;
    const etc = Math.max(0, eac - ac);
    const vac = bac - eac;

    return { pv, ev, ac, spi, cpi, bac, eac, etc, vac };
  }, [cpmNodes, data.projectStartDate]);

  const alerts = useMemo(() => generateAlerts(data, cpmNodes), [data, cpmNodes]);
  const statusSuggestions = useMemo(() => generateStatusSuggestions(data, cpmNodes), [data, cpmNodes]);

  // Feature 4: send browser notifications for new critical alerts
  useEffect(() => {
    if (notifPermission !== 'granted') return;
    if (localStorage.getItem('pm_notifications_enabled') !== '1') return;
    alerts.filter(a => a.level === 'critical').forEach(a => {
      const key = `${data.id}::${a.title}`;
      if (!sentNotifIds.current.has(key)) {
        sentNotifIds.current.add(key);
        try { new Notification(`PM Copilot — ${data.name}`, { body: a.message, icon: '/vite.svg' }); } catch { /* ignore */ }
      }
    });
  }, [alerts, notifPermission, data.id, data.name]);

  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = data.tasks.filter(t => t.status === 'in_progress').length;
  const pendingTasks = totalTasks - completedTasks - inProgressTasks;
  const criticalCount = cpmNodes.filter(t => t.isCritical).length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Health score: 0-100
  const healthScore = useMemo(() => {
    if (totalTasks === 0) return 0;
    let score = 100;
    const criticalPendingCount = cpmNodes.filter(t => t.isCritical && (!t.status || t.status === 'pending')).length;
    score -= criticalPendingCount * 15;
    score -= data.risks.filter(r => r.v === 'high' && r.status !== 'closed').length * 10;
    score -= (data.issues || []).filter(i => i.priority === 'critical' && i.status !== 'closed').length * 12;
    score -= (data.changeRequests || []).filter(c => c.status === 'pending').length * 3;
    if (inProgressTasks === 0 && pendingTasks > 0) score -= 15;
    if (data.risks.length === 0 && totalTasks > 2) score -= 5;
    if (evm.spi < 0.8) score -= 15;
    else if (evm.spi < 1) score -= 5;
    if (evm.cpi < 0.8) score -= 10;
    score = Math.max(0, Math.min(100, score));
    score = Math.round(score * (0.5 + 0.5 * (completedTasks / totalTasks)));
    return Math.max(0, Math.round(score));
  }, [data, cpmNodes, totalTasks, completedTasks, inProgressTasks, pendingTasks, evm]);

  const healthColor = healthScore >= 70 ? 'var(--success)' : healthScore >= 40 ? 'var(--warning)' : 'var(--error)';
  const healthLabel = healthScore >= 70 ? 'Saludable' : healthScore >= 40 ? 'Atención' : 'Crítico';

  const handleApplySuggestion = (suggestion: StatusSuggestion) => {
    const newTasks = data.tasks.map(t => t.id === suggestion.taskId ? { ...t, status: 'in_progress' as const } : t);
    onUpdate({ ...data, tasks: newTasks, lastUpdated: new Date().toISOString() });
  };

  const handleApplyAll = () => {
    let newTasks = [...data.tasks];
    statusSuggestions.forEach(s => {
      newTasks = newTasks.map(t => t.id === s.taskId ? { ...t, status: 'in_progress' as const } : t);
    });
    onUpdate({ ...data, tasks: newTasks, lastUpdated: new Date().toISOString() });
  };

  const alertIcons = { critical: AlertTriangle, warning: Bell, info: Shield, success: CheckCircle };
  const alertColors = {
    critical: { bg: '#fef2f2', border: '#fecaca', icon: 'var(--error)', title: '#991b1b', text: '#7f1d1d' },
    warning: { bg: '#fffbeb', border: '#fde68a', icon: 'var(--warning)', title: '#92400e', text: '#78350f' },
    info: { bg: 'var(--primary-50)', border: 'var(--primary-200)', icon: 'var(--primary-600)', title: 'var(--primary-800)', text: 'var(--primary-900)' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', icon: 'var(--success)', title: '#166534', text: '#14532d' },
  };

  return (
    <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Health Score Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          {/* Score Circle */}
          <div 
            title="El Health Score (0-100) mide la salud de tu proyecto en tiempo real considerando la ruta crítica, progreso de tareas y riesgos activos de alto impacto."
            style={{ width: 200, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-light)', background: 'var(--neutral-50)', cursor: 'help' }}
          >
            <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 12 }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--neutral-200)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={healthColor} strokeWidth="8"
                  strokeDasharray={`${(healthScore / 100) * 264} 264`}
                  strokeDashoffset="0" strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: healthColor, fontFamily: "'JetBrains Mono', monospace" }}>{healthScore}</span>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: healthColor }}>{healthLabel}</span>
            <span style={{ fontSize: 10, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>HEALTH SCORE</span>
          </div>

          {/* Stats */}
          <div style={{ flex: 1, padding: 24 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>
              Panel de Control Autónomo
              <div className="section-divider" />
              {typeof Notification !== 'undefined' && notifPermission !== 'granted' && (
                <button
                  onClick={requestNotifications}
                  title="Activar alertas del navegador para tareas críticas"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--neutral-50)', cursor: 'pointer', color: 'var(--neutral-600)', fontWeight: 600 }}
                >
                  <Bell size={12} /> Activar notificaciones
                </button>
              )}
              {notifPermission === 'granted' && (
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                  <Bell size={12} /> Notificaciones activas
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                { label: 'Progreso', value: `${progressPct}%`, icon: TrendingUp, color: progressPct >= 50 ? 'var(--success)' : 'var(--warning)', sub: `SPI: ${evm.spi.toFixed(2)}`, tip: 'Schedule Performance Index: >1 indica adelanto, <1 indica retraso respecto al plan base.' },
                { label: 'Duración', value: formatDuration(projectDuration), icon: Clock, color: 'var(--primary-600)', sub: `CPI: ${evm.cpi.toFixed(2)}`, tip: 'Cost Performance Index: >1 indica eficiencia, <1 indica sobrecosto.' },
                { label: 'Ruta Crítica', value: `${criticalCount}`, icon: AlertTriangle, color: criticalCount > 0 ? 'var(--error)' : 'var(--success)', sub: 'tareas', tip: 'Cantidad de tareas que, si se demoran, retrasarán todo el proyecto.' },
                { label: 'Riesgos', value: `${data.risks.length}`, icon: Shield, color: data.risks.filter(r => r.v === 'high').length > 0 ? 'var(--error)' : 'var(--primary-600)', sub: `${data.risks.filter(r => r.v === 'high' && r.status !== 'closed').length} altos`, tip: 'Riesgos registrados que requieren seguimiento continuo.' },
                { label: 'EV / PV', value: `${Math.round(evm.ev)}h`, icon: Zap, color: evm.spi >= 1 ? 'var(--success)' : 'var(--warning)', sub: `PV: ${Math.round(evm.pv)}h`, tip: `Earned Value vs Planned Value a la fecha. BAC: ${Math.round(evm.bac)}h | EAC: ${Math.round(evm.eac)}h | ETC: ${Math.round(evm.etc)}h` }
              ].map((stat, i) => (
                <div key={i} title={stat.tip} style={{ padding: '10px 14px', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'help' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <stat.icon size={14} style={{ color: stat.color }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase' }}>{stat.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-900)', fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</span>
                    <span style={{ fontSize: 10, color: 'var(--neutral-500)', fontFamily: "'JetBrains Mono', monospace" }}>{stat.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: 'var(--neutral-500)', fontWeight: 500 }}>Avance del proyecto</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: 'var(--neutral-700)' }}>{completedTasks}/{totalTasks} tareas</span>
              </div>
              <div style={{ height: 8, background: 'var(--neutral-100)', borderRadius: 10, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`, background: 'var(--success)', borderRadius: 10, transition: 'width 0.5s ease' }} />
                <div style={{ width: `${totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0}%`, background: 'var(--warning)', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }} />{completedTasks} completadas</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warning)', display: 'inline-block' }} />{inProgressTasks} en curso</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--neutral-200)', display: 'inline-block' }} />{pendingTasks} pendientes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Suggestions */}
      {statusSuggestions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid #c7d2fe' }}>
          <div style={{ padding: '14px 20px', background: 'var(--primary-50)', borderBottom: '1px solid var(--primary-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: 'var(--primary-600)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-800)' }}>Actualizaciones de Estado Sugeridas</span>
              <span className="badge badge-info" style={{ fontSize: 9 }}>{statusSuggestions.length}</span>
            </div>
            <button onClick={handleApplyAll} className="btn btn-primary btn-sm">
              Aplicar Todas
            </button>
          </div>
          <div style={{ padding: 16 }}>
            {statusSuggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: i < statusSuggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--primary-600)' }}>{s.taskId}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.taskName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--neutral-500)' }}>
                    <span className="badge badge-neutral" style={{ fontSize: 9 }}>{s.currentStatus}</span>
                    <ArrowRight size={12} />
                    <span className="badge badge-info" style={{ fontSize: 9 }}>{s.suggestedStatus}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>{s.reason}</span>
                  <button onClick={() => handleApplySuggestion(s)} className="btn btn-sm btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>
                    Aplicar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} style={{ color: 'var(--neutral-500)' }} />
          <span className="section-title" style={{ marginBottom: 0 }}>Alertas y Notificaciones<div className="section-divider" /></span>
        </div>
        <div style={{ padding: 12 }}>
          {alerts.map((alert, i) => {
            const Icon = alertIcons[alert.level];
            const colors = alertColors[alert.level];
            return (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 'var(--radius-md)', marginBottom: i < alerts.length - 1 ? 8 : 0, transition: 'transform 0.15s' }}>
                <Icon size={18} style={{ color: colors.icon, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.title, marginBottom: 3 }}>{alert.title}</div>
                  <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>{alert.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
