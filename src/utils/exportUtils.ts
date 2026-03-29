// src/utils/exportUtils.ts
import { ProjectData, Task, Milestone } from '../types';

function downloadFile(content: string, filename: string, mimeType: string) {
  // Add UTF-8 BOM for CSV files so Excel reads accented characters correctly
  const needsBOM = mimeType.includes('csv') || filename.endsWith('.csv');
  const bom = needsBOM ? '\uFEFF' : '';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper to get real date for task based on start offset
function getTaskDate(hoursOffset: number, startDateStr: string): Date {
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

export function exportToJiraCSV(project: ProjectData) {
  const headers = ['Summary', 'Description', 'Issue Type', 'Status', 'Assignee', 'Priority', 'Original Estimate (h)'];
  
  const rows = project.tasks.map(t => {
    const summary = `"${t.name.replace(/"/g, '""')}"`;
    const desc = `"${t.id} - Pred: ${t.pred || '-'} | Importado de PM Copilot"`;
    const type = 'Task';
    const status = t.status === 'completed' ? 'Done' : (t.status === 'in_progress' ? 'In Progress' : 'To Do');
    const assignee = t.rec ? `"${t.rec}"` : '';
    const priority = t.priority === 'critical' ? 'Highest' : t.priority === 'high' ? 'High' : t.priority === 'low' ? 'Low' : 'Medium';
    return [summary, desc, type, status, assignee, priority, t.dur].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, `${project.name.replace(/\s+/g, '_')}_Jira_Import.csv`, 'text/csv;charset=utf-8;');
}

export function exportToICS(project: ProjectData) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatICSDate = (date: Date) => {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  };

  const now = formatICSDate(new Date());
  
  let icsContent = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PM Copilot//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'
  ];

  project.milestones.forEach((m, idx) => {
    const weekNum = parseInt(m.w.replace(/\D/g, '')) || 1;
    const mDate = getTaskDate(weekNum * 40, project.projectStartDate);
    const uid = `milestone-${idx}@pmcopilot.com`;
    const dtstart = `${mDate.getFullYear()}${pad(mDate.getMonth()+1)}${pad(mDate.getDate())}`;
    icsContent.push('BEGIN:VEVENT', `DTSTART;VALUE=DATE:${dtstart}`, `DTSTAMP:${now}`, `UID:${uid}`, `SUMMARY:HITO: ${m.n}`, 'END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');
  downloadFile(icsContent.join('\r\n'), `${project.name.replace(/\s+/g, '_')}_Calendar.ics`, 'text/calendar;charset=utf-8;');
}

export function exportToMSProjectXML(project: ProjectData) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const startDate = new Date(project.projectStartDate || new Date());

  let taskXml = '';
  project.tasks.forEach((t, i) => {
    const uid = i + 1;
    const durHours = Number(t.dur) || 8;
    const durDays = Math.ceil(durHours / 8);
    const tStart = getTaskDate(t.start || 0, project.projectStartDate);
    const tEnd = getTaskDate((t.start || 0) + durHours, project.projectStartDate);
    taskXml += `
    <Task>
      <UID>${uid}</UID>
      <ID>${uid}</ID>
      <Name>${escapeXml(t.name)}</Name>
      <Duration>PT${durDays * 8}H0M0S</Duration>
      <Start>${fmtDate(tStart)}</Start>
      <Finish>${fmtDate(tEnd)}</Finish>
      <PercentComplete>${t.percentComplete || (t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0)}</PercentComplete>
      <Priority>${t.priority === 'critical' ? 1000 : t.priority === 'high' ? 700 : t.priority === 'low' ? 200 : 500}</Priority>
      ${t.rc ? '<Critical>1</Critical>' : '<Critical>0</Critical>'}
    </Task>`;
  });

  let resourceXml = '';
  (project.resources || []).forEach((r, i) => {
    resourceXml += `
    <Resource>
      <UID>${i + 1}</UID>
      <ID>${i + 1}</ID>
      <Name>${escapeXml(r.name)}</Name>
      <MaxUnits>${(r.availability || 100) / 100}</MaxUnits>
      <StandardRate>${r.costPerHour || 0}</StandardRate>
    </Resource>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${escapeXml(project.name)}</Name>
  <StartDate>${fmtDate(startDate)}</StartDate>
  <CalendarUID>1</CalendarUID>
  <Tasks>${taskXml}
  </Tasks>
  <Resources>${resourceXml}
  </Resources>
</Project>`;

  downloadFile(xml, `${project.name.replace(/\s+/g, '_')}_MSProject.xml`, 'application/xml;charset=utf-8;');
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function exportWeeklyStatusReport(project: ProjectData) {
  const now = new Date();
  const fmtDate = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const totalT = project.tasks.length;
  const completedT = project.tasks.filter(t => t.status === 'completed').length;
  const inProgressT = project.tasks.filter(t => t.status === 'in_progress').length;
  const pendingT = totalT - completedT - inProgressT;
  const pct = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
  const highRisks = project.risks.filter(r => r.v === 'high' && r.status !== 'closed');
  const openIssues = (project.issues || []).filter(i => i.status !== 'closed' && i.status !== 'resolved');
  const pendingCRs = (project.changeRequests || []).filter(c => c.status === 'pending');
  const recentActivities = project.activities.filter(a => a.s !== 'ok').slice(0, 8);
  const nextMilestone = project.milestones.find(m => m.s === 'active' || m.s === 'pending');

  const semaforoColor = pct >= 70 && highRisks.length === 0 ? '#10b981' : pct >= 40 || highRisks.length <= 1 ? '#f59e0b' : '#ef4444';
  const semaforoLabel = semaforoColor === '#10b981' ? 'VERDE' : semaforoColor === '#f59e0b' ? 'AMARILLO' : 'ROJO';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Status Report - ${esc(project.name)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:40px;max-width:900px;margin:0 auto;font-size:13px}
  h1{font-size:22px;font-weight:800;margin-bottom:2px} h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;margin:24px 0 10px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:16px;margin-bottom:20px}
  .semaforo{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:10px;letter-spacing:1px}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .kpi{padding:12px;border:1px solid #e2e8f0;border-radius:8px;border-left:4px solid}
  .kpi-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
  .kpi-val{font-size:18px;font-weight:800;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px} th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#475569;border:1px solid #e2e8f0}
  td{padding:7px 12px;border:1px solid #e2e8f0;font-size:12px} .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div>
    <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Status Report Semanal</div>
    <h1>${esc(project.name)}</h1>
    <div style="font-size:12px;color:#64748b;margin-top:4px">${esc(project.projectType)} · ${esc(project.methodology?.toUpperCase() || 'PREDICTIVE')} · ${fmtDate}</div>
  </div>
  <div style="text-align:right">
    <div class="semaforo" style="background:${semaforoColor};margin-left:auto">${semaforoLabel}</div>
    <div style="font-size:11px;color:#64748b;margin-top:6px">Estado: <strong>${esc(project.status)}</strong></div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi" style="border-left-color:#059669"><div class="kpi-label">Avance</div><div class="kpi-val" style="color:#059669">${pct}%</div></div>
  <div class="kpi" style="border-left-color:#1d4ed8"><div class="kpi-label">Tareas</div><div class="kpi-val" style="color:#1d4ed8">${completedT}/${totalT}</div></div>
  <div class="kpi" style="border-left-color:#d97706"><div class="kpi-label">Riesgos Altos</div><div class="kpi-val" style="color:${highRisks.length > 0 ? '#dc2626' : '#059669'}">${highRisks.length}</div></div>
  <div class="kpi" style="border-left-color:#7c3aed"><div class="kpi-label">Issues Abiertos</div><div class="kpi-val" style="color:${openIssues.length > 0 ? '#d97706' : '#059669'}">${openIssues.length}</div></div>
</div>

<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:20px">
  <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Resumen Ejecutivo</div>
  <div style="font-size:13px;line-height:1.6;color:#334155">${esc(project.businessObjective)}</div>
  ${nextMilestone ? `<div style="margin-top:8px;font-size:12px;color:#1d4ed8;font-weight:600">Próximo hito: ${esc(nextMilestone.n)} (${esc(nextMilestone.w)})</div>` : ''}
</div>

<h2>Progreso de Tareas</h2>
<div style="display:flex;gap:16px;margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:12px;height:12px;border-radius:3px;background:#10b981;display:inline-block"></span> ${completedT} Completadas</div>
  <div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:12px;height:12px;border-radius:3px;background:#f59e0b;display:inline-block"></span> ${inProgressT} En Curso</div>
  <div style="display:flex;align-items:center;gap:6px;font-size:12px"><span style="width:12px;height:12px;border-radius:3px;background:#e2e8f0;display:inline-block"></span> ${pendingT} Pendientes</div>
</div>
<div style="height:12px;background:#f1f5f9;border-radius:8px;overflow:hidden;display:flex;margin-bottom:20px">
  <div style="width:${totalT > 0 ? (completedT / totalT) * 100 : 0}%;background:#10b981"></div>
  <div style="width:${totalT > 0 ? (inProgressT / totalT) * 100 : 0}%;background:#f59e0b"></div>
</div>

${recentActivities.length > 0 ? `<h2>Actividades en Curso / Próximas</h2>
<table><thead><tr><th>Actividad</th><th>Responsable</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
${recentActivities.map(a => `<tr><td>${esc(a.n)}</td><td>${esc(a.r)}</td><td>${esc(a.d)}</td><td><span class="badge" style="background:${a.s === 'prog' ? '#fef3c7' : '#f1f5f9'};color:${a.s === 'prog' ? '#92400e' : '#475569'}">${a.s === 'prog' ? 'En curso' : 'Pendiente'}</span></td></tr>`).join('')}
</tbody></table>` : ''}

${highRisks.length > 0 ? `<h2>Riesgos de Alto Impacto</h2>
<table><thead><tr><th>ID</th><th>Riesgo</th><th>Score</th><th>Owner</th></tr></thead><tbody>
${highRisks.map(r => `<tr><td style="font-weight:700;color:#dc2626">${esc(r.id)}</td><td>${esc(r.title)}${r.desc ? ` — ${esc(r.desc)}` : ''}</td><td>${r.riskScore || '?'}</td><td>${esc(r.owner || 'Sin asignar')}</td></tr>`).join('')}
</tbody></table>` : ''}

${openIssues.length > 0 ? `<h2>Issues Abiertos</h2>
<table><thead><tr><th>ID</th><th>Issue</th><th>Prioridad</th><th>Responsable</th></tr></thead><tbody>
${openIssues.map(i => `<tr><td style="font-weight:700">${esc(i.id)}</td><td>${esc(i.title)}</td><td><span class="badge" style="background:${i.priority === 'critical' ? '#fef2f2' : i.priority === 'high' ? '#fef3c7' : '#f1f5f9'};color:${i.priority === 'critical' ? '#dc2626' : i.priority === 'high' ? '#92400e' : '#475569'}">${esc(i.priority)}</span></td><td>${esc(i.assignee || '-')}</td></tr>`).join('')}
</tbody></table>` : ''}

${pendingCRs.length > 0 ? `<h2>Solicitudes de Cambio Pendientes</h2>
<table><thead><tr><th>ID</th><th>Cambio</th><th>Solicitante</th><th>Impacto Alcance</th></tr></thead><tbody>
${pendingCRs.map(c => `<tr><td style="font-weight:700">${esc(c.id)}</td><td>${esc(c.title)}</td><td>${esc(c.requestedBy)}</td><td>${esc(c.impactScope)}</td></tr>`).join('')}
</tbody></table>` : ''}

<div class="footer">
  <span>PM Copilot — Status Report generado el ${now.toLocaleString('es-AR')}</span>
  <span>Proyecto: ${esc(project.id.slice(0, 8).toUpperCase())}</span>
</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function exportToPDF(project: ProjectData) {
  const totalT = project.tasks.length;
  const completedT = project.tasks.filter(t => t.status === 'completed').length;
  const inProgressT = project.tasks.filter(t => t.status === 'in_progress').length;
  const pendingT = totalT - completedT - inProgressT;
  const pct = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;
  const now = new Date();
  const fmtDate = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  const highRisks = project.risks.filter(r => r.v === 'high' && r.status !== 'closed');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(project.name)} - PM Copilot</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:40px;max-width:960px;margin:0 auto;font-size:13px}
  h1{font-size:24px;font-weight:800;margin-bottom:4px}
  h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#475569;margin:28px 0 12px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
  .header{border-bottom:3px solid #1d4ed8;padding-bottom:16px;margin-bottom:24px}
  .meta{font-size:12px;color:#64748b;margin-top:4px}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .kpi{padding:14px;border:1px solid #e2e8f0;border-radius:8px;border-top:3px solid}
  .kpi-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase}
  .kpi-val{font-size:20px;font-weight:800;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#475569;border:1px solid #e2e8f0}
  td{padding:7px 12px;border:1px solid #e2e8f0;font-size:12px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
  .progress-bar{height:10px;background:#f1f5f9;border-radius:6px;overflow:hidden;margin:8px 0}
  .progress-fill{height:100%;border-radius:6px}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{body{padding:20px} @page{margin:15mm}}
</style></head><body>
<div class="header">
  <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">PM Copilot · Documento de Proyecto</div>
  <h1>${esc(project.name)}</h1>
  <div class="meta">${esc(project.projectType)} · ${esc(project.methodology?.toUpperCase() || 'PREDICTIVE')} · Generado: ${fmtDate}</div>
  <div class="meta" style="margin-top:6px"><strong>Objetivo:</strong> ${esc(project.businessObjective)}</div>
</div>

<div class="kpi-grid">
  <div class="kpi" style="border-top-color:#059669"><div class="kpi-label">Avance</div><div class="kpi-val" style="color:#059669">${pct}%</div></div>
  <div class="kpi" style="border-top-color:#1d4ed8"><div class="kpi-label">Tareas</div><div class="kpi-val" style="color:#1d4ed8">${completedT}/${totalT}</div></div>
  <div class="kpi" style="border-top-color:#d97706"><div class="kpi-label">En Curso</div><div class="kpi-val" style="color:#d97706">${inProgressT}</div></div>
  <div class="kpi" style="border-top-color:#7c3aed"><div class="kpi-label">Pendientes</div><div class="kpi-val" style="color:#7c3aed">${pendingT}</div></div>
</div>

<div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,#059669,#10b981)"></div></div>

<h2>Cronograma de Tareas</h2>
<table><thead><tr><th>ID</th><th>Tarea</th><th>Duración</th><th>Estado</th><th>Predecesoras</th><th>Recursos</th><th>RC</th></tr></thead><tbody>
${project.tasks.map(t => {
  const statusLabel = t.status === 'completed' ? 'Completado' : t.status === 'in_progress' ? 'En curso' : 'Pendiente';
  const statusColor = t.status === 'completed' ? '#166534;background:#dcfce7' : t.status === 'in_progress' ? '#854d0e;background:#fef08a' : '#475569;background:#f1f5f9';
  return `<tr><td style="font-weight:700;color:#1d4ed8">${esc(t.id)}</td><td>${esc(t.name)}</td><td style="font-family:monospace;font-size:11px">${t.dur}h</td><td><span class="badge" style="color:${statusColor}">${statusLabel}</span></td><td style="font-family:monospace;font-size:11px;color:#64748b">${esc(t.pred || '-')}</td><td>${esc(t.rec)}</td><td style="font-weight:600;color:${t.rc ? '#059669' : '#dc2626'}">${t.rc ? 'SÍ' : 'NO'}</td></tr>`;
}).join('')}
</tbody></table>

${project.milestones.length > 0 ? `<h2>Hitos</h2>
<table><thead><tr><th>#</th><th>Hito</th><th>Semana/Fecha</th><th>Estado</th></tr></thead><tbody>
${project.milestones.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.n)}</td><td>${esc(m.w)}</td><td><span class="badge" style="color:${m.s === 'done' ? '#166534;background:#dcfce7' : m.s === 'active' ? '#1e40af;background:#dbeafe' : '#475569;background:#f1f5f9'}">${m.s === 'done' ? 'Completado' : m.s === 'active' ? 'Activo' : 'Pendiente'}</span></td></tr>`).join('')}
</tbody></table>` : ''}

${project.risks.length > 0 ? `<h2>Riesgos</h2>
<table><thead><tr><th>ID</th><th>Riesgo</th><th>Nivel</th><th>Estado</th><th>Descripción</th></tr></thead><tbody>
${project.risks.map(r => `<tr><td style="font-weight:700">${esc(r.id)}</td><td>${esc(r.title)}</td><td><span class="badge" style="color:${r.v === 'high' ? '#dc2626;background:#fef2f2' : r.v === 'mid' ? '#92400e;background:#fef3c7' : '#1e40af;background:#dbeafe'}">${esc(r.badge)}</span></td><td>${r.status === 'closed' ? 'Cerrado' : 'Abierto'}</td><td style="font-size:11px;color:#64748b">${esc(r.desc)}</td></tr>`).join('')}
</tbody></table>` : ''}

${project.oeps.length > 0 ? `<h2>Objetivos (OEPs)</h2>
<table><thead><tr><th>ID</th><th>Objetivo</th><th>KPI</th></tr></thead><tbody>
${project.oeps.map(o => `<tr><td style="font-weight:700;color:#1d4ed8">${esc(o.id)}</td><td>${esc(o.n)}</td><td>${esc(o.kpi)}</td></tr>`).join('')}
</tbody></table>` : ''}

<div class="footer">
  <span>PM Copilot — Generado el ${now.toLocaleString('es-AR')}</span>
  <span>Proyecto: ${esc(project.id.slice(0, 8).toUpperCase())}</span>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => {
      setTimeout(() => {
        w.print();
        URL.revokeObjectURL(url);
      }, 400);
    };
  } else {
    // Fallback: download as HTML
    downloadFile(html, `${project.name.replace(/\s+/g, '_')}_Proyecto.html`, 'text/html;charset=utf-8');
  }
}
