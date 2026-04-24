import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface Suggestion {
  label: string;
  value: string;
  meta?: string;
  unidade?: string;
  preco?: number;
  isAction?: boolean;
  isHeader?: boolean;
  isLoading?: boolean;
}

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect'> {
  suggestions: Suggestion[];
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelect?: (suggestion: Suggestion) => void;
  disableLocalFilter?: boolean;
}

export function AutocompleteInput({
  suggestions,
  value,
  onChange,
  onSuggestionSelect,
  className,
  ...props
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const filtered = React.useMemo(() => {
    if (props.disableLocalFilter) return suggestions;
    if (!value.trim()) return suggestions.slice(0, 8);
    const lower = value.toLowerCase();
    return suggestions
      .filter(s => s.label.toLowerCase().includes(lower) || s.isHeader || s.isAction)
      .slice(0, 8);
  }, [value, suggestions, props.disableLocalFilter]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Check both wrapper and the dropdown portal itself
      const portalNode = document.getElementById('autocomplete-portal-root');
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        (!portalNode || !portalNode.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [open, filtered.length]);

  const handleSelect = (s: Suggestion) => {
    if (!s.isAction) {
      onChange(s.label);
    }
    onSuggestionSelect?.(s);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      setOpen(false);
      props.onKeyDown?.(e);
      return;
    }

    if (!open || filtered.length === 0) {
      if (e.key === 'ArrowDown') {
        setOpen(true);
        e.preventDefault();
      }
      props.onKeyDown?.(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        const sel = filtered[activeIdx];
        if (!sel.isHeader) handleSelect(sel);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
    
    props.onKeyDown?.(e);
  };

  return (
    // CRITICAL FIX: Changed from `relative` to `static` positioning context
    // and moved dropdown to use fixed positioning via a portal-like approach.
    // The dropdown now uses `fixed` on the dropdown div keyed to the input's rect
    // to escape any overflow:hidden ancestors (like ComposicaoRow panels).
    <div ref={wrapperRef} className="w-full">
      <Input
        {...props}
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={(e) => { setOpen(true); props.onFocus?.(e); }}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && typeof document !== 'undefined' && createPortal(
        <div id="autocomplete-portal-root" style={dropdownStyle} className="max-h-52 overflow-y-auto rounded-md border border-border bg-popover shadow-xl">
          {filtered.map((s, idx) => {
            if (s.isHeader) {
              return (
                <div key={s.value} className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 bg-muted/30 sticky top-0 z-10 backdrop-blur-sm border-b border-border/50">
                  {s.label}
                  {s.isLoading && <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                </div>
              );
            }
            return (
              <button
                key={s.value}
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors',
                  s.isAction ? 'text-primary border-t border-border mt-1 hover:bg-primary/5' : 'hover:bg-accent',
                  idx === activeIdx && !s.isAction && 'bg-accent',
                  idx === activeIdx && s.isAction && 'bg-primary/10'
                )}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              >
                <span className="truncate" title={s.label}>{s.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {s.preco !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-medium" title="Preço unitário médio">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.preco)}
                    </span>
                  )}
                  {s.unidade && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded">
                      {s.unidade}
                    </span>
                  )}
                  {s.meta && !s.isAction && <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{s.meta}</span>}
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
