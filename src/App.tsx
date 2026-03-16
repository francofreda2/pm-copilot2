import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import InitialForm from './components/InitialForm';
import ProjectDashboard from './components/ProjectDashboard';
import ProjectList from './components/ProjectList';
import LoginScreen from './components/LoginScreen';
import { LayoutDashboard, Menu, X, MessageSquare, BarChart2, ChevronLeft, LogOut } from 'lucide-react';
import { ProjectData, ChatMessage } from './types';
import { extractDashboardData } from './services/geminiService';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [view, setView] = useState<'list' | 'new' | 'chat' | 'dashboard'>('list');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProjects();
    }
  }, [token]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const saveProjectToBackend = async (project: ProjectData) => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(project)
      });
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const deleteProjectFromBackend = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleLogin = (newToken: string, newUser: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setProjects([]);
    setCurrentProject(null);
    setView('list');
  };

  const updateCurrentProject = (updatedData: ProjectData) => {
    setCurrentProject(updatedData);
    setProjects(prev => prev.map(p => p.id === updatedData.id ? updatedData : p));
    saveProjectToBackend(updatedData);
  };

  const handleInitialSubmit = (input: any) => {
    const newProject: ProjectData = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      ...input,
      status: 'Planificación',
      lastUpdated: new Date().toISOString(),
      chatMessages: [],
      kpiScope: '',
      kpiSchedule: '',
      kpiBudget: '',
      kpiQuality: '',
      milestones: [],
      oeps: [],
      activities: [],
      tasks: [],
      risks: [],
      wbsNodes: [],
      changeLog: [],
      projectStartDate: new Date().toISOString().split('T')[0],
      flowSvg: '',
      wbsSvg: ''
    };
    
    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);
    setView('chat');
    setIsSidebarOpen(false);
    saveProjectToBackend(newProject);
  };

  const handleSelectProject = (project: ProjectData) => {
    const migratedProject = {
      ...project,
      milestones: project.milestones || [],
      oeps: project.oeps || [],
      activities: project.activities || [],
      tasks: project.tasks || [],
      risks: project.risks || [],
      wbsNodes: project.wbsNodes || [],
      changeLog: project.changeLog || [],
      projectStartDate: project.projectStartDate || new Date().toISOString().split('T')[0],
      flowSvg: project.flowSvg || '',
      wbsSvg: project.wbsSvg || ''
    };
    setCurrentProject(migratedProject);
    setView('dashboard');
    setIsSidebarOpen(false);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    deleteProjectFromBackend(id);
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setView('list');
    }
  };

  const mapWBSNode = (n: any): any => ({
    id: n.id || String(Math.random()).slice(2, 8),
    name: n.name || 'Sin nombre',
    level: n.level ?? 1,
    owner: n.owner,
    duration: n.duration,
    children: (n.children || []).map((c: any) => mapWBSNode(c)),
    collapsed: false,
  });

  const handleImportProject = (parsedData: any) => {
    const newProject: ProjectData = {
      id: Math.random().toString(36).substr(2, 9),
      name: parsedData.name || 'Proyecto Importado',
      businessObjective: parsedData.businessObjective || '',
      projectType: parsedData.projectType || 'Otro',
      description: 'Generado automáticamente desde archivo importado',
      status: parsedData.status || 'Planificación',
      lastUpdated: new Date().toISOString(),
      projectStartDate: new Date().toISOString().split('T')[0],
      chatMessages: [
         { id: 'm1', role: 'user', content: `Importé un archivo y PM Copilot generó la base del proyecto.` },
         { id: 'm2', role: 'model', content: `¡Hola! He analizado tu documento y creado el WBS, tareas y riesgos iniciales. Podés revisarlos en el Dashboard.` }
      ],
      kpiScope: parsedData.kpiScope || 'N/A',
      kpiSchedule: parsedData.kpiSchedule || 'N/A',
      kpiBudget: parsedData.kpiBudget || 'N/A',
      kpiQuality: parsedData.kpiQuality || 'N/A',
      milestones: (parsedData.milestones || []).map((m: any) => ({ n: m.n || 'Hito', w: m.w || 'TBD', s: m.s || 'pending' })),
      oeps: (parsedData.oeps || []).map((o: any) => ({ id: o.id || 'OP1', n: o.n || 'Objetivo', kpi: o.kpi || 'TBD' })),
      activities: (parsedData.activities || []).map((a: any) => ({ n: a.n || 'Actividad', r: a.r || 'TBD', d: a.d || 'TBD', s: a.s || 'pend' })),
      tasks: (parsedData.tasks || []).map((t:any, i:number) => ({
        id: t.id || `T${i + 1}`, name: t.name || 'Sin nombre', om: t.om || 1, p: t.p || Number(t.dur) || 8, te: t.te || String(Number(t.dur) || 8), pred: t.pred || '-', rec: t.rec || 'TBD', rc: t.rc !== false, start: 0, dur: Number(t.dur) || 8, status: t.status || 'pending'
      })),
      risks: (parsedData.risks || []).map((r:any) => ({
         id: r.id || 'R1', title: r.title || 'Riesgo', v: r.v || 'mid', badge: r.badge || 'Medio', desc: r.desc || ''
      })),
      wbsNodes: (parsedData.wbsNodes || []).map((n:any) => mapWBSNode(n)),
      changeLog: [{ timestamp: new Date().toISOString(), action: 'Creación', detail: 'Proyecto generado desde importación de archivo' }],
      flowSvg: parsedData.flowSvg || '',
      wbsSvg: parsedData.wbsSvg || ''
    };
    
    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);
    setView('dashboard');
    setIsSidebarOpen(false);
    saveProjectToBackend(newProject);
  };


  const handleSyncDashboard = async () => {
    if (!currentProject || currentProject.chatMessages.length === 0) return;
    setIsSyncing(true);
    try {
      const updatedData = await extractDashboardData(currentProject.chatMessages, currentProject);
      updatedData.lastUpdated = new Date().toISOString();
      updateCurrentProject(updatedData);
      alert("Dashboard sincronizado con éxito.");
    } catch (error) {
      alert("Error al sincronizar el dashboard. Asegúrate de tener configurada la API Key.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: "'Inter', sans-serif", color: 'var(--neutral-900)', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <header className="navbar" style={{ '@media print': { display: 'none' } } as any}>
        <div className="navbar-inner">
          <div className="navbar-brand">
            {view === 'chat' && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="btn-icon"
                style={{ display: 'none' }}
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}

            {view !== 'list' && (
              <button
                onClick={() => {
                  setCurrentProject(null);
                  setView('list');
                  setIsSidebarOpen(false);
                }}
                className="btn-icon"
                title="Volver a mis proyectos"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div className="navbar-brand-icon">
              <LayoutDashboard size={20} color="#fff" />
            </div>
            <span className="navbar-brand-text">PM Copilot</span>
          </div>

          <div className="navbar-actions">
            {currentProject && (view === 'chat' || view === 'dashboard') && (
              <div className="view-toggle">
                <button
                  onClick={() => { setView('chat'); setIsSidebarOpen(false); }}
                  className={`view-toggle-btn ${view === 'chat' ? 'active' : ''}`}
                >
                  <MessageSquare size={15} />
                  <span>Chat</span>
                </button>
                <button
                  onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
                  className={`view-toggle-btn ${view === 'dashboard' ? 'active' : ''}`}
                >
                  <BarChart2 size={15} />
                  <span>Dashboard</span>
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: '1px solid var(--border-light)', paddingLeft: 16, marginLeft: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--neutral-500)', fontWeight: 500 }}>{user?.email}</span>
              <button onClick={handleLogout} className="btn-icon" title="Cerrar sesión" style={{ color: 'var(--neutral-400)' }}>
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, width: '100%', ...(view === 'chat' ? { maxWidth: 1280, margin: '0 auto', padding: '24px', display: 'flex', gap: 32 } : {}) }}>

        {/* Sidebar instructions – Chat only */}
        {view === 'chat' && (
          <aside style={{ width: 260, flexShrink: 0, display: isSidebarOpen ? 'block' : 'none', position: 'sticky', top: 84 }}>
            <div className="card animate-slide-in" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--primary-600)', marginBottom: 14, fontFamily: "'JetBrains Mono', monospace" }}>
                Instrucciones
              </h2>
              <div style={{ fontSize: 13, color: 'var(--neutral-600)', lineHeight: 1.7 }}>
                <p style={{ marginBottom: 12 }}>
                  <strong>1. Trabajo Iterativo:</strong> PM Copilot te guiará fase por fase.
                </p>
                <p style={{ marginBottom: 12 }}>
                  <strong>2. Gráficos SVG:</strong> Los diagramas se renderizarán automáticamente.
                </p>
                <p>
                  <strong>3. Dashboard:</strong> Ve a "Dashboard" y sincronizá para extraer la info generada.
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* Main Area */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {view === 'list' && (
            <ProjectList
              projects={projects}
              onSelect={handleSelectProject}
              onNew={() => { setView('new'); setIsSidebarOpen(false); }}
              onDelete={handleDeleteProject}
            />
          )}

          {view === 'new' && (
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
              <InitialForm onSubmit={handleInitialSubmit} onImport={handleImportProject} />
            </div>
          )}

          {view === 'chat' && currentProject && (
            <ChatInterface
              initialContext={currentProject}
              messages={currentProject.chatMessages}
              setMessages={(msgs) => {
                const newMessages = typeof msgs === 'function' ? msgs(currentProject.chatMessages) : msgs;
                updateCurrentProject({ ...currentProject, chatMessages: newMessages, lastUpdated: new Date().toISOString() });
              }}
            />
          )}

          {view === 'dashboard' && currentProject && (
            <ProjectDashboard
              data={currentProject}
              onUpdate={updateCurrentProject}
              onSync={handleSyncDashboard}
              isSyncing={isSyncing}
            />
          )}
        </main>
      </div>
    </div>
  );
}
