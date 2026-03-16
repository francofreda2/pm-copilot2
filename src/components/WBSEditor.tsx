import React, { useState, useCallback } from 'react';
import { WBSNode } from '../types';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, Check, X, FolderOpen, FileText, Layers, Box } from 'lucide-react';

interface Props {
  nodes: WBSNode[];
  projectName: string;
  onChange: (nodes: WBSNode[]) => void;
}

const LEVEL_COLORS = [
  { bg: '#fff', text: 'var(--neutral-900)', border: 'var(--brand-navy)', label: 'Proyecto' },
  { bg: '#fff', text: 'var(--neutral-900)', border: 'var(--primary-600)', label: 'Fase' },
  { bg: '#fff', text: 'var(--neutral-800)', border: 'var(--success)', label: 'Entregable' },
  { bg: '#fff', text: 'var(--neutral-700)', border: 'var(--warning)', label: 'Paquete' },
  { bg: 'var(--neutral-50)', text: 'var(--neutral-600)', border: 'var(--neutral-400)', label: 'Tarea' },
];
const LEVEL_ICONS = [Layers, FolderOpen, Box, FileText, FileText];

function generateId(): string {
  return 'wbs-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
}

function WBSNodeComponent({
  node,
  onUpdate,
  onDelete,
  onAddChild,
  depth = 0
}: {
  node: WBSNode;
  onUpdate: (updated: WBSNode) => void;
  onDelete: () => void;
  onAddChild: () => void;
  depth?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editOwner, setEditOwner] = useState(node.owner || '');
  const [editDuration, setEditDuration] = useState(node.duration || '');

  const levelStyle = LEVEL_COLORS[Math.min(node.level, LEVEL_COLORS.length - 1)];
  const LevelIcon = LEVEL_ICONS[Math.min(node.level, LEVEL_ICONS.length - 1)];
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = node.collapsed && hasChildren;
  const isRoot = node.level === 0;

  const handleToggle = () => {
    if (hasChildren) {
      onUpdate({ ...node, collapsed: !node.collapsed });
    }
  };

  const handleSave = () => {
    onUpdate({ ...node, name: editName, owner: editOwner, duration: editDuration });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(node.name);
    setEditOwner(node.owner || '');
    setEditDuration(node.duration || '');
    setIsEditing(false);
  };

  const handleChildUpdate = (index: number, updated: WBSNode) => {
    const newChildren = [...node.children];
    newChildren[index] = updated;
    onUpdate({ ...node, children: newChildren });
  };

  const handleChildDelete = (index: number) => {
    const newChildren = node.children.filter((_, i) => i !== index);
    onUpdate({ ...node, children: newChildren });
  };

  const handleChildAdd = (parentIndex: number) => {
    const parentNode = node.children[parentIndex];
    const newChild: WBSNode = {
      id: generateId(),
      name: 'Nuevo elemento',
      level: parentNode.level + 1,
      children: [],
    };
    const newChildren = [...node.children];
    newChildren[parentIndex] = { ...parentNode, children: [...parentNode.children, newChild], collapsed: false };
    onUpdate({ ...node, children: newChildren });
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 0 : 0 }}>
      {/* Node Card */}
      <div
        className="group"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          marginBottom: 6,
          position: 'relative',
        }}
      >
        {/* Vertical + Horizontal connector lines */}
        {depth > 0 && (
          <>
            <div style={{
              position: 'absolute',
              left: -20,
              top: 0,
              bottom: '50%',
              width: 1,
              background: 'var(--neutral-200)',
            }} />
            <div style={{
              position: 'absolute',
              left: -20,
              top: '50%',
              width: 20,
              height: 1,
              background: 'var(--neutral-200)',
            }} />
          </>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={handleToggle}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: hasChildren ? 'var(--neutral-100)' : 'transparent',
            borderRadius: 6,
            cursor: hasChildren ? 'pointer' : 'default',
            color: 'var(--neutral-500)',
            flexShrink: 0,
            marginRight: 4,
            marginTop: 6,
            transition: 'all 0.15s',
          }}
        >
          {hasChildren ? (
            isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />
          ) : (
            <span style={{ width: 14, height: 14, display: 'block' }} />
          )}
        </button>

        {/* Main Node Box */}
        <div
          style={{
            flex: 1,
            background: levelStyle.bg,
            color: levelStyle.text,
            borderRadius: 'var(--radius-sm) var(--radius-md) var(--radius-md) var(--radius-sm)',
            border: `1px solid var(--border-light)`,
            borderLeft: `4px solid ${levelStyle.border}`,
            padding: isEditing ? '10px 14px' : '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-xs)',
            position: 'relative',
            minHeight: 44,
          }}
          onDoubleClick={() => !isRoot && setIsEditing(true)}
        >
          <LevelIcon size={16} style={{ opacity: 0.7, flexShrink: 0 }} />

          {isEditing ? (
            <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                className="form-input form-input-sm"
                style={{ flex: '1 1 140px', minWidth: 100, background: 'rgba(255,255,255,0.95)', color: 'var(--neutral-900)' }}
                placeholder="Nombre"
              />
              <input
                value={editOwner}
                onChange={e => setEditOwner(e.target.value)}
                className="form-input form-input-sm"
                style={{ flex: '0 1 100px', minWidth: 80, background: 'rgba(255,255,255,0.95)', color: 'var(--neutral-900)' }}
                placeholder="Responsable"
              />
              <input
                value={editDuration}
                onChange={e => setEditDuration(e.target.value)}
                className="form-input form-input-sm"
                style={{ flex: '0 1 70px', minWidth: 60, background: 'rgba(255,255,255,0.95)', color: 'var(--neutral-900)' }}
                placeholder="Duración"
              />
              <button onClick={handleSave} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '4px 8px' }}>
                <Check size={14} />
              </button>
              <button onClick={handleCancel} className="btn btn-sm" style={{ background: 'var(--neutral-200)', color: 'var(--neutral-600)', border: 'none', padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{node.name}</span>
                {(node.owner || node.duration) && (
                  <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
                    {node.owner && <span>{node.owner}</span>}
                    {node.owner && node.duration && <span> · </span>}
                    {node.duration && <span>{node.duration}</span>}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 9,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: 1,
                opacity: 0.5,
                textTransform: 'uppercase',
              }}>
                {levelStyle.label}
              </span>

              {/* Action buttons */}
              <div
                className="group-hover-visible"
                style={{
                  display: 'flex',
                  gap: 2,
                  opacity: 0,
                  transition: 'opacity 0.15s',
                }}
              >
                {node.level < 4 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddChild(); }}
                    title="Agregar hijo"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '3px 5px',
                      cursor: 'pointer',
                      color: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={13} />
                  </button>
                )}
                {!isRoot && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                      title="Editar"
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 5px',
                        cursor: 'pointer',
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      title="Eliminar"
                      style={{
                        background: 'rgba(220,38,38,0.15)',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 5px',
                        cursor: 'pointer',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div style={{
          marginLeft: 34,
          paddingLeft: 20,
          borderLeft: '1px solid var(--neutral-200)',
          position: 'relative',
        }}>
          {node.children.map((child, index) => (
            <WBSNodeComponent
              key={child.id}
              node={child}
              depth={depth + 1}
              onUpdate={(updated) => handleChildUpdate(index, updated)}
              onDelete={() => handleChildDelete(index)}
              onAddChild={() => handleChildAdd(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WBSEditor({ nodes, projectName, onChange }: Props) {
  // Create root node from project data or use existing
  const rootNode: WBSNode = nodes.length > 0 && nodes[0].level === 0
    ? nodes[0]
    : {
        id: 'root',
        name: projectName || 'Proyecto',
        level: 0,
        children: nodes.filter(n => n.level !== 0),
      };

  const handleRootUpdate = useCallback((updated: WBSNode) => {
    onChange([updated]);
  }, [onChange]);

  const handleAddPhase = useCallback(() => {
    const newPhase: WBSNode = {
      id: generateId(),
      name: 'Nueva Fase',
      level: 1,
      children: [],
    };
    const updatedRoot = { ...rootNode, children: [...rootNode.children, newPhase], collapsed: false };
    onChange([updatedRoot]);
  }, [rootNode, onChange]);

  const handleAddChildToRoot = useCallback(() => {
    handleAddPhase();
  }, [handleAddPhase]);

  const nodeCount = countNodes(rootNode);

  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            Estructura de Desglose del Trabajo (EDT/WBS)
            <div className="section-divider" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-info" style={{ fontSize: 10 }}>
            {nodeCount} elementos
          </span>
          <button onClick={handleAddPhase} className="btn btn-sm btn-secondary">
            <Plus size={14} />
            Agregar Fase
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '10px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        background: 'var(--neutral-50)',
      }}>
        {LEVEL_COLORS.map((lc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--neutral-500)' }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: i <= 1 ? lc.border : '#fff',
              border: `1.5px solid ${lc.border}`,
            }} />
            N{i}: {lc.label}
          </div>
        ))}
        <span style={{ fontSize: 11, color: 'var(--neutral-400)', marginLeft: 'auto' }}>
          Doble click para editar · Hover para acciones
        </span>
      </div>

      {/* Tree */}
      <div style={{ padding: '20px 24px', minHeight: 200 }}>
        {rootNode.children.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Layers size={40} style={{ color: 'var(--neutral-300)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'var(--neutral-500)', marginBottom: 16 }}>
              No hay estructura EDT definida todavía.
            </p>
            <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
              Podés crear fases manualmente o pedirle a PM Copilot que genere la EDT en el Chat y luego sincronizar.
            </p>
            <button onClick={handleAddPhase} className="btn btn-primary btn-sm">
              <Plus size={14} />
              Crear Primera Fase
            </button>
          </div>
        ) : (
          <WBSNodeComponent
            node={rootNode}
            onUpdate={handleRootUpdate}
            onDelete={() => {}}
            onAddChild={handleAddChildToRoot}
          />
        )}
      </div>
    </div>
  );
}

function countNodes(node: WBSNode): number {
  return 1 + (node.children ? node.children.reduce((sum, c) => sum + countNodes(c), 0) : 0);
}
