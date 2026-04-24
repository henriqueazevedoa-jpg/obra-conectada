import { useState, useEffect, useCallback } from 'react';
import { OrcamentoInsumo } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, MoreHorizontal, Copy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { COMPOSICAO_GRID, toSinapiDisplayName } from './ComposicaoRow';
import { cn } from '@/lib/utils';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PriceHint {
  ultimoPreco: number;
  dataUltimo: string; // ISO date string
  fornecedor?: string;
}

interface Props {
  insumo: OrcamentoInsumo;
  unidades: string[];
  onChange: (updated: OrcamentoInsumo) => void;
  onRemove: () => void;
  obraId?: string;
  readOnly?: boolean;
}

/** Determina o status do semáforo de um insumo */
function getStatus(insumo: OrcamentoInsumo): 'empty' | 'partial' | 'complete' {
  const hasQtd = insumo.quantidade != null && insumo.quantidade > 0;
  const hasPrice = insumo.precoUnitario != null && insumo.precoUnitario > 0;
  if (hasQtd && hasPrice) return 'complete';
  if (hasQtd || hasPrice) return 'partial';
  return 'empty';
}

const STATUS_CLASSES: Record<string, string> = {
  empty: 'bg-red-500',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

const STATUS_LABELS: Record<string, string> = {
  empty: 'Sem quantidade e sem preço',
  partial: 'Falta preço ou quantidade',
  complete: 'Linha completa',
};

export default function InsumoRow({
  insumo, unidades, onChange, onRemove, obraId, readOnly,
}: Props) {
  const { sinapiConfig } = useOrcamento();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [priceHint, setPriceHint] = useState<PriceHint | null>(null);

  const status = getStatus(insumo);

  // Busca progressiva
  useEffect(() => {
    if (!insumo.descricao || insumo.descricao.length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const terms = insumo.descricao.trim().split(/\s+/).filter(Boolean);

    const timerLocal = setTimeout(async () => {
      let queryCat = supabase.from('catalogo_insumos').select('id, nome, unidade, preco_medio');
      terms.forEach(t => { queryCat = queryCat.ilike('nome', `%${t}%`); });
      const { data: cat } = await queryCat.order('nome').limit(5);
      
      if (!active) return;

      setSuggestions(prev => {
        const prevSinapi = prev.filter(p => p.meta === 'SINAPI' || (p.isHeader && p.value.startsWith('hdr-sinapi')));
        const next: any[] = [];
        
        if (cat && cat.length > 0) {
          next.push({ label: 'Da sua biblioteca', value: 'hdr-cat', isHeader: true });
          cat.forEach(c => next.push({ label: c.nome, value: c.id, meta: 'Catálogo', unidade: c.unidade, preco: c.preco_medio }));
        }
        
        if (sinapiConfig?.isSinapiSearchEnabled !== false) {
          if (prevSinapi.length > 0) {
            next.push(...prevSinapi);
          } else {
            next.push({ label: 'SINAPI', value: 'hdr-sinapi-loading', isHeader: true, isLoading: true });
          }
        }
        return next;
      });
    }, 100);

    let timerSinapi: any;
    if (sinapiConfig?.isSinapiSearchEnabled !== false) {
      timerSinapi = setTimeout(async () => {
        let querySin = supabase.from('sinapi_insumos').select('id, descricao, unidade');
        terms.forEach(t => { querySin = querySin.ilike('descricao', `%${t}%`); });
        const { data: sin } = await querySin.order('descricao').limit(5);

        if (!active) return;

        setSuggestions(prev => {
          const prevCat = prev.filter(p => p.meta === 'Catálogo' || (p.isHeader && p.value === 'hdr-cat'));
          const next: any[] = [];
          
          next.push(...prevCat);
          
          if (sin && sin.length > 0) {
            next.push({ label: 'SINAPI', value: 'hdr-sinapi', isHeader: true });
            sin.forEach(s => next.push({ label: s.descricao, value: s.id, meta: 'SINAPI', unidade: s.unidade }));
          }
          return next;
        });
      }, 250);
    } else {
      setSuggestions(prev => prev.filter(p => p.meta !== 'SINAPI' && (!p.isHeader || p.value !== 'hdr-sinapi-loading')));
    }

    return () => {
      active = false;
      clearTimeout(timerLocal);
      clearTimeout(timerSinapi);
    };
  }, [insumo.descricao, sinapiConfig?.isSinapiSearchEnabled]);

  // Busca o preço histórico mais recente ao mudar a descrição
  const fetchPriceHint = useCallback(async (descricao: string) => {
    if (!descricao || descricao.length < 3) { setPriceHint(null); return; }

    const { data } = await supabase
      .from('precos_fornecedores')
      .select('preco_unitario, fornecedor_id, data_referencia')
      .ilike('descricao_item_snapshot', `%${descricao}%`)
      .order('data_referencia', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) { setPriceHint(null); return; }

    const last = (data as { preco_unitario: number; fornecedor_id: string; data_referencia: string }[])[0];
    let fornNome: string | undefined;
    if (last.fornecedor_id) {
      const { data: fData } = await supabase
        .from('fornecedores')
        .select('nome')
        .eq('id', last.fornecedor_id)
        .single();
      if (fData) fornNome = (fData as { nome: string }).nome;
    }

    setPriceHint({
      ultimoPreco: last.preco_unitario,
      dataUltimo: last.data_referencia,
      fornecedor: fornNome,
    });
  }, []);

  const update = (field: string, value: string | number | null | boolean) => {
    const next = { ...insumo, [field]: value };
    if (field === 'quantidade' || field === 'precoUnitario') {
      if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
    }
    if (field === 'precoTotal' && next.quantidade && next.quantidade > 0) {
      next.precoUnitario = next.precoTotal / next.quantidade;
    }
    onChange(next);
  };

  const handleDescricaoChange = (val: string) => {
    if (val.trim() === '') {
      const next = { ...insumo, descricao: val, codigo: '', precoUnitario: null, precoTotal: 0 };
      onChange(next);
      return;
    }
    update('descricao', val);
    // Só busca hint se ainda não tem preço definido
    if (!insumo.precoUnitario) fetchPriceHint(val);
  };

  const handleSelectSuggestion = async (s: any) => {
    update('descricao', s.label);

    if (s.meta === 'Catálogo') {
      const { data } = await supabase
        .from('catalogo_insumos')
        .select('unidade, preco_medio, codigo')
        .eq('id', s.value)
        .maybeSingle();

      if (data) {
        const next = { 
          ...insumo, 
          descricao: s.label,
          codigo: data.codigo || insumo.codigo,
          unidade: data.unidade || insumo.unidade,
          precoUnitario: data.preco_medio || insumo.precoUnitario,
        };
        if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
        onChange(next);
      }
    } else if (s.meta === 'SINAPI') {
      const { data } = await supabase
        .from('sinapi_insumos')
        .select('unidade, codigo')
        .eq('id', s.value)
        .maybeSingle();

      if (data) {
        const config = sinapiConfig?.uf ? sinapiConfig : { uf: 'SP', regime: 'SEM_DESONERACAO' };
        // Find price from sinapi_insumo_precos
        const { data: precoData } = await supabase
          .from('sinapi_insumo_precos')
          .select('preco')
          .eq('insumo_codigo', data.codigo)
          .eq('uf', config.uf)
          .eq('regime', config.regime)
          .maybeSingle();

        const precoUnit = precoData?.preco || insumo.precoUnitario;
        const next = { 
          ...insumo, 
          descricao: s.label,
          codigo: String(data.codigo),
          unidade: data.unidade || insumo.unidade,
          precoUnitario: precoUnit,
        };
        if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
        onChange(next);
      }
    }
  };

  const applyHintPrice = () => {
    if (!priceHint) return;
    update('precoUnitario', priceHint.ultimoPreco);
    setPriceHint(null); // hide after applying
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="group transition-colors hover:bg-muted/10">
      {/* ── Linha principal ── */}
      <div className={`grid ${COMPOSICAO_GRID} gap-2 items-center px-3 py-1`}>

        {/* Código + Semáforo */}
        <div className="flex items-center gap-1.5 min-w-0">
          {status !== 'complete' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0 transition-colors',
                      STATUS_CLASSES[status]
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {STATUS_LABELS[status]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span className="text-[10px] font-mono text-muted-foreground truncate" title={insumo.codigo}>
            {insumo.codigo}
          </span>
        </div>

        {/* Descrição */}
        {readOnly ? (
          <div className="h-8 text-xs px-2 flex items-center text-muted-foreground">
            {toSinapiDisplayName(insumo.descricao)}
          </div>
        ) : (
          <AutocompleteInput
            suggestions={suggestions}
            value={insumo.descricao}
            onChange={handleDescricaoChange}
            onSuggestionSelect={handleSelectSuggestion}
            disableLocalFilter={true}
            placeholder="Descrição / insumo"
            className="h-8 text-xs px-2 bg-transparent focus-visible:bg-background"
          />
        )}

        {/* Unidade */}
        {readOnly ? (
          <div className="h-8 text-xs px-2 flex items-center text-muted-foreground">{insumo.unidade}</div>
        ) : (
          <div>
            <Input
              value={insumo.unidade}
              onChange={(e) => update('unidade', e.target.value)}
              className="h-8 text-xs px-2 bg-transparent focus-visible:bg-background"
              placeholder="Un"
              list={`un-ins-${insumo.id}`}
            />
            <datalist id={`un-ins-${insumo.id}`}>
              {unidades.map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>
        )}

        {/* Quantidade */}
        {readOnly ? (
          <div className="h-8 text-xs px-2 flex items-center justify-end">{insumo.quantidade ?? '—'}</div>
        ) : (
          <Input
            type="number"
            value={insumo.quantidade ?? ''}
            onChange={(e) => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)}
            className={cn(
              'h-8 text-xs px-2 text-right bg-transparent focus-visible:bg-background',
              !insumo.quantidade && 'border-amber-300 dark:border-amber-700'
            )}
            placeholder="Qtd"
          />
        )}

        {/* P. Unit — com hint de preço ao lado */}
        <div className="relative">
          {readOnly ? (
            <div className="h-8 text-xs px-2 flex items-center justify-end">
              {insumo.precoUnitario != null ? `R$ ${insumo.precoUnitario.toFixed(2)}` : '—'}
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
              <Input
                type="number"
                value={insumo.precoUnitario ?? ''}
                onChange={(e) => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)}
                className={cn(
                  'h-8 text-xs pl-6 pr-1 text-right bg-transparent focus-visible:bg-background',
                  !insumo.precoUnitario && 'border-amber-300 dark:border-amber-700'
                )}
                placeholder="0,00"
              />
            </div>
          )}
        </div>

        {/* P. Total */}
        {readOnly ? (
          <div className="h-8 text-xs px-2 flex items-center justify-end font-medium text-foreground">
            R$ {insumo.precoTotal.toFixed(2)}
          </div>
        ) : (
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
            <Input
              type="number"
              value={insumo.precoTotal || ''}
              onChange={(e) => update('precoTotal', parseFloat(e.target.value) || 0)}
              className="h-8 text-xs pl-6 pr-1 text-right font-medium bg-transparent focus-visible:bg-background"
              placeholder="0,00"
            />
          </div>
        )}

        {/* Ações */}
        <div className="h-full flex items-center justify-center px-1 shrink-0">
          {!readOnly ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="end" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => { /* Not implemented yet */ }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </button>
                <div className="h-px bg-border/50 my-1 mx-1" />
                <button 
                  onClick={onRemove}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </PopoverContent>
            </Popover>
          ) : <div className="w-6 shrink-0" />}
        </div>
      </div>

      {/* ── Hint de preço histórico — inline, sem expandir ── */}
      {priceHint && !readOnly && !insumo.precoUnitario && (
        <div className="mx-3 mb-1.5 px-2.5 py-1.5 rounded-md bg-primary/8 dark:bg-indigo-950/30 border border-primary/25 dark:border-indigo-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="text-[11px] text-primary dark:text-primary/60">
            Histórico:{' '}
            <strong>R$ {priceHint.ultimoPreco.toFixed(2)}</strong>
            {priceHint.fornecedor && <span className="text-primary dark:text-primary/80"> · {priceHint.fornecedor}</span>}
            <span className="text-primary/80 dark:text-primary ml-1">({formatDate(priceHint.dataUltimo)})</span>
          </span>
          <button
            onClick={applyHintPrice}
            className="text-[11px] font-semibold text-primary dark:text-primary/80 hover:text-indigo-800 dark:hover:text-primary/25 shrink-0 hover:underline"
          >
            Usar →
          </button>
        </div>
      )}
    </div>
  );
}
