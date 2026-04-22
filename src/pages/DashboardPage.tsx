import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EngenheiroDashboard from '@/components/dashboard/EngenheiroDashboard';
import GestorDashboard from '@/components/dashboard/GestorDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  
  const savedView = localStorage.getItem('lastra_dashboard_view');
  const [view, setView] = useState<'gestor'|'engenheiro'>((savedView as any) || 'gestor');
  
  const handleToggle = (v: 'gestor'|'engenheiro') => {
    setView(v);
    localStorage.setItem('lastra_dashboard_view', v);
  };

  if (user?.role === 'admin') {
    return (
      <>
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full p-1 shadow-md flex gap-1 pointer-events-auto">
            <button 
              onClick={() => handleToggle('gestor')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${view === 'gestor' ? 'bg-primary/15 text-primary' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Visão Gestor
            </button>
            <button 
              onClick={() => handleToggle('engenheiro')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${view === 'engenheiro' ? 'bg-primary/15 text-primary' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Visão Engenheiro
            </button>
          </div>
        </div>
        
        {view === 'gestor' ? <GestorDashboard /> : <EngenheiroDashboard />}
      </>
    );
  }

  // Comportamento normal se não for admin
  if (user?.role === 'gestor') {
    return <GestorDashboard />;
  }

  return <EngenheiroDashboard />;
}
