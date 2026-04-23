import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ClipboardList, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Lote {
  id: string;
  titulo: string;
  itemCount: number;
  isAdded: boolean;
}

interface Props {
  composicaoId: string | null;
  insumoId?: string | null;
  descricao: string;
  unidade: string;
  qtd: number | null;
  precoTotal: number;
  obraId?: string;
  children: React.ReactNode;
  /** Callback quando lista muda (para atualizar o badge na linha) */
  onListasChange?: (lotesIds: string[]) => void;
  /** IDs das listas em que o item já está */
  addedLotesIds?: string[];
}

export default function ListaCotacaoPopover({
  composicaoId,
  insumoId,
  descricao,
  obraId,
  children,
  onListasChange,
  addedLotesIds = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaLista, setNovaLista] = useState('');
  const [criando, setCriando] = useState(false);
  const { company } = useCompany();

  const carregarLotes = async () => {
    if (!obraId || !company?.id) return;
    setLoading(true);
    try {
      // Buscar lotes da obra
      const { data: lotesData } = await (supabase as any)
        .from('cotacao_lotes')
        .select('id, titulo')
        .eq('obra_id', obraId)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (!lotesData) { setLotes([]); return; }

      const itemRefId = composicaoId || insumoId;
      if (!itemRefId) { setLotes([]); return; }

      // Buscar itens de cada lote que correspondem a este item
      const { data: itensData } = await (supabase as any)
        .from('cotacao_lote_itens')
        .select('lote_id')
        .eq('item_origem_id', itemRefId);

      const addedLoteIdsSet = new Set([
        ...(itensData || []).map((i: { lote_id: string }) => i.lote_id),
        ...addedLotesIds,
      ]);

      // Contar itens por lote
      const { data: contagemData } = await (supabase as any)
        .from('cotacao_lote_itens')
        .select('lote_id');

      const counts = (contagemData || []).reduce((acc: Record<string, number>, i: { lote_id: string }) => {
        acc[i.lote_id] = (acc[i.lote_id] || 0) + 1;
        return acc;
      }, {});

      setLotes(
        lotesData.map((l: { id: string; titulo: string }) => ({
          id: l.id,
          titulo: l.titulo,
          itemCount: counts[l.id] || 0,
          isAdded: addedLoteIdsSet.has(l.id),
        }))
      );
    } catch (e) {
      console.warn('[ListaCotacaoPopover]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) carregarLotes();
  }, [open]);

  const handleAdicionar = async (loteId: string) => {
    const itemRefId = composicaoId || insumoId;
    if (!itemRefId) return;

    try {
      await (supabase as any).from('cotacao_lote_itens').insert({
        lote_id: loteId,
        item_origem_id: itemRefId,
      });

      setLotes(prev => prev.map(l =>
        l.id === loteId ? { ...l, isAdded: true, itemCount: l.itemCount + 1 } : l
      ));

      const addedIds = lotes.filter(l => l.isAdded || l.id === loteId).map(l => l.id);
      onListasChange?.(addedIds);
      toast({ title: `Adicionado à lista "${lotes.find(l => l.id === loteId)?.titulo}"` });
    } catch (e) {
      console.warn('[ListaCotacaoPopover] adicionar:', e);
    }
  };

  const handleRemover = async (loteId: string) => {
    const itemRefId = composicaoId || insumoId;
    if (!itemRefId) return;

    try {
      await (supabase as any)
        .from('cotacao_lote_itens')
        .delete()
        .eq('lote_id', loteId)
        .eq('item_origem_id', itemRefId);

      setLotes(prev => prev.map(l =>
        l.id === loteId ? { ...l, isAdded: false, itemCount: Math.max(0, l.itemCount - 1) } : l
      ));

      const addedIds = lotes.filter(l => l.isAdded && l.id !== loteId).map(l => l.id);
      onListasChange?.(addedIds);
    } catch (e) {
      console.warn('[ListaCotacaoPopover] remover:', e);
    }
  };

  const handleCriarLista = async () => {
    const titulo = novaLista.trim();
    if (!titulo || !obraId || !company?.id) return;

    setCriando(true);
    try {
      const { data: novoLote } = await (supabase as any)
        .from('cotacao_lotes')
        .insert({ titulo, obra_id: obraId, company_id: company.id, status: 'aberto' })
        .select('id, titulo')
        .single();

      const itemRefId = composicaoId || insumoId;
      if (!itemRefId) {
        console.warn('[ListaCotacaoPopover] create failed: both composicaoId and insumoId are null/undefined', { composicaoId, insumoId });
      }

      if (novoLote && itemRefId) {
        // Adicionar item automaticamente à nova lista
        await (supabase as any).from('cotacao_lote_itens').insert({
          lote_id: novoLote.id,
          item_origem_id: itemRefId,
        });

        setLotes(prev => [{
          id: novoLote.id,
          titulo: novoLote.titulo,
          itemCount: 1,
          isAdded: true,
        }, ...prev]);

        onListasChange?.([novoLote.id, ...lotes.filter(l => l.isAdded).map(l => l.id)]);
        toast({ title: `Lista "${titulo}" criada e item adicionado` });
        setNovaLista('');
      }
    } catch (e) {
      console.warn('[ListaCotacaoPopover] criar:', e);
    } finally {
      setCriando(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 shadow-xl"
        align="start"
        side="bottom"
        sideOffset={4}
        onInteractOutside={() => setOpen(false)}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b">
          <p className="text-xs font-semibold text-foreground">Adicionar à lista de cotação</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{descricao}</p>
        </div>

        {/* Listas */}
        <div className="max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : lotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">Nenhuma lista criada</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">Crie sua primeira lista de cotação no campo abaixo.</p>
            </div>
          ) : (
            lotes.map(lote => (
              <div
                key={lote.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 border-b border-border/20 last:border-0 transition-colors',
                  lote.isAdded ? 'bg-primary/5' : 'hover:bg-muted/20'
                )}
              >
                <ClipboardList className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  lote.isAdded ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{lote.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">{lote.itemCount} item{lote.itemCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center justify-center shrink-0 w-6">
                  <div
                    className={cn(
                      'flex items-center justify-center h-4 w-4 rounded border transition-all cursor-pointer',
                      lote.isAdded
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input bg-transparent hover:border-primary/50'
                    )}
                    onClick={() => lote.isAdded ? handleRemover(lote.id) : handleAdicionar(lote.id)}
                  >
                    {lote.isAdded && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Criar nova lista */}
        <div className="px-3 py-2.5 border-t bg-muted/10">
          <div className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={novaLista}
              onChange={e => setNovaLista(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCriarLista(); }}
              placeholder="Criar nova lista..."
              className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground"
              disabled={criando}
            />
            {novaLista.trim() && (
              <button
                onClick={handleCriarLista}
                disabled={criando}
                className="text-[10px] font-semibold text-primary hover:underline shrink-0 disabled:opacity-50"
              >
                {criando ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
