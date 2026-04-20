/**
 * PageFAB — Floating Action Button canônico por página.
 *
 * Apenas aparece em mobile (< 640px). Em desktop o `sm:hidden` o oculta.
 * Pode ser ação única OU split (botão principal + items secundários).
 *
 * Uso — ação única:
 *   <PageFAB label="+ Novo pagamento" onClick={handler} />
 *
 * Uso — split:
 *   <PageFAB
 *     label="+ Novo pagamento"
 *     onClick={handlePagamento}
 *     items={[
 *       { label: 'Registrar custo', onClick: handleCusto, icon: <Receipt ... /> }
 *     ]}
 *   />
 *
 * Props:
 *   label    — texto principal do FAB
 *   onClick  — ação ao clicar no FAB principal
 *   icon     — ícone opcional (default: +)
 *   items    — items secundários (mini menu acima do FAB)
 *   bottom   — distância do fundo (default: 24px) — útil quando há bottom nav
 */

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

export interface PageFABItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  description?: string;
}

interface PageFABProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  items?: PageFABItem[];
  bottom?: number;
}

export function PageFAB({
  label,
  onClick,
  icon,
  items = [],
  bottom = 24,
}: PageFABProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasSplit = items.length > 0;

  const handleMain = () => {
    if (hasSplit) {
      setMenuOpen(prev => !prev);
    } else {
      onClick();
    }
  };

  return (
    <>
      {/* Ocultar em desktop — apenas mobile */}
      <div className="sm:hidden">

        {/* Overlay ao abrir menu */}
        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 149,
              background: 'rgba(0,0,0,0.25)',
            }}
          />
        )}

        {/* Menu de items secundários */}
        {menuOpen && items.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: bottom + 68,
            right: 20,
            zIndex: 151,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'flex-end',
          }}>
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => { setMenuOpen(false); item.onClick(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  background: 'var(--color-background-primary)',
                  border: '1px solid var(--color-border-secondary)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  animation: `fabItemIn 180ms ease ${idx * 40}ms both`,
                }}
              >
                {item.icon && (
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: '#EEEDFE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* FAB principal */}
        <button
          onClick={handleMain}
          aria-label={label}
          title={label}
          style={{
            position: 'fixed',
            bottom,
            right: 20,
            zIndex: 150,
            height: 52,
            minWidth: 52,
            paddingLeft: hasSplit ? 20 : 16,
            paddingRight: hasSplit ? 20 : 16,
            borderRadius: 999,
            background: menuOpen ? '#3C3489' : '#534AB7',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(83,74,183,0.4)',
            fontSize: 14,
            fontWeight: 500,
            transition: 'background 200ms, transform 200ms',
            transform: menuOpen ? 'scale(0.96)' : 'scale(1)',
            whiteSpace: 'nowrap',
          }}
        >
          {menuOpen ? (
            <X style={{ width: 20, height: 20 }} />
          ) : (
            icon ?? <Plus style={{ width: 20, height: 20 }} />
          )}
          {!menuOpen && <span>{label}</span>}
          {menuOpen && <span>Fechar</span>}
        </button>

      </div>

      <style>{`
        @keyframes fabItemIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

export default PageFAB;
