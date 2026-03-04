import React, { useState } from 'react';
import { Task, TeamMember, Label } from '../types';
import { Plus } from 'lucide-react';

interface Props {
  tasks: Task[];
  team: TeamMember[];
  labels: Label[];
  onUpdate: (tasks: Task[]) => void;
  onOpenDetail: (taskId: string) => void;
  onDeleteTask: (idx: number) => void;
  onAddTask: (column: 'backlog' | 'in_progress' | 'review' | 'done') => void;
}

const COLUMNS: Array<{
  id: 'backlog' | 'in_progress' | 'review' | 'done';
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}> = [
  { id: 'backlog',     label: 'Backlog',      icon: '📋', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
  { id: 'in_progress', label: 'En Progreso',  icon: '⚡', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  { id: 'review',      label: 'En Revisión',  icon: '🔍', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { id: 'done',        label: 'Completado',   icon: '✅', color: '#059669', bg: '#f0fdf4', border: '#86efac' },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgente', color: '#dc2626', bg: '#fee2e2' },
  high:   { label: 'Alta',    color: '#ea580c', bg: '#ffedd5' },
  medium: { label: 'Media',   color: '#d97706', bg: '#fef3c7' },
  low:    { label: 'Baja',    color: '#059669', bg: '#dcfce7' },
};

function getTaskColumn(task: Task): 'backlog' | 'in_progress' | 'review' | 'done' {
  if (task.column) return task.column;
  if (task.status === 'completed') return 'done';
  if (task.status === 'in_progress') return 'in_progress';
  if (task.status === 'blocked') return 'backlog';
  return 'backlog';
}

export default function TaskBoard({ tasks, team, labels, onUpdate, onOpenDetail, onDeleteTask, onAddTask }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const getColTasks = (colId: string) => tasks.filter(t => getTaskColumn(t) === colId);

  const handleDrop = (colId: 'backlog' | 'in_progress' | 'review' | 'done') => {
    if (!draggedId) return;
    const idx = tasks.findIndex(t => t.id === draggedId);
    if (idx === -1) return;

    const statusMap: Record<string, Task['status']> = {
      backlog: 'pending',
      in_progress: 'in_progress',
      review: 'in_progress',
      done: 'completed',
    };

    const newTasks = [...tasks];
    newTasks[idx] = { ...newTasks[idx], column: colId, status: statusMap[colId] || 'pending' };
    onUpdate(newTasks);
    setDraggedId(null);
    setDragOverCol(null);
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;

  return (
    <div>
      {/* Board Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Tareas', value: totalTasks, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Completadas', value: completedTasks, color: '#059669', bg: '#f0fdf4' },
          { label: 'En Progreso', value: tasks.filter(t => t.status === 'in_progress').length, color: '#d97706', bg: '#fffbeb' },
          { label: 'Vencidas', value: overdueTasks, color: '#dc2626', bg: '#fee2e2' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}30`, borderRadius: '10px', padding: '10px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: stat.color }}>{stat.value}</span>
            <span style={{ fontSize: '11px', color: stat.color, fontWeight: 600 }}>{stat.label}</span>
          </div>
        ))}
        {totalTasks > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Progreso general:</span>
            <div style={{ width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#059669', width: `${Math.round((completedTasks / totalTasks) * 100)}%`, borderRadius: '4px', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>{Math.round((completedTasks / totalTasks) * 100)}%</span>
          </div>
        )}
      </div>

      {/* Kanban Columns */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px', alignItems: 'flex-start', minHeight: '500px' }}>
        {COLUMNS.map(col => {
          const colTasks = getColTasks(col.id);
          const isDragOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
              onDrop={() => handleDrop(col.id)}
              style={{
                minWidth: '275px',
                width: '275px',
                background: isDragOver ? col.bg : '#f8fafc',
                border: `2px solid ${isDragOver ? col.color : col.border}`,
                borderRadius: '14px',
                padding: '12px',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', padding: '0 2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{col.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{col.label}</span>
                  <span style={{
                    background: col.bg, border: `1.5px solid ${col.border}`,
                    color: col.color, borderRadius: '10px',
                    padding: '1px 8px', fontSize: '11px', fontWeight: 700
                  }}>
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddTask(col.id)}
                  title="Agregar tarea"
                  style={{ background: col.bg, border: `1px solid ${col.border}`, cursor: 'pointer', color: col.color, padding: '3px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Task Cards */}
              {colTasks.map(task => {
                const taskIdx = tasks.findIndex(t => t.id === task.id);
                const member = task.assigneeId ? team.find(m => m.id === task.assigneeId) : null;
                const taskLabels = (task.labels || []).map(lid => labels.find(l => l.id === lid)).filter(Boolean) as Label[];
                const priority = task.priority ? PRIORITY_CONFIG[task.priority] : null;
                const subtasks = task.subtasks || [];
                const doneSubtasks = subtasks.filter(s => s.done).length;
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedId(task.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                    onClick={() => onOpenDetail(task.id)}
                    style={{
                      background: '#fff',
                      border: `1.5px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      boxShadow: draggedId === task.id ? '0 8px 24px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
                      opacity: draggedId === task.id ? 0.5 : 1,
                      transition: 'box-shadow 0.15s',
                      userSelect: 'none',
                      position: 'relative',
                    }}
                  >
                    {/* Priority + ID */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8', fontWeight: 600 }}>{task.id}</span>
                      {priority && (
                        <span style={{
                          fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                          borderRadius: '4px', background: priority.bg, color: priority.color,
                          textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                          {priority.label}
                        </span>
                      )}
                    </div>

                    {/* Task Name */}
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '8px', lineHeight: 1.4 }}>
                      {task.name}
                    </div>

                    {/* Labels */}
                    {taskLabels.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        {taskLabels.map(label => (
                          <span key={label.id} style={{
                            fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                            background: label.color + '20', color: label.color,
                            fontWeight: 600, border: `1px solid ${label.color}40`
                          }}>
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress bar */}
                    {task.progress !== undefined && task.progress > 0 && (
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: task.progress === 100 ? '#059669' : col.color, width: `${task.progress}%`, borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>{task.progress}% completo</span>
                      </div>
                    )}

                    {/* Subtasks */}
                    {subtasks.length > 0 && (
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>☑</span>
                        <span>{doneSubtasks}/{subtasks.length} subtareas</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                      {member ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: member.color, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff',
                            flexShrink: 0
                          }}>
                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }}>{member.name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#cbd5e1', fontStyle: 'italic' }}>Sin asignar</span>
                      )}
                      {task.dueDate && (
                        <span style={{
                          fontSize: '10px',
                          color: isOverdue ? '#dc2626' : '#64748b',
                          fontWeight: isOverdue ? 700 : 400,
                          display: 'flex', alignItems: 'center', gap: '2px'
                        }}>
                          {isOverdue ? '⚠' : '📅'} {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {/* Delete button (appears on hover via JS) */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('¿Eliminar esta tarea?')) onDeleteTask(taskIdx);
                      }}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: '#fee2e2', border: 'none', borderRadius: '4px',
                        cursor: 'pointer', color: '#dc2626', padding: '0 5px',
                        fontSize: '14px', opacity: 0, transition: 'opacity 0.15s',
                        lineHeight: '18px'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {/* Add task at bottom */}
              <button
                onClick={() => onAddTask(col.id)}
                style={{
                  background: 'none',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s',
                  marginTop: colTasks.length === 0 ? '0' : '4px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = col.color;
                  e.currentTarget.style.color = col.color;
                  e.currentTarget.style.background = col.bg;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <Plus size={12} /> Agregar tarea
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
