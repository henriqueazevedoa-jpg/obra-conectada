import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';

interface SinapiResult {
  descricao: string;
  unidade: string;
  preco: number;
  fonte: 'sinapi';
}

interface HistoricoResult {
  descricao: string;
  unidade: string;
  preco: number;
  obra?: string;
  fonte: 'historico';
}

interface Props {
  descricao: string;
  unidade: string;
  isInsumo: boolean;
  obraId?: string;
  onUsar: (preco: number, fonte: 'sinapi' | 'historico') => void;
  children: React.ReactNode;
}

function normalizarDescricao(d: string): string {
  return d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function SinapiPricePopover({
  descricao,
  unidade,
  isInsumo,
  obraId,
  onUsar,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [sinapiResults, setSinapiResults] = useState<SinapiResult[]>([]);
  const [historicoResults, setHistoricoResults] = useState<HistoricoResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { company } = useCompany();

  const buscarResultados = useCallback(async (termo: string) => {
    if (!termo.trim()) return;
    setLoading(true);
    const termNorm = normalizarDescricao(termo);

    try {
      // Busca SINAPI
      const tabela = isInsumo ? 'sinapi_insumos' : 'sinapi_composicoes';
      const { data: sinapiData } = await (supabase as any)
        .from(tabela)
        .select('descricao, unidade, preco_unitario')
        .ilike('descricao', `%${termo}%`)
        .limit(5);

      setSinapiResults(
        (sinapiData || []).map((r: { descricao: string; unidade: string; preco_unitario: number }) => ({
          descricao: r.descricao,
          unidade: r.unidade,
          preco: r.preco_unitario,
          fonte: 'sinapi' as const,
        }))
      );

      // Busca Histórico
      const histQuery = (supabase as any)
        .from('preco_historico')
        .select('descricao_insumo, unidade, preco_unitario, obra_id')
        .ilike('descricao_normalizada', `%${termNorm}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (company?.id) {
        histQuery.eq('company_id', company.id);
      }

      const { data: histData } = await histQuery;
      setHistoricoResults(
        (histData || []).map((r: { descricao_insumo: string; unidade: string; preco_unitario: number; obra_id: string }) => ({
          descricao: r.descricao_insumo,
          unidade: r.unidade,
          preco: r.preco_unitario,
          fonte: 'historico' as const,
        }))
      );
    } catch (e) {
      console.warn('[SinapiPricePopover]', e);
    } finally {
      setLoading(false);
    }
  }, [isInsumo, company?.id]);

  // Inicializar busca com a descrição do item ao abrir
  useEffect(() => {
    if (open && descricao) {
      setBusca(descricao);
      buscarResultados(descricao);
    }
  }, [open, descricao, buscarResultados]);

  const handleBuscaChange = (valor: string) => {
    setBusca(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscarResultados(valor);
    }, 300);
  };

  const handleUsar = async (preco: number, fonte: 'sinapi' | 'historico', itemDescricao: string, itemUnidade: string) => {
    onUsar(preco, fonte);

    // INSERT em preco_historico
    if (obraId) {
      try {
        await (supabase as any).from('preco_historico').insert({
          obra_id: obraId,
          company_id: company?.id,
          descricao_insumo: itemDescricao,
          descricao_normalizada: normalizarDescricao(itemDescricao),
          unidade: itemUnidade,
          preco_unitario: preco,
          origem: fonte,
          data_referencia: new Date().toISOString().split('T')[0],
        });
      } catch (e) {
        console.warn('[SinapiPricePopover] preco_historico insert:', e);
      }
    }

    setOpen(false);
  };

  const hasResults = sinapiResults.length > 0 || historicoResults.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[420px] p-0 shadow-xl"
        align="start"
        side="bottom"
        sideOffset={4}
        onInteractOutside={() => setOpen(false)}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />
          ) : (
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <input
            autoFocus
            value={busca}
            onChange={e => handleBuscaChange(e.target.value)}
            placeholder="Buscar preço no SINAPI ou histórico..."
            className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {/* Seção SINAPI */}
          {sinapiResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30">
                <Badge variant="outline" className="text-[9px] px-1 h-4 border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30">
                  SINAPI
                </Badge>
                <span className="text-[10px] text-muted-foreground">{sinapiResults.length} resultado{sinapiResults.length !== 1 ? 's' : ''}</span>
              </div>
              {sinapiResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors group/row border-b border-border/20 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{r.descricao}</p>
                    <p className="text-[10px] text-muted-foreground">{r.unidade}</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
                    {formatCurrency(r.preco)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    onClick={() => handleUsar(r.preco, 'sinapi', r.descricao, r.unidade)}
                  >
                    Usar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Seção Histórico */}
          {historicoResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30">
                <Badge variant="outline" className="text-[9px] px-1 h-4 border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                  HISTÓRICO
                </Badge>
                <span className="text-[10px] text-muted-foreground">{historicoResults.length} resultado{historicoResults.length !== 1 ? 's' : ''}</span>
              </div>
              {historicoResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors group/row border-b border-border/20 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{r.descricao}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{r.unidade}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
                    {formatCurrency(r.preco)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    onClick={() => handleUsar(r.preco, 'historico', r.descricao, r.unidade)}
                  >
                    Usar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Sem resultado */}
          {!loading && !hasResults && busca.length > 1 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Nenhum match — informe o valor manualmente no campo de preço
            </div>
          )}

          {!busca && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Digite para buscar preços no SINAPI e no histórico de obras
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
