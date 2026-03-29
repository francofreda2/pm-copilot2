import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task } from '../types';
import { Clock, User, Pencil, Check, X } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
}

const COLUMNS = [
  { id: 'pending', title: 'Pendiente', color: 'var(--neutral-200)', headerColor: 'var(--neutral-600)' },
  { id: 'in_progress', title: 'En curso', color: 'var(--warning-light)', headerColor: 'var(--warning)' },
  { id: 'completed', title: 'Completado', color: 'var(--success-light)', headerColor: 'var(--success)' },
];

interface EditingState {
  taskId: string;
  name: string;
  dur: string;
  rec: string;
  pred: string;
}

export default function KanbanBoard({ tasks, onUpdateTasks }: KanbanBoardProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newTasks = Array.from(tasks);
    const taskIndex = newTasks.findIndex(t => t.id === draggableId);
    if (taskIndex === -1) return;

    newTasks[taskIndex] = { ...newTasks[taskIndex], status: destination.droppableId as Task['status'] };
    onUpdateTasks(newTasks);
  };

  const startEditing = (task: Task) => {
    setEditing({
      taskId: task.id,
      name: task.name,
      dur: String(task.dur ?? ''),
      rec: task.rec ?? '',
      pred: task.pred ?? '',
    });
  };

  const saveEditing = () => {
    if (!editing) return;
    const newTasks = tasks.map(t =>
      t.id === editing.taskId
        ? { ...t, name: editing.name.trim() || t.name, dur: Number(editing.dur) || t.dur, rec: editing.rec, pred: editing.pred }
        : t
    );
    onUpdateTasks(newTasks);
    setEditing(null);
  };

  const cancelEditing = () => setEditing(null);

  const getTasksByStatus = (status: string) =>
    tasks.filter(t => (t.status || 'pending') === status);

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%', minHeight: 400, overflowX: 'auto', paddingBottom: 10 }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        {COLUMNS.map(col => (
          <div key={col.id} style={{
            flex: 1,
            minWidth: 280,
            background: 'var(--neutral-50)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '2px solid',
              borderBottomColor: col.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
              borderTopLeftRadius: 'var(--radius-md)',
              borderTopRightRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: col.headerColor, textTransform: 'uppercase', letterSpacing: 1 }}>{col.title}</span>
              <span style={{ background: 'var(--neutral-100)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: 'var(--neutral-600)' }}>
                {getTasksByStatus(col.id).length}
              </span>
            </div>

            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    flex: 1,
                    padding: 12,
                    background: snapshot.isDraggingOver ? 'var(--primary-50)' : 'transparent',
                    transition: 'background 0.2s ease',
                    overflowY: 'auto'
                  }}
                >
                  {getTasksByStatus(col.id).map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="card-interactive"
                          style={{
                            userSelect: 'none',
                            padding: 16,
                            margin: '0 0 10px 0',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-md)',
                            border: editing?.taskId === task.id ? '2px solid var(--primary-400)' : '1px solid var(--border-light)',
                            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-xs)',
                            transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                            ...provided.draggableProps.style,
                          }}
                        >
                          {editing?.taskId === task.id ? (
                            /* ── Edit mode ── */
                            <div onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace" }}>{task.id}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={saveEditing} title="Guardar" style={{ background: 'var(--success)', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                                    <Check size={12} />
                                  </button>
                                  <button onClick={cancelEditing} title="Cancelar" style={{ background: 'var(--neutral-300)', border: 'none', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--neutral-700)' }}>
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                              <input
                                autoFocus
                                value={editing.name}
                                onChange={e => setEditing(prev => prev && { ...prev, name: e.target.value })}
                                onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                placeholder="Nombre de la tarea"
                                style={{ width: '100%', marginBottom: 6, padding: '4px 8px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-light)', borderRadius: 4, background: 'var(--bg-input, #fff)', color: 'var(--neutral-900)', boxSizing: 'border-box' }}
                              />
                              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: 10, color: 'var(--neutral-500)', display: 'block', marginBottom: 2 }}>Duración (h)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={editing.dur}
                                    onChange={e => setEditing(prev => prev && { ...prev, dur: e.target.value })}
                                    style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid var(--border-light)', borderRadius: 4, background: 'var(--bg-input, #fff)', color: 'var(--neutral-900)', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: 10, color: 'var(--neutral-500)', display: 'block', marginBottom: 2 }}>Responsable</label>
                                  <input
                                    value={editing.rec}
                                    onChange={e => setEditing(prev => prev && { ...prev, rec: e.target.value })}
                                    placeholder="Sin asignar"
                                    style={{ width: '100%', padding: '4px 8px', fontSize: 12, border: '1px solid var(--border-light)', borderRadius: 4, background: 'var(--bg-input, #fff)', color: 'var(--neutral-900)', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: 10, color: 'var(--neutral-500)', display: 'block', marginBottom: 2 }}>Predecesoras (ej: T1, T2)</label>
                                <input
                                  value={editing.pred}
                                  onChange={e => setEditing(prev => prev && { ...prev, pred: e.target.value })}
                                  placeholder="-"
                                  style={{ width: '100%', padding: '4px 8px', fontSize: 12, fontFamily: 'monospace', border: '1px solid var(--border-light)', borderRadius: 4, background: 'var(--bg-input, #fff)', color: 'var(--neutral-900)', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>
                          ) : (
                            /* ── View mode ── */
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-600)', fontFamily: "'JetBrains Mono', monospace" }}>{task.id}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 10, color: 'var(--neutral-500)', background: 'var(--neutral-100)', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Clock size={10} /> {task.dur}h
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); startEditing(task); }}
                                    title="Editar tarea"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-500)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--neutral-400)')}
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </div>
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-900)', marginBottom: 12, lineHeight: 1.3 }}>
                                {task.name}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--neutral-600)' }}>
                                  <User size={12} /> {task.rec || 'Sin asignar'}
                                </div>
                                {task.pred && task.pred !== '-' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--neutral-500)', fontFamily: 'monospace' }}>
                                    Pre: {task.pred}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
}
