// src/utils/exportUtils.ts
import { ProjectData, Task, Milestone } from '../types';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
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
  // Jira minimal CSV fields: Summary, Description, Issue Type, Status, Assignee, Start date, Due date
  const headers = ['Summary', 'Description', 'Issue Type', 'Status', 'Assignee', 'Start date', 'Due date', 'Original Estimate (h)'];
  
  // We need to calculate ES and EF for real dates if they aren't pre-calculated. 
  // Let's assume tasks have ES and EF if Gantt was opened, but we should do a basic calc or use what they have.
  // For safety, we export tasks in order. If they lack ES/EF, we'll just export durations.
  // But wait, the Gantt calculates it on the fly. Let's just do a naive sum for now or rely on the UI.
  // Actually, we can export just the tasks as-is, Jira uses dependencies differently.
  
  const rows = project.tasks.map(t => {
    // Escape quotes for CSV
    const summary = `"${t.name.replace(/"/g, '""')}"`;
    const desc = `"${t.id} - Importado de PM Copilot"`;
    const type = 'Task';
    const status = t.status === 'completed' ? 'Done' : (t.status === 'in_progress' ? 'In Progress' : 'To Do');
    const assignee = t.rec ? `"${t.rec}"` : '';
    const est = t.dur;
    
    // We can't perfectly know start/due here without CPM logic, so we omit exact dates or leave blank.
    // In a full app we'd extract CPM logic to a shared util and run it here.
    return [summary, desc, type, status, assignee, '', '', est].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(csvContent, `${project.name.replace(/\s+/g, '_')}_Jira_Import.csv`, 'text/csv;charset=utf-8;');
}

export function exportToICS(project: ProjectData) {
  // Create an iCalendar (.ics) file
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatICSDate = (date: Date) => {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  };

  const now = formatICSDate(new Date());
  
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PM Copilot//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  // Add milestones as full-day events
  project.milestones.forEach((m, idx) => {
    // Guess date base on start date + some weeks (since milestones use "S1", "S2")
    const weekNum = parseInt(m.w.replace(/\D/g, '')) || 1;
    const mDate = getTaskDate(weekNum * 40, project.projectStartDate);
    
    const uid = `milestone-${idx}@pmcopilot.com`;
    const dtstart = `${mDate.getFullYear()}${pad(mDate.getMonth()+1)}${pad(mDate.getDate())}`; // DATE format (whole day)
    
    icsContent.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTSTAMP:${now}`,
      `UID:${uid}`,
      `SUMMARY:HITO: ${m.n}`,
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  downloadFile(icsContent.join('\r\n'), `${project.name.replace(/\s+/g, '_')}_Calendar.ics`, 'text/calendar;charset=utf-8;');
}
