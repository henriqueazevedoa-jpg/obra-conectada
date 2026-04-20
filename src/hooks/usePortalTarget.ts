/**
 * usePortalTarget — detecta um elemento do DOM de forma reativa e segura,
 * evitando o padrão incorreto de chamar document.getElementById() diretamente
 * no corpo de um componente antes da árvore estar montada.
 */
import { useState, useEffect } from 'react';

export function usePortalTarget(id: string): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Tenta encontrar imediatamente (se pai já montou)
    const el = document.getElementById(id);
    if (el) { setTarget(el); return; }

    // Caso contrário, observa o DOM até encontrar
    const observer = new MutationObserver(() => {
      const found = document.getElementById(id);
      if (found) { setTarget(found); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [id]);

  return target;
}
