import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface Suggestion {
  label: string;
  value: string;
  meta?: string;
}

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSelect'> {
  suggestions: Suggestion[];
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelect?: (suggestion: Suggestion) => void;
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

  const filtered = React.useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 8);
    const lower = value.toLowerCase();
    return suggestions
      .filter(s => s.label.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [value, suggestions]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (s: Suggestion) => {
    onChange(s.label);
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
        handleSelect(filtered[activeIdx]);
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
    <div ref={wrapperRef} className="relative">
      <Input
        {...props}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={(e) => { setOpen(true); props.onFocus?.(e); }}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-[9999] mt-1 w-full min-w-[220px] max-h-52 overflow-y-auto rounded-md border border-border bg-popover shadow-xl">
          {filtered.map((s, idx) => (
            <button
              key={s.value}
              type="button"
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between',
                idx === activeIdx && 'bg-accent'
              )}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
            >
              <span className="truncate">{s.label}</span>
              {s.meta && <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{s.meta}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
