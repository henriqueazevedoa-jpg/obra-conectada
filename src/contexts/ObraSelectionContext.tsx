import React, { createContext, useContext, useState, useEffect } from 'react';
import { useObras } from '@/contexts/ObrasContext';

interface ObraSelectionContextType {
  selectedObraId: string;
  setSelectedObraId: (id: string) => void;
}

const ObraSelectionContext = createContext<ObraSelectionContextType | null>(null);

export function ObraSelectionProvider({ children }: { children: React.ReactNode }) {
  const { obras } = useObras();
  const [selectedObraId, setSelectedObraId] = useState('');

  // Auto-select first obra when obras load or when selected obra no longer exists
  useEffect(() => {
    if (obras.length > 0 && (!selectedObraId || !obras.find(o => o.id === selectedObraId))) {
      setSelectedObraId(obras[0].id);
    }
  }, [obras, selectedObraId]);

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
