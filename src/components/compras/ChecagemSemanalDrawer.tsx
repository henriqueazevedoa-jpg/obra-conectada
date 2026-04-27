import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProximaSemanaRange } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/untyped';
import {
  CalendarRange, CheckCircle2, ShoppingCart,
  HelpCircle, Loader2, AlertTriangle, X
} from 'lucide-react';
import { useCronograma } from '@/hooks/useCronograma';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useCompany } from '@/contexts/CompanyContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  obraId: string;
  onConcluida?: () => void;
}

type StatusChecagem = 'pendente' | 'tenho' | 'comprar' | 'verificar';
type ModoChecagem = 'manual' | 'almoxarifado';

interface MaterialAgregado {
  hash: string;
  nome: string;
  unidade: string;
  quantidadePrevista: number;
  origemTarefas: Set<string>;
  status: StatusChecagem;
}

export default function ChecagemSemanalDrawer({ open, onClose, obraId, onConcluida }: Props) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const { company } = useCompany();
  const { tarefas } = useCronograma(obraId);
  const { getOrcamento } = useOrcamento();
  const { getMateriaisByObra } = useEstoque();

  const [modo, setModo] = useState<ModoChecagem>('manual');
  const [materiais, setMateriais] = useState<MaterialAgregado[]>([]);
  const [tarefasSemVinculo, setTarefasSemVinculo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const periodo = useMemo(() => getProximaSemanaRange(), [open]);

  // Recalcular lista quando abre
  useEffect(() => {
    if (!open || !obraId) return;

    setLoadingInitial(true);

    // 1. Filtrar tarefas na janela da próxima semana (seg-sex)
    const validTasks = tarefas.filter(t => {
      if (t.tipo_tarefa === 'MARCO' || t.tipo_tarefa === 'RESUMO') return false;
      if (t.status === 'concluida') return false; // Nao gera demanda nova
      if (!t.data_inicio || !t.data_fim) return false;

      const tInic = parseISO(t.data_inicio);
      const tFim = parseISO(t.data_fim);

      // Checa sobreposição
      if (tInic > periodo.fim) return false;
      if (tFim < periodo.inicio) return false;

      return true;
    });

    const orcamento = getOrcamento(obraId);

    const aggregated = new Map<string, MaterialAgregado>();
    const noLinkTasks: string[] = [];

    const extractComposicoes = (etapa: import('@/contexts/OrcamentoContext').OrcamentoEtapa): import('@/contexts/OrcamentoContext').OrcamentoComposicao[] => {
      let comps: import('@/contexts/OrcamentoContext').OrcamentoComposicao[] = [];
      for (const item of etapa.items || []) {
        if (item.tipo === 'etapa') {
          comps = comps.concat(extractComposicoes(item as import('@/contexts/OrcamentoContext').OrcamentoEtapa));
        } else {
          comps.push(item as import('@/contexts/OrcamentoContext').OrcamentoComposicao);
        }
      }
      return comps;
    };

    // Se orçamento carregado, extrai insumos
    if (orcamento) {
      for (const t of validTasks) {
        let hasLink = false;

        const processInsumos = (insumos: any[]) => {
          for (const ins of insumos) {
            if (!ins.descricao) continue;
            hasLink = true;

            const hash = `${ins.codigo || 'S/C'}-${ins.descricao.toLowerCase().trim()}`;

            if (aggregated.has(hash)) {
              const obj = aggregated.get(hash)!;
              obj.quantidadePrevista += (ins.quantidade || 0);
              obj.origemTarefas.add(t.nome);
            } else {
              aggregated.set(hash, {
                hash,
                nome: ins.descricao || ins.codigo || 'Sem nome',
                unidade: ins.unidade || 'un',
                quantidadePrevista: ins.quantidade || 0,
                origemTarefas: new Set([t.nome]),
                status: 'pendente'
              });
            }
          }
        };

        if (t.orcamento_composicao_id) {
          // Busca em todas as etapas
          let foundComps = false;
          for (const etp of orcamento.etapas) {
            const c = extractComposicoes(etp).find(x => x.id === t.orcamento_composicao_id);
            if (c) {
              processInsumos(c.insumos);
              foundComps = true;
              break;
            }
          }
          if (!foundComps) noLinkTasks.push(t.nome);
        } else if (t.orcamento_categoria_id) {
          // Pega todos os insumos de todas as composições da categoria
          const etp = orcamento.etapas.find(x => x.id === t.orcamento_categoria_id);
          if (etp) {
            for (const c of extractComposicoes(etp)) {
              processInsumos(c.insumos);
            }
          } else {
            noLinkTasks.push(t.nome);
          }
        } else {
          // Tarefa sem vínculo nenhum
          noLinkTasks.push(t.nome);
        }
      }
    }

    setTarefasSemVinculo([...new Set(noLinkTasks)]);

    // Atualizar sugestões de status baseado no modo (Almoxarifado vs Manual)
    const estoqueReal = getMateriaisByObra(obraId);
    const finalList = Array.from(aggregated.values()).map(mat => {
      let suggestedStatus: StatusChecagem = 'pendente';

      if (modo === 'almoxarifado') {
        const noEstoque = estoqueReal.find(e =>
          e.nomeNormalizado?.toLowerCase() === mat.nome.toLowerCase() ||
          e.nomeOriginal.toLowerCase() === mat.nome.toLowerCase()
        );

        if (noEstoque) {
          if ((noEstoque.quantidadeAtual || 0) >= mat.quantidadePrevista) {
            suggestedStatus = 'tenho';
          } else {
            suggestedStatus = 'comprar';
          }
        } else {
          suggestedStatus = 'verificar';
        }
      }

      return { ...mat, status: suggestedStatus };
    });

    setMateriais(finalList.sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoadingInitial(false);
  }, [open, obraId, tarefas, modo, getOrcamento, getMateriaisByObra, periodo]);

  const updateItemStatus = (hash: string, st: StatusChecagem) => {
    setMateriais(prev => prev.map(m => m.hash === hash ? { ...m, status: st } : m));
  };

  const handleSave = async () => {
    if (materiais.some(m => m.status === 'pendente')) {
      toast({ title: 'Atenção', description: 'Defina o status de todos os itens antes de salvar.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const dbItensJson = materiais.map(m => ({
        nome: m.nome,
        unidade: m.unidade,
        quantidade_prevista: m.quantidadePrevista,
        origens: Array.from(m.origemTarefas),
        status_final: m.status
      }));

      // 1. Inserir em checagem_material
      const { error: chkErr } = await (supabase as any).from('checagem_material').insert({
        obra_id: obraId,
        company_id: company?.id ?? null,
        semana_inicio: format(periodo.inicio, 'yyyy-MM-dd'),
        semana_fim: format(periodo.fim, 'yyyy-MM-dd'),
        status: 'concluida',
        modo,
        itens: dbItensJson
      });
      if (chkErr) throw chkErr;

      // 2. Há itens marcados como 'comprar'? Gera Lista de Compra
      const paraComprar = materiais.filter(m => m.status === 'comprar');
      if (paraComprar.length > 0) {
        const { data: listDoc, error: listErr } = await (supabase as any).from('lista_compra').insert({
          obra_id: obraId,
          company_id: company?.id ?? null,
          nome: `Lista Semanal - ${format(periodo.inicio, 'dd/MM')} a ${format(periodo.fim, 'dd/MM')}`,
          status: 'aberta'
        }).select('id').single();

        if (listErr) throw listErr;

        const listItens = paraComprar.map(m => ({
          lista_id: listDoc.id,
          obra_id: obraId,
          nome: m.nome,
          unidade: m.unidade,
          quantidade: m.quantidadePrevista,
          origem: 'manual',
          origem_ref_id: null
        }));

        const { error: itensErr } = await (supabase as any).from('lista_compra_itens').insert(listItens);
        if (itensErr) throw itensErr;

        toast({ title: 'Sucesso!', description: 'Checagem salva e Lista de Compras gerada.', className: 'bg-emerald-50 text-emerald-900 border-emerald-200' });
      } else {
        toast({ title: 'Sucesso!', description: 'Checagem semanal finalizada. Nenhum item pendente de compra.' });
      }

      onConcluida?.();
      onClose();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const countComprar = materiais.filter(m => m.status === 'comprar').length;
  const countPendente = materiais.filter(m => m.status === 'pendente').length;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col p-0',
          isMobile ? 'h-[88vh] rounded-t-2xl' : 'w-[520px]'
        )}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0 bg-background">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Checagem Semanal de Materiais
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Próxima semana: {format(periodo.inicio, "dd/MM", { locale: ptBR })} à {format(periodo.fim, "dd/MM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto bg-muted/20">
          <div className="p-5 space-y-6">

            {/* Seletor de Modo */}
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                className={cn('flex-1 text-xs font-medium py-2 rounded-md transition-all', modo === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => setModo('manual')}
              >
                Modo Manual
              </button>
              <button
                className={cn('flex-1 text-xs font-medium py-2 rounded-md transition-all', modo === 'almoxarifado' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => setModo('almoxarifado')}
              >
                Cruzar c/ Almoxarifado
              </button>
            </div>

            {loadingInitial ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-3" />
                <p className="text-sm">Cruzando dados de orçamento e cronograma...</p>
              </div>
            ) : materiais.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center text-muted-foreground bg-background rounded-xl border border-dashed px-6">
                <CheckCircle2 className="h-8 w-8 mb-3 text-emerald-400" />
                <p className="text-sm font-medium text-foreground">Sem demandas mapeadas</p>
                <p className="text-xs mt-1">Não há tarefas com materiais associados para a próxima semana.</p>
              </div>
            ) : (
              <>
                {/* Resumo */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="font-semibold">{materiais.length} itens totais</div>
                  {countComprar > 0 && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">{countComprar} p/ Comprar</Badge>}
                </div>

                {/* Lista de Materiais */}
                <div className="space-y-3">
                  {materiais.map(mat => (
                    <div key={mat.hash} className={cn(
                      "bg-background border rounded-xl p-3 transition-colors",
                      mat.status === 'pendente' && "border-amber-500/30 bg-amber-500/5"
                    )}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate" title={mat.nome}>{mat.nome}</p>
                          <p className="text-[10px] text-muted-foreground uppercase mt-0.5 tracking-wider">
                            Qtd prev: {mat.quantidadePrevista} {mat.unidade}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate opacity-70 mt-1" title={Array.from(mat.origemTarefas).join(', ')}>
                            De: {Array.from(mat.origemTarefas).join(', ')}
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação Rápida */}
                      <div className="flex gap-1.5 h-8">
                        <Button
                          variant={mat.status === 'tenho' ? 'default' : 'outline'}
                          size="sm"
                          className={cn("flex-1 text-xs", mat.status === 'tenho' && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                          onClick={() => updateItemStatus(mat.hash, 'tenho')}
                        >
                          <CheckCircle2 className="h-3 w-3 mb-px mr-1.5" /> Tenho
                        </Button>
                        <Button
                          variant={mat.status === 'comprar' ? 'default' : 'outline'}
                          size="sm"
                          className={cn("flex-1 text-xs", mat.status === 'comprar' && "bg-indigo-600 hover:bg-indigo-700 text-white")}
                          onClick={() => updateItemStatus(mat.hash, 'comprar')}
                        >
                          <ShoppingCart className="h-3 w-3 mb-px mr-1.5" /> Comprar
                        </Button>
                        <Button
                          variant={mat.status === 'verificar' ? 'default' : 'outline'}
                          size="sm"
                          className={cn("flex-1 text-xs", mat.status === 'verificar' && "bg-amber-500 hover:bg-amber-600 text-white")}
                          onClick={() => updateItemStatus(mat.hash, 'verificar')}
                        >
                          <HelpCircle className="h-3 w-3 mb-px mr-1.5" /> Verificar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Inconsistências */}
            {tarefasSemVinculo.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 mt-6">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Tarefas sem vínculo de materiais
                </p>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  As seguintes tarefas caem na próxima semana, mas não possuem insumos amarrados no orçamento:
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    {tarefasSemVinculo.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="border-t border-border px-5 py-4 flex gap-2 shrink-0 bg-background mt-auto">
          <Button variant="outline" onClick={onClose} className="w-1/3" disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="w-2/3"
            disabled={saving || countPendente > 0 || (loadingInitial && materiais.length === 0)}
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> :
              countPendente > 0 ? `${countPendente} itens pendentes` :
                countComprar > 0 ? `Salvar e Gerar Lista (${countComprar})` : 'Finalizar Checagem'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
