/**
 * BottomSheet — componente reutilizável de bottom sheet mobile.
 *
 * Uso básico:
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="Filtros">
 *     {children}
 *   </BottomSheet>
 *
 * Props:
 *   open        — controla visibilidade
 *   onClose     — callback ao fechar (overlay, swipe, botão)
 *   title       — título opcional exibido no handle area
 *   maxHeight   — altura máxima do sheet (default: '85vh')
 *   children    — conteúdo do sheet
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxHeight?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  maxHeight = '85vh',
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 200,
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 150ms ease',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          background: 'var(--color-background-primary)',
          borderRadius: '16px 16px 0 0',
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.16)',
          animation: 'slideUp 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Handle bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px 12px',
          flexShrink: 0,
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>
          {/* Visual drag handle */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--color-border-secondary)',
          }} />

          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginTop: 4,
          }}>
            {title}
          </span>

          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'var(--color-background-secondary)',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              marginTop: 4,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Content — scrollável */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px 32px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

export default BottomSheet;
