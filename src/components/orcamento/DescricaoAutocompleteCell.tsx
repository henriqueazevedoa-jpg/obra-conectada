import { useState, useRef, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/mockData';
import {
  useItemSearch,
  SearchItem,
  SinapiSearchConfig,
} from '@/hooks/useItemSearch';

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: SearchItem) => void;
  sinapiConfig: SinapiSearchConfig;
  companyId: string | undefined;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  /** Ref para controle externo de foco */
  inputRef?: React.RefObject<HTMLInputElement>;
  onTab?: () => void;
}

// ── Badges de fonte ────────────────────────────────────────────────────────────

const FONTE_CONFIG = {
  sinapi_composicao: { label: 'SINAPI', cls: 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
  sinapi_insumo:     { label: 'INSUMO', cls: 'border-cyan-400 text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30' },
  biblioteca:        { label: 'BIBLIOTECA', cls: 'border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  historico:         { label: 'HISTÓRICO', cls: 'border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
} as const;

function getPreco(item: SearchItem): number {
  if (item.tipo === 'sinapi_composicao') return item.custo;
  if (item.tipo === 'sinapi_insumo')     return item.preco;
  if (item.tipo === 'biblioteca')        return item.preco_medio;
  return item.preco;
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function DescricaoAutocompleteCell({
  value,
  onChange,
  onSelect,
  sinapiConfig,
  companyId,
  placeholder = 'Descrição',
  className,
  inputClassName,
  autoFocus,
  readOnly,
  inputRef: externalRef,
  onTab,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const popoverRef = useRef<HTMLDivElement>(null);

  const { results, loading } = useItemSearch(value, sinapiConfig, companyId);

  // Abre o popover quando há resultados e o campo tem foco
  const [hasFocus, setHasFocus] = useState(false);
  const shouldOpen = hasFocus && value.trim().length >= 3 && (loading || results.length > 0);

  useEffect(() => {
    setOpen(shouldOpen);
    if (!shouldOpen) setActiveIdx(-1);
  }, [shouldOpen]);

  // Rola o item ativo para a visão
  useEffect(() => {
    if (activeIdx < 0 || !popoverRef.current) return;
    const items = popoverRef.current.querySelectorAll<HTMLElement>('[data-ac-item]');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleSelect = useCallback((item: SearchItem) => {
    onChange(item.descricao);
    setOpen(false);
    setActiveIdx(-1);
    onSelect(item);
    // Foca o próximo input (unidade) via onTab
    setTimeout(() => onTab?.(), 0);
  }, [onChange, onSelect, onTab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    } else if (e.key === 'Tab') {
      setOpen(false);
      setActiveIdx(-1);
      // Não intercepta Tab — deixa o browser navegar normalmente
      // mas chama onTab após para sincronização
      setTimeout(() => onTab?.(), 0);
    }
  };

  if (readOnly) {
    return (
      <span
        className={cn('flex-1 flex items-center truncate text-foreground px-1', className)}
        style={{ fontSize: '13px', fontWeight: 500 }}
      >
        {value}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Wrapper invisível — o input ocupa todo o espaço */}
        <div className={cn('flex-1 h-full w-full min-w-0', className)}>
          <input
            ref={inputRef}
            autoFocus={autoFocus}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setHasFocus(true)}
            onBlur={() => setTimeout(() => setHasFocus(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'w-full h-full bg-transparent border-none outline-none px-1.5',
              'placeholder:text-muted-foreground/40 text-foreground',
              inputClassName,
            )}
            style={{ fontSize: '13px', fontWeight: 500 }}
            data-planilha="descricao"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[480px] p-0 shadow-2xl border-border/60"
        align="start"
        side="bottom"
        sideOffset={2}
        onOpenAutoFocus={e => e.preventDefault()} // não roubar foco do input
        onInteractOutside={() => setOpen(false)}
        style={{ animationName: 'tabFadeIn', animationDuration: '150ms' }}
      >
        <div ref={popoverRef} className="max-h-[340px] overflow-y-auto">
          {/* Indicador de carregamento */}
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Buscando…</span>
            </div>
          )}

          {/* Resultados agrupados por fonte */}
          {!loading && results.length === 0 && value.trim().length >= 3 && (
            <div className="flex items-center gap-2 px-3 py-4 text-center">
              <Search className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
              <span className="text-[11px] text-muted-foreground">Nenhum resultado encontrado</span>
            </div>
          )}

          {/* Renderiza grupos por tipo */}
          {(['sinapi_composicao', 'sinapi_insumo', 'biblioteca', 'historico'] as const).map(tipo => {
            const group = results.filter(r => r.tipo === tipo);
            if (group.length === 0) return null;
            const cfg = FONTE_CONFIG[tipo];
            return (
              <div key={tipo}>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border-b border-border/20">
                  <Badge
                    variant="outline"
                    className={cn('text-[9px] px-1 h-4 leading-none', cfg.cls)}
                  >
                    {cfg.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{group.length} resultado{group.length > 1 ? 's' : ''}</span>
                </div>

                {group.map(item => {
                  const globalIdx = results.indexOf(item);
                  const isActive = globalIdx === activeIdx;
                  const preco = getPreco(item);
                  return (
                    <div
                      key={`${item.tipo}-${globalIdx}`}
                      data-ac-item
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-border/10 last:border-0 transition-colors',
                        isActive ? 'bg-primary/8 dark:bg-primary/12' : 'hover:bg-muted/20',
                      )}
                      onMouseDown={e => {
                        e.preventDefault(); // não acionar onBlur do input
                        handleSelect(item);
                      }}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate text-foreground leading-tight">
                          {item.descricao}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {item.unidade}
                          {item.tipo === 'sinapi_composicao' || item.tipo === 'sinapi_insumo'
                            ? ` · Cód. ${item.codigo}`
                            : ''}
                        </p>
                      </div>
                      {preco > 0 && (
                        <span className="text-[12px] font-semibold tabular-nums text-foreground shrink-0">
                          {formatCurrency(preco)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
