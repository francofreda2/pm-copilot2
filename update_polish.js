const fs = require('fs');
const path = 'src/components/ProjectDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<div style=\{S\.twoCol\}>/g, '<div style={S.twoCol} className="stagger-children">');
content = content.replace(/<div style=\{S\.card\}>/g, '<div style={S.card} className="card-lift">');
content = content.replace(/<div style=\{S\.kpiGrid\}>/g, '<div style={S.kpiGrid} className="stagger-children">');
content = content.replace(/<header style=\{S\.hdrWrap\}>/g, '<header style={S.hdrWrap} className="glass-panel">');

if (!content.includes('ToastContext')) {
  content = content.replace("import WBSEditor", "import { useToast } from './ToastContext';\nimport WBSEditor");
}

if (!content.includes('useToast()')) {
  content = content.replace(
    "export default function ProjectDashboard({ data, onUpdate, onSync, isSyncing }: Props) {",
    "export default function ProjectDashboard({ data, onUpdate, onSync, isSyncing }: Props) {\n  const { addToast } = useToast();"
  );
}

if (content.includes("onUpdate({...data, ...projectForm});") && !content.includes("addToast('Proyecto guardado")) {
  content = content.replace(
    "onUpdate({...data, ...projectForm});\n    setIsEditingProject(false);",
    "onUpdate({...data, ...projectForm});\n    setIsEditingProject(false);\n    addToast('Proyecto guardado correctamente.', 'success');"
  );
}

fs.writeFileSync(path, content);
console.log('ProjectDashboard.tsx updated with UI Polish.');
