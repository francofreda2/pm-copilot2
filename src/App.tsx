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
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view === 'chat' && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-lg"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            
            {view !== 'list' && (
              <button 
                onClick={() => {
                  setCurrentProject(null);
                  setView('list');
                  setIsSidebarOpen(false);
                }}
                className="p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 rounded-lg flex items-center gap-1"
                title="Volver a mis proyectos"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="bg-indigo-600 p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 hidden sm:block">PM Copilot</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {currentProject && (view === 'chat' || view === 'dashboard') && (
              <div className="flex bg-zinc-100 p-1 rounded-lg">
                <button
                  onClick={() => { setView('chat'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
                <button
                  onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-500 border-l border-zinc-200 pl-4 ml-2">
              <span className="hidden sm:inline">{user?.email}</span>
              <button onClick={handleLogout} className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-red-600 transition-colors" title="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className={`flex-1 w-full ${view === 'chat' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8' : ''}`}>
        
        {/* Sidebar (Instrucciones) - Solo visible en Chat */}
        {view === 'chat' && (
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-10 w-72 bg-white lg:bg-transparent border-r lg:border-none border-zinc-200 p-6 lg:p-0 transform transition-transform duration-200 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 mt-16 lg:mt-0' : '-translate-x-full lg:hidden'}
          `}>
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Instrucciones
              </h2>
              <div className="bg-white rounded-xl border border-zinc-200 p-4 text-sm text-zinc-600 space-y-3 shadow-sm">
                <p>
                  <strong>1. Trabajo Iterativo:</strong> PM Copilot te guiará fase por fase.
                </p>
                <p>
                  <strong>2. Gráficos SVG:</strong> Los diagramas se renderizarán automáticamente en la pantalla.
                </p>
                <p>
                  <strong>3. Dashboard Ejecutivo:</strong> Cuando termines (o en cualquier momento), ve a la pestaña "Dashboard" y haz clic en "Sincronizar" para extraer toda la información generada.
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && view === 'chat' && (
          <div 
            className="fixed inset-0 bg-zinc-900/20 z-0 lg:hidden mt-16"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Area */}
        <main className="flex-1 min-w-0 h-full">
          {view === 'list' && (
            <ProjectList 
              projects={projects} 
              onSelect={handleSelectProject} 
              onNew={() => { setView('new'); setIsSidebarOpen(false); }} 
              onDelete={handleDeleteProject}
            />
          )}

          {view === 'new' && (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <InitialForm onSubmit={handleInitialSubmit} />
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
