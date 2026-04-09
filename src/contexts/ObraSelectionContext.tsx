import React, { createContext, useContext, useState, useCallback } from 'react';
import { useObras } from '@/contexts/ObrasContext';

interface ObraSelectionContextType {
  selectedObraId: string;
  setSelectedObraId: (id: string) => void;
}

const ObraSelectionContext = createContext<ObraSelectionContextType | null>(null);

export function ObraSelectionProvider({ children }: { children: React.ReactNode }) {
  const { obras } = useObras();
  const [selectedObraId, setSelectedObraId] = useState(obras[0]?.id || '');

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
