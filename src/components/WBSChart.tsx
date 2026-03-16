import React from 'react';
import { WBSNode } from '../types';
import { Layers, FolderOpen, Box, FileText } from 'lucide-react';

interface Props {
  nodes: WBSNode[];
}

const LEVEL_COLORS = [
  { bg: '#fff', text: 'var(--brand-navy)', border: 'var(--brand-navy)', label: 'Proyecto' },
  { bg: '#f8fafc', text: 'var(--primary-700)', border: 'var(--primary-500)', label: 'Fase' },
  { bg: '#f0fdf4', text: 'var(--success)', border: 'var(--success)', label: 'Entregable' },
  { bg: '#fffbeb', text: 'var(--warning)', border: 'var(--warning)', label: 'Paquete' },
  { bg: '#fff', text: 'var(--neutral-600)', border: 'var(--neutral-300)', label: 'Tarea' },
];

const LEVEL_ICONS = [Layers, FolderOpen, Box, FileText, FileText];

function TreeNode({ node }: { node: WBSNode }) {
  const levelStyle = LEVEL_COLORS[Math.min(node.level, LEVEL_COLORS.length - 1)];
  const Icon = LEVEL_ICONS[Math.min(node.level, LEVEL_ICONS.length - 1)];

  return (
    <div className="org-node-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', paddingTop: node.level === 0 ? 0 : 20 }}>
      {/* Vertical connector line to parent (except for root) */}
      {node.level > 0 && (
        <div style={{ position: 'absolute', top: 0, left: '50%', width: 0, height: 20, borderLeft: '2px solid var(--border-light)', transform: 'translateX(-1px)' }} />
      )}
      
      {/* Node Box */}
      <div 
        className="wbs-box"
        style={{
          background: levelStyle.bg,
          border: `1px solid ${levelStyle.border}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          width: 220,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ marginTop: 2, color: levelStyle.border }}>
            <Icon size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: levelStyle.text, lineHeight: 1.3 }}>
              {node.name}
            </div>
            {node.owner && (
               <div style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 4 }}>
                 Resp: {node.owner}
               </div>
            )}
            {node.duration && (
               <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>
                 Dur: {node.duration}
               </div>
            )}
          </div>
        </div>
        <div style={{ position: 'absolute', top: -10, right: -10, background: levelStyle.border, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>
          {levelStyle.label}
        </div>
      </div>

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="org-children" style={{ display: 'flex', justifyContent: 'center', gap: 24, position: 'relative', paddingTop: 20 }}>
          {/* Vertical line from bottom of parent to horizontal line */}
          <div style={{ position: 'absolute', top: 0, left: '50%', width: 0, height: 20, borderLeft: '2px solid var(--border-light)', transform: 'translateX(-1px)' }} />
          
          {node.children.map((child, i) => (
             <div key={child.id || i} style={{ position: 'relative' }}>
               {/* Horizontal connecting lines for siblings handled in CSS via .org-sibling-line */}
               {node.children.length > 1 && (
                 <>
                   {i === 0 ? (
                      <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: 2, background: 'var(--border-light)' }} />
                   ) : i === node.children.length - 1 ? (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: 2, background: 'var(--border-light)' }} />
                   ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: 'var(--border-light)' }} />
                   )}
                 </>
               )}
               <TreeNode node={child} />
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WBSChart({ nodes }: Props) {
  // WBS usually has a single root. If the structure passed has multiple roots (e.g. phases at level 1),
  // we create a virtual project root node to connect them.
  
  let rootNode: WBSNode;
  
  if (nodes.length === 1 && nodes[0].level === 0) {
    rootNode = nodes[0];
  } else {
    rootNode = {
      id: 'virtual-root',
      name: 'Proyecto',
      level: 0,
      children: nodes
    };
  }

  return (
    <div style={{ 
      width: '100%', 
      overflowX: 'auto', 
      padding: '40px 20px', 
      background: 'var(--neutral-50)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      minHeight: 500
    }}>
      <div style={{ display: 'inline-flex', minWidth: '100%', justifyContent: 'center' }}>
        <TreeNode node={rootNode} />
      </div>
    </div>
  );
}
