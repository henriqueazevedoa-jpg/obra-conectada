import { useCallback, useRef, useState } from 'react';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';

export interface UndoSnapshot {
  etapas: OrcamentoEtapa[];
  timestamp: number;
}

const MAX_HISTORY = 50;

export function useOrcamentoUndo() {
  const undoStack = useRef<UndoSnapshot[]>([]);
  const redoStack = useRef<UndoSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /** Chame sempre ANTES de aplicar uma mudança às etapas */
  const pushSnapshot = useCallback((current: OrcamentoEtapa[]) => {
    undoStack.current.push({
      etapas: JSON.parse(JSON.stringify(current)), // deep clone
      timestamp: Date.now(),
    });
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    // Qualquer nova ação limpa o redo
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  /** Retorna o estado anterior (e empurra o atual para o redo) */
  const undo = useCallback((current: OrcamentoEtapa[]): OrcamentoEtapa[] | null => {
    const prev = undoStack.current.pop();
    if (!prev) return null;
    redoStack.current.push({
      etapas: JSON.parse(JSON.stringify(current)),
      timestamp: Date.now(),
    });
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    return prev.etapas;
  }, []);

  /** Re-aplica o próximo estado (redo) */
  const redo = useCallback((current: OrcamentoEtapa[]): OrcamentoEtapa[] | null => {
    const next = redoStack.current.pop();
    if (!next) return null;
    undoStack.current.push({
      etapas: JSON.parse(JSON.stringify(current)),
      timestamp: Date.now(),
    });
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
    return next.etapas;
  }, []);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory };
}
