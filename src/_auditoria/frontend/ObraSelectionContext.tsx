import React, { createContext, useContext, useState, useEffect } from 'react';
import { useObras } from '@/contexts/ObrasContext';

const STORAGE_KEY = 'selected-obra-id';

interface ObraSelectionContextType {
  selectedObraId: string;
  setSelectedObraId: (id: string) => void;
}

const ObraSelectionContext = createContext<ObraSelectionContextType | null>(null);

export function ObraSelectionProvider({ children }: { children: React.ReactNode }) {
  const { obras, loading } = useObras();
  const [selectedObraId, setSelectedObraIdState] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(STORAGE_KEY) || '';
  });

  const setSelectedObraId = (id: string) => {
    setSelectedObraIdState(id);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (selectedObraId) {
      window.localStorage.setItem(STORAGE_KEY, selectedObraId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedObraId]);

  // Auto-select first obra when obras load or when selected obra no longer exists
  useEffect(() => {
    if (loading) return; // não mexer enquanto carrega
    if (obras.length > 0 && (!selectedObraId || !obras.find(o => o.id === selectedObraId))) {
      setSelectedObraId(obras[0].id);
    }
  }, [obras, selectedObraId, loading]);

  return (
    <ObraSelectionContext.Provider value={{ selectedObraId, setSelectedObraId }}>
      {children}
    </ObraSelectionContext.Provider>
  );
}

export function useObraSelection() {
  const ctx = useContext(ObraSelectionContext);
  if (!ctx) throw new Error('useObraSelection must be used within ObraSelectionProvider');
  return ctx;
}
