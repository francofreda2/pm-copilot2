import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Task } from '../types';
import { ZoomIn, ZoomOut, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

/* ─── helpers reused from dashboard ─── */
function parseDependency(predStr: string) {
  const match = predStr.match(/^([a-zA-Z0-9.-]+)(FS|SS|FF|SF)?([+-]\d+(?:\.\d+)?)?$/i);
  if (match) return { id: match[1], type: (match[2] || 'FS').toUpperCase(), lag: parseFloat(match[3] || '0') };
  return { id: predStr.replace(/[^0-9a-zA-Z.-]/g, ''), type: 'FS', lag: 0 };
}

function calculateCPM(tasks: Task[]) {
  const nodes = new Map<string, any>();
  tasks.forEach(t => nodes.set(t.id, { ...t, dur: Number(t.dur) || 0, ES: 0, EF: 0, LS: 0, LF: 0, totalSlack: 0, freeSlack: 0, isCritical: false, status: t.status || 'pending', preds: [], succs: [] }));

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
    node.ES = maxES;
    node.EF = node.ES + node.dur;
  });

  let projectDuration = 0;
  nodes.forEach(node => { projectDuration = Math.max(projectDuration, node.EF); });

  [...topoOrder].reverse().forEach(id => {
    const node = nodes.get(id);
    if (node.succs.length > 0) {
      let minLF = projectDuration;
      node.succs.forEach((s: any) => {
        const sN = nodes.get(s.id);
        let lf = projectDuration;
        if (s.type === 'FS') lf = sN.LS - s.lag;
        else if (s.type === 'SS') lf = sN.LS - s.lag + node.dur;
        else if (s.type === 'FF') lf = sN.LF - s.lag;
        else if (s.type === 'SF') lf = sN.LF - s.lag + node.dur;
        minLF = Math.min(minLF, lf);
      });
      node.LF = minLF; node.LS = node.LF - node.dur;
    } else { node.LF = projectDuration; node.LS = node.LF - node.dur; }
  });

  nodes.forEach(node => {
    node.totalSlack = node.LS - node.ES;
    if (node.succs.length > 0) {
      let minES = projectDuration;
      node.succs.forEach((s: any) => {
        const sN = nodes.get(s.id);
        let es = projectDuration;
        if (s.type === 'FS') es = sN.ES - s.lag;
        else if (s.type === 'SS') es = sN.ES - s.lag + node.dur;
        else if (s.type === 'FF') es = sN.EF - s.lag;
        else if (s.type === 'SF') es = sN.EF - s.lag + node.dur;
        minES = Math.min(minES, es);
      });
      node.freeSlack = minES - node.EF;
    } else { node.freeSlack = node.totalSlack; }
    node.isCritical = node.totalSlack <= 0;
  });

  return Array.from(nodes.values());
}

function formatDuration(hours: number): string {
  if (hours <= 0) return '0h';
  const d = Math.floor(hours / 8);
  const h = hours % 8;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

function getWorkingDate(hoursOffset: number, startDateStr: string): Date {
  const d = new Date(startDateStr);
  d.setHours(8, 0, 0, 0);
  let remaining = hoursOffset;
  while (remaining > 0.001) {
    if (d.getDay() === 0) { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); continue; }
    if (d.getDay() === 6) { d.setDate(d.getDate() + 2); d.setHours(8, 0, 0, 0); continue; }
    if (d.getHours() < 8) d.setHours(8, 0, 0, 0);
    if (d.getHours() >= 16) { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); continue; }
    let available = 16 - d.getHours() - (d.getMinutes() / 60);
    if (remaining <= available) {
      const totalMins = Math.round(d.getMinutes() + remaining * 60);
      d.setHours(d.getHours() + Math.floor(totalMins / 60)); d.setMinutes(totalMins % 60);
      remaining = 0;
    } else { remaining -= available; d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); }
  }
  return d;
}

function fmtDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/* ─── component ─── */
const ROW_H = 36;
const ZOOM_LEVELS = [
  { label: 'Horas', unitPx: 20, headerFn: (i: number, start: string) => `${i}h` },
  { label: 'Días (8h)', unitPx: 40, headerFn: (i: number, start: string) => {
    const d = getWorkingDate(i * 8, start);
    return fmtDate(d);
  }},
  { label: 'Semanas', unitPx: 80, headerFn: (i: number, start: string) => {
    const d = getWorkingDate(i * 40, start);
    return `S${i + 1} (${fmtDate(d)})`;
  }},
];

