import React, { useMemo } from 'react';
import { ProjectData } from '../types';
import { TrendingDown, Calendar, Clock } from 'lucide-react';

interface Props {
  data: ProjectData;
}

// Re-using the getWorkingDate logic for consistency
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

// Basic topological sort to find End times (EF) per task
function getTaskTimes(tasks: any[]) {
  // Simplified version assuming tasks already have ES/EF from Gantt or we just sum durations for actual.
  // Actually, we need real dates. Let's do a fast sequence if no ES/EF.
  let currentOffset = 0;
  return tasks.map(t => {
    const dur = Number(t.dur) || 8;
    const es = t.ES ?? currentOffset;
    const ef = t.EF ?? (es + dur);
    currentOffset = ef;
    return { ...t, ES: es, EF: ef, dur };
  });
}

export default function BurndownChart({ data }: Props) {
  const tasks = useMemo(() => getTaskTimes(data.tasks), [data.tasks]);
  
  const totalHours = tasks.reduce((sum, t) => sum + (t.dur || 0), 0);
  const completedHours = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.dur || 0), 0);
  const remainingHours = totalHours - completedHours;
  
  const projectDurationHours = tasks.length > 0 ? Math.max(...tasks.map(t => t.EF)) : 0;
  const projectDays = Math.ceil(projectDurationHours / 8);

  // SVG Chart Dimensions
  const W = 600;
  const H = 250;
  const PAD = 40;
  
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  // Generate ideal line points
  const pointsIdeal = [];
  if (projectDays > 0 && totalHours > 0) {
    pointsIdeal.push({ x: 0, y: totalHours });
    pointsIdeal.push({ x: projectDays, y: 0 });
  }

  // Generate actual line points
  // In a real app we'd track daily burndown history. 
  // Here we approximate based on completed tasks assuming they were done linearly up to "today".
  // We'll just draw a line from (0, totalHours) to (currentDay, remainingHours).
  const pointsActual = [];
  if (projectDays > 0 && totalHours > 0) {
    pointsActual.push({ x: 0, y: totalHours });
    
    // Naive current day calc based on completed vs total
    const progressRatio = totalHours > 0 ? completedHours / totalHours : 0;
    const estimatedCurrentDay = Math.max(0, Math.min(projectDays, Math.round(projectDays * progressRatio * 1.5))); // Just an approximation for visualization
    
    if (estimatedCurrentDay > 0) {
      pointsActual.push({ x: estimatedCurrentDay, y: remainingHours });
    }
  }

  const mapX = (x: number) => PAD + (projectDays === 0 ? 0 : (x / projectDays) * chartW);
  const mapY = (y: number) => H - PAD - (totalHours === 0 ? 0 : (y / totalHours) * chartH);

  const idealPath = pointsIdeal.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x)} ${mapY(p.y)}`).join(' ');
  const actualPath = pointsActual.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x)} ${mapY(p.y)}`).join(' ');

  const xGrid = [];
  for (let i = 0; i <= projectDays; i += Math.max(1, Math.floor(projectDays / 10))) {
    xGrid.push(i);
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={20} style={{ color: 'var(--primary-600)' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--neutral-800)' }}>Burndown Chart</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--neutral-500)' }}>Avance real vs planificado</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horas Totales</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--neutral-800)', fontFamily: "'JetBrains Mono', monospace" }}>{totalHours}h</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Completadas</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>{completedHours}h</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Restantes</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace" }}>{remainingHours}h</div>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--neutral-50)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--neutral-400)' }}>Agregá tareas al proyecto para visualizar el Burndown Chart.</p>
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg width={W} height={H} style={{ overflow: 'visible', margin: '0 auto', display: 'block' }}>
            {/* Grid & Axes */}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#cbd5e1" strokeWidth="2" />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#cbd5e1" strokeWidth="2" />
            
            {/* Y axis labels (Hours) */}
            <text x={PAD - 10} y={mapY(totalHours)} fontSize="10" fill="#64748b" textAnchor="end" dominantBaseline="middle">{totalHours}h</text>
            <text x={PAD - 10} y={mapY(totalHours / 2)} fontSize="10" fill="#64748b" textAnchor="end" dominantBaseline="middle">{Math.round(totalHours / 2)}h</text>
            <text x={PAD - 10} y={mapY(0)} fontSize="10" fill="#64748b" textAnchor="end" dominantBaseline="middle">0h</text>

            <line x1={PAD} y1={mapY(totalHours/2)} x2={W-PAD} y2={mapY(totalHours/2)} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />

            {/* X axis labels (Days) */}
            {xGrid.map(d => {
              const date = getWorkingDate(d * 8, data.projectStartDate);
              return (
                <g key={d}>
                  <line x1={mapX(d)} y1={H - PAD} x2={mapX(d)} y2={H - PAD + 5} stroke="#cbd5e1" strokeWidth="2" />
                  <text x={mapX(d)} y={H - PAD + 15} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">
                    {date.getDate()}/{date.getMonth() + 1}
                  </text>
                </g>
              );
            })}

            {/* Ideal Line */}
            {pointsIdeal.length > 0 && (
              <>
                <path d={idealPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />
                <circle cx={mapX(pointsIdeal[0].x)} cy={mapY(pointsIdeal[0].y)} r="4" fill="#94a3b8" />
                <circle cx={mapX(pointsIdeal[1].x)} cy={mapY(pointsIdeal[1].y)} r="4" fill="#94a3b8" />
              </>
            )}

            {/* Actual Line */}
            {pointsActual.length > 0 && (
              <>
                <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth="3" />
                {pointsActual.map((p, i) => (
                  <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                ))}
              </>
            )}

            {/* Legend inside SVG */}
            <g transform={`translate(${W - PAD - 120}, ${PAD})`}>
              <rect x="0" y="0" width="12" height="4" fill="#94a3b8" />
              <text x="18" y="4" fontSize="10" fill="#475569" dominantBaseline="middle">Plan ideal</text>
              
              <rect x="0" y="16" width="12" height="4" fill="#3b82f6" />
              <text x="18" y="20" fontSize="10" fill="#475569" dominantBaseline="middle">Avance real</text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