interface Props {
  tasks: Task[];
  projectStartDate: string;
  onUpdateTasks: (tasks: Task[]) => void;
}

export default function GanttChart({ tasks, projectStartDate, onUpdateTasks }: Props) {
  const [zoomLevel, setZoomLevel] = useState(1); // default to Days
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ dur: '', pred: '', status: 'pending' as any });
  const [dragState, setDragState] = useState<{ taskId: string; mode: 'move' | 'resize'; startX: number; origES: number; origDur: number } | null>(null);
  const ganttAreaRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_LEVELS[zoomLevel];
  const divisor = zoomLevel === 0 ? 1 : zoomLevel === 1 ? 8 : 40;
  const unitPx = zoom.unitPx;

  const cpmTasks = useMemo(() => calculateCPM(tasks), [tasks]);
  const projectDuration = Math.max(8, ...cpmTasks.map(t => t.EF));
  const totalUnits = Math.ceil(projectDuration / divisor) + 3;
  const criticalCount = cpmTasks.filter(t => t.isCritical).length;

  const sortedTasks = useMemo(() =>
    [...cpmTasks].sort((a, b) => a.ES !== b.ES ? a.ES - b.ES : a.totalSlack - b.totalSlack),
    [cpmTasks]
  );

  /* Drag handlers */
  const handleMouseDown = useCallback((e: React.MouseEvent, taskId: string, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    const t = cpmTasks.find(x => x.id === taskId);
    if (!t) return;
    setDragState({ taskId, mode, startX: e.clientX, origES: t.ES, origDur: t.dur });
  }, [cpmTasks]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const deltaUnits = Math.round(dx / unitPx) * divisor;

    const newTasks = tasks.map(t => {
      if (t.id !== dragState.taskId) return t;
      if (dragState.mode === 'resize') {
        const newDur = Math.max(1, dragState.origDur + deltaUnits);
        return { ...t, dur: newDur };
      } else {
        // For 'move', we can't directly set ES since CPM computes it from predecessors
        // Instead we adjust duration to simulate the effect
        return t;
      }
    });
    onUpdateTasks(newTasks);
  }, [dragState, tasks, onUpdateTasks, unitPx, divisor]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingTaskId) return;
    const newTasks = tasks.map(t => {
      if (t.id !== editingTaskId) return t;
      return { ...t, dur: parseInt(editForm.dur) || t.dur, pred: editForm.pred, status: editForm.status };
    });
    onUpdateTasks(newTasks);
    setEditingTaskId(null);
  }, [editingTaskId, editForm, tasks, onUpdateTasks]);

  const getBarColor = (t: any) => {
    if (t.status === 'completed') return 'var(--success)';
    if (t.status === 'in_progress') return 'var(--warning)';
    if (t.isCritical) return 'var(--error)';
    return 'var(--brand-navy)';
  };

  if (tasks.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <Clock size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 8 }}>No hay tareas para mostrar en el Gantt.</p>
        <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Agregá tareas en la pestaña "Tasks" o pedíselo a PM Copilot en el Chat.</p>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          Gantt & Ruta Crítica
          <div className="section-divider" />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Project stats */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginRight: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <Clock size={13} style={{ color: 'var(--primary-600)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-700)', fontFamily: "'JetBrains Mono', monospace" }}>{formatDuration(projectDuration)}</span>
              <span style={{ fontSize: 10, color: 'var(--neutral-500)' }}>total</span>
            </div>
            {criticalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', fontFamily: "'JetBrains Mono', monospace" }}>{criticalCount}</span>
                <span style={{ fontSize: 10, color: '#991b1b' }}>críticas</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 10, fontSize: 10, fontWeight: 500, color: 'var(--neutral-500)' }}>
            {[
              { color: 'var(--error)', label: 'Crítica' },
              { color: 'var(--brand-navy)', label: 'Normal' },
              { color: 'var(--warning)', label: 'En curso' },
              { color: 'var(--success)', label: 'Completada' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--neutral-100)', borderRadius: 'var(--radius-md)', padding: 3 }}>
            <button
              onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
              disabled={zoomLevel === 0}
              className="btn-icon"
              style={{ width: 28, height: 28, opacity: zoomLevel === 0 ? 0.3 : 1 }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)', minWidth: 60, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
              {zoom.label}
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(ZOOM_LEVELS.length - 1, zoomLevel + 1))}
              disabled={zoomLevel === ZOOM_LEVELS.length - 1}
              className="btn-icon"
              style={{ width: 28, height: 28, opacity: zoomLevel === ZOOM_LEVELS.length - 1 ? 0.3 : 1 }}
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt area */}
      <div
        style={{ display: 'flex', height: Math.min(600, (sortedTasks.length + 1) * ROW_H + 50), overflow: 'hidden' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Left: Task Table */}
        <div style={{ width: 460, borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
          {/* Table Header */}
          <div style={{ display: 'flex', background: 'var(--neutral-100)', borderBottom: '1px solid var(--border-light)', fontWeight: 600, fontSize: 10, color: 'var(--neutral-600)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>
            <div style={{ padding: '10px 8px', width: 45, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>ID</div>
            <div style={{ padding: '10px 8px', flex: 1, borderRight: '1px solid var(--border-light)' }}>Nombre</div>
            <div style={{ padding: '10px 8px', width: 55, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>Dur.</div>
            <div style={{ padding: '10px 8px', width: 55, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>Holgura</div>
            <div style={{ padding: '10px 8px', width: 70, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>Inicio</div>
            <div style={{ padding: '10px 8px', width: 70, textAlign: 'center' }}>Fin</div>
          </div>
          {/* Task Rows */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sortedTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, alignItems: 'center', background: t.isCritical ? '#fff5f5' : '#fff', height: ROW_H, cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => { setEditingTaskId(t.id); setEditForm({ dur: String(t.dur), pred: t.pred, status: t.status || 'pending' }); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.isCritical ? '#ffe2e2' : 'var(--neutral-50)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = t.isCritical ? '#fff5f5' : '#fff')}
              >
                <div style={{ padding: '0 8px', width: 45, textAlign: 'center', fontWeight: 700, color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, borderRight: '1px solid var(--border-subtle)' }}>{t.id}</div>
                <div style={{ padding: '0 8px', flex: 1, borderRight: '1px solid var(--border-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.name}>{t.name}</div>
                <div style={{ padding: '0 8px', width: 55, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, borderRight: '1px solid var(--border-subtle)' }}>{formatDuration(t.dur)}</div>
                <div style={{ padding: '0 8px', width: 55, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: t.totalSlack <= 0 ? '#ef4444' : 'var(--neutral-500)', fontWeight: t.totalSlack <= 0 ? 700 : 400, borderRight: '1px solid var(--border-subtle)' }}>{formatDuration(t.totalSlack)}</div>
                <div style={{ padding: '0 8px', width: 70, textAlign: 'center', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", borderRight: '1px solid var(--border-subtle)' }}>{fmtDate(getWorkingDate(t.ES, projectStartDate))}</div>
                <div style={{ padding: '0 8px', width: 70, textAlign: 'center', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(getWorkingDate(t.EF, projectStartDate))}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Gantt Bars */}
        <div ref={ganttAreaRef} style={{ flex: 1, overflow: 'auto', background: '#fff', position: 'relative' }}>
          {/* Time header */}
          <div style={{ display: 'flex', background: 'var(--neutral-50)', borderBottom: '2px solid var(--border-light)', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
            {Array.from({ length: totalUnits }, (_, i) => (
              <div key={i} style={{ minWidth: unitPx, textAlign: 'center', fontSize: 10, color: 'var(--neutral-400)', fontFamily: "'JetBrains Mono', monospace", borderRight: '1px solid var(--border-light)', padding: '10px 0', fontWeight: 500 }}>
                {zoom.headerFn(i, projectStartDate)}
              </div>
            ))}
          </div>

          {/* Rows + bars */}
          <div style={{ position: 'relative' }}>
            {/* Background grid lines */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
              {Array.from({ length: totalUnits }, (_, i) => (
                <div key={i} style={{ minWidth: unitPx, borderRight: '1px solid var(--border-subtle)' }} />
              ))}
            </div>

            {/* Row backgrounds */}
            {sortedTasks.map((_, i) => (
              <div key={i} style={{ height: ROW_H, borderBottom: '1px solid var(--border-subtle)' }} />
            ))}

            {/* SVG layer for dependency arrows */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: totalUnits * unitPx, height: sortedTasks.length * ROW_H, pointerEvents: 'none', overflow: 'visible' }}>
              <defs>
                <marker id="gantt-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                </marker>
                <marker id="gantt-arrow-crit" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
              </defs>
              {sortedTasks.map((t) =>
                t.succs.map((succ: any) => {
                  const succTask = sortedTasks.find((s: any) => s.id === succ.id);
                  if (!succTask) return null;
                  const srcIdx = sortedTasks.indexOf(t);
                  const dstIdx = sortedTasks.indexOf(succTask);
                  const isBothCritical = t.isCritical && succTask.isCritical;

                  const startX = (t.ES / divisor) * unitPx + (t.dur / divisor) * unitPx;
                  const startY = srcIdx * ROW_H + ROW_H / 2;
                  const endX = (succTask.ES / divisor) * unitPx;
                  const endY = dstIdx * ROW_H + ROW_H / 2;

                  const midX = startX + 8;

                  return (
                    <path
                      key={`${t.id}-${succ.id}`}
                      d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
                      fill="none"
                      stroke={isBothCritical ? '#ef4444' : '#cbd5e1'}
                      strokeWidth={isBothCritical ? 2 : 1.5}
                      strokeDasharray={isBothCritical ? '' : '4,3'}
                      markerEnd={isBothCritical ? 'url(#gantt-arrow-crit)' : 'url(#gantt-arrow)'}
                      opacity={0.7}
                    />
                  );
                })
              )}
            </svg>

            {/* Task bars */}
            {sortedTasks.map((t, i) => {
              const left = (t.ES / divisor) * unitPx;
              const width = Math.max((t.dur / divisor) * unitPx, 6);
              const slackWidth = (t.totalSlack / divisor) * unitPx;
              const top = i * ROW_H + (ROW_H - 20) / 2;
              const barColor = getBarColor(t);

              return (
                <div key={t.id} style={{ position: 'absolute', top: i * ROW_H, left: 0, height: ROW_H, width: '100%' }}>
                  {/* Slack indicator */}
                  {t.totalSlack > 0 && (
                    <div
                      title={`Holgura: ${formatDuration(t.totalSlack)}`}
                      style={{
                        position: 'absolute',
                        left: left + width,
                        top: top + 8,
                        width: slackWidth,
                        height: 4,
                        background: '#e2e8f0',
                        borderRadius: 2,
                        opacity: 0.6,
                      }}
                    />
                  )}

                  {/* Main bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width,
                      height: 20,
                      background: barColor,
                      borderRadius: 4,
                      boxShadow: `0 1px 3px ${barColor}50`,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px',
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                      color: '#fff',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      cursor: dragState ? 'grabbing' : 'pointer',
                      zIndex: 2,
                      transition: dragState?.taskId === t.id ? 'none' : 'all 0.15s',
                    }}
                    onClick={() => {
                      setEditingTaskId(t.id);
                      setEditForm({ dur: String(t.dur), pred: t.pred, status: t.status || 'pending' });
                    }}
                  >
                    {width > 40 ? t.name : t.id}

                    {/* Resize handle on right edge */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, t.id, 'resize')}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: 8,
                        height: '100%',
                        cursor: 'ew-resize',
                        borderRadius: '0 4px 4px 0',
                        background: 'rgba(255,255,255,0.15)',
                      }}
                    />
                  </div>

                  {/* Edit popup */}
                  {editingTaskId === t.id && (
                    <div
                      style={{
                        position: 'absolute',
                        left: Math.max(left, 0),
                        top: top + 26,
                        background: '#fff',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        padding: 14,
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        width: 240,
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-800)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: barColor }} />
                        Editar {t.id}: {t.name}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--neutral-500)', marginBottom: 3, fontWeight: 600 }}>Duración (h)</div>
                          <input className="form-input form-input-sm" type="number" value={editForm.dur} onChange={e => setEditForm({ ...editForm, dur: e.target.value })} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--neutral-500)', marginBottom: 3, fontWeight: 600 }}>Estado</div>
                          <select className="form-input form-input-sm form-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}>
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En curso</option>
                            <option value="completed">Completado</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--neutral-500)', marginBottom: 3, fontWeight: 600 }}>Predecesoras</div>
                        <input className="form-input form-input-sm" value={editForm.pred} onChange={e => setEditForm({ ...editForm, pred: e.target.value })} placeholder="T1, T2FS+2" />
                      </div>

                      {/* Impact preview */}
                      {parseInt(editForm.dur) !== t.dur && (
                        <div style={{ padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', marginBottom: 10, fontSize: 11 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                            <AlertTriangle size={12} />
                            Impacto del cambio
                          </div>
                          <div style={{ color: '#78716c' }}>
                            Duración: {formatDuration(t.dur)} <ArrowRight size={10} style={{ display: 'inline' }} /> {formatDuration(parseInt(editForm.dur) || 0)}
                            {parseInt(editForm.dur) > t.dur && t.isCritical && (
                              <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 3 }}>
                                ⚠ Tarea crítica — el proyecto se extenderá {formatDuration(parseInt(editForm.dur) - t.dur)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>Guardar</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingTaskId(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
