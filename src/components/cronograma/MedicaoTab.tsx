import { useState, useMemo, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
import { CronogramaTarefa } from '@/hooks/useCronograma';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ClipboardCheck, Loader2, Save, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface MedicaoTabProps {
  obraId: string | null;
  tarefas: CronogramaTarefa[];
  hasBaseline: boolean;
  saveBaseline: () => void;
  onMedicaoConfirmada: () => void;
}

interface MedicaoItemState {
  percentual: number;
  quantidade: number;
}

export default function MedicaoTab({
  obraId,
  tarefas,
  hasBaseline,
  saveBaseline,
  onMedicaoConfirmada
}: MedicaoTabProps) {
  const { company } = useCompany();
  const { toast } = useToast();

  const [medicaoAtiva, setMedicaoAtiva] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [expandedMedicoes, setExpandedMedicoes] = useState<Record<string, boolean>>({});

  // Tarefas da medicao (apenas PADRAO)
  const [items, setItems] = useState<Record<string, MedicaoItemState>>({});
  const [expandedGrupos, setExpandedGrupos] = useState<Record<string, boolean>>({});

  // Agrupamento
  const grupos = useMemo(() => {
    const p = tarefas.filter(t => t.tipo_tarefa === 'PADRAO');
    const map = new Map<string, { paiNome: string; tarefas: CronogramaTarefa[] }>();
    
    // Grupo Geral
    map.set('geral', { paiNome: 'Geral', tarefas: [] });

    p.forEach(t => {
      if (!t.parent_tarefa_id) {
        map.get('geral')!.tarefas.push(t);
      } else {
        if (!map.has(t.parent_tarefa_id)) {
          const pai = tarefas.find(x => x.id === t.parent_tarefa_id);
          map.set(t.parent_tarefa_id, { paiNome: pai?.nome || 'Desconhecido', tarefas: [] });
        }
        map.get(t.parent_tarefa_id)!.tarefas.push(t);
      }
    });
    
    return Array.from(map.values()).filter(g => g.tarefas.length > 0);
  }, [tarefas]);

  // Inicializar todos os grupos colapsáveis como abertos
  useEffect(() => {
    const init: Record<string, boolean> = {};
    grupos.forEach((_, i) => { init[String(i)] = true; });
    setExpandedGrupos(init);
  }, [grupos]);

  // Carregar histórico
  useEffect(() => {
    async function loadHistory() {
      if (!obraId) return;
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('cronograma_medicoes')
        .select(`
          *,
          users(nome),
          itens:cronograma_medicao_itens(
            *,
            tarefa:cronograma_tarefas(nome)
          )
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistorico(data);
      }
      setLoadingHistory(false);
    }
    loadHistory();
  }, [obraId, medicaoAtiva]);

  // Inicializar estado dos inputs ao ativar
  const onStartMedicao = () => {
    const iniciais: Record<string, MedicaoItemState> = {};
    tarefas.forEach(t => {
      if (t.tipo_tarefa === 'PADRAO') {
        iniciais[t.id] = {
          percentual: Number(t.percentual_concluido) || 0,
          quantidade: t.quantidade_executada || 0
        };
      }
    });
    setItems(iniciais);
    setPeriodoInicio('');
    setPeriodoFim('');
    setMedicaoAtiva(true);
  };

  const handleCancel = () => {
    setMedicaoAtiva(false);
    setItems({});
  };

  const handlePercentualChange = (id: string, valStr: string, t: CronogramaTarefa) => {
    let val = parseFloat(valStr);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 100) val = 100;

    let qtd = items[id]?.quantidade || 0;
    if (t.quantidade_prevista && t.quantidade_prevista > 0) {
      qtd = (val / 100) * t.quantidade_prevista;
      // Truncar casas decimais para visualização limpa
      qtd = parseFloat(qtd.toFixed(4)); 
    }

    setItems(prev => ({ ...prev, [id]: { percentual: val, quantidade: qtd } }));
  };

  const handleQuantidadeChange = (id: string, valStr: string, t: CronogramaTarefa) => {
    let val = parseFloat(valStr);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;

    let pct = items[id]?.percentual || 0;
    if (t.quantidade_prevista && t.quantidade_prevista > 0) {
      pct = (val / t.quantidade_prevista) * 100;
      if (pct > 100) pct = 100;
      pct = parseFloat(pct.toFixed(2));
    }

    setItems(prev => ({ ...prev, [id]: { percentual: pct, quantidade: val } }));
  };

  const onConfirmar = async () => {
    if (!company?.id || !obraId) return;
    if (!periodoInicio || !periodoFim) {
      toast({ title: 'Atenção', description: 'Preencha as datas de início e fim do período.', variant: 'destructive' });
      return;
    }

    if (periodoInicio > periodoFim) {
      toast({ title: 'Período Inválido', description: 'Data final não pode ser anterior a inicial.', variant: 'destructive' });
      return;
    }

    // Achar tarefas modificadas
    const toUpdate = tarefas.filter(t => t.tipo_tarefa === 'PADRAO' && items[t.id]).map(t => {
      return {
        tarefa: t,
        novoPct: items[t.id].percentual,
        antigoPct: Number(t.percentual_concluido) || 0,
        novaQtd: items[t.id].quantidade
      };
    }).filter(d => d.novoPct !== d.antigoPct); // só salvar o que mudou de fato

    if (toUpdate.length === 0) {
      toast({ title: 'Aviso', description: 'Nenhuma alteração foi realizada.' });
      handleCancel();
      return;
    }

    setSaving(true);
    try {
      const respMed = await supabase.from('cronograma_medicoes').insert({
        company_id: company.id,
        obra_id: obraId,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
      }).select('id').single();

      if (respMed.error) throw respMed.error;
      const medicaoId = respMed.data.id;

      const itensPayload = toUpdate.map(u => ({
        medicao_id: medicaoId,
        tarefa_id: u.tarefa.id,
        percentual_anterior: u.antigoPct,
        percentual_novo: u.novoPct,
        quantidade_executada: u.novaQtd
      }));

      const respItens = await supabase.from('cronograma_medicao_itens').insert(itensPayload);
      if (respItens.error) throw respItens.error;

      // Update tarefas
      for (const u of toUpdate) {
        await supabase.from('cronograma_tarefas').update({
          percentual_concluido: u.novoPct,
          quantidade_executada: u.novaQtd
        }).eq('id', u.tarefa.id);
      }

      toast({ title: 'Medição salva', description: 'Medição confirmada com sucesso.' });
      handleCancel();
      onMedicaoConfirmada();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleHist = (id: string) => {
    setExpandedMedicoes(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-primary)]">
      {/* HEADER */}
      <div className="flex items-end justify-between border-b border-border/50 px-6 py-4 shrink-0 bg-muted/10">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Período Inicio</Label>
            <Input 
              type="date" 
              className="h-8 text-xs" 
              disabled={!medicaoAtiva || saving}
              value={periodoInicio}
              onChange={e => setPeriodoInicio(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Período Fim</Label>
            <Input 
              type="date" 
              className="h-8 text-xs" 
              disabled={!medicaoAtiva || saving}
              value={periodoFim}
              onChange={e => setPeriodoFim(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          {!medicaoAtiva ? (
            <Button onClick={onStartMedicao} size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <ClipboardCheck className="h-3.5 w-3.5 mr-2" />
              Iniciar Medição
            </Button>
          ) : (
            <>
              <Button onClick={handleCancel} variant="ghost" size="sm" disabled={saving} className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground">
                Cancelar
              </Button>
              <Button onClick={onConfirmar} disabled={saving} size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold">
                {saving && <Loader2 className="animate-spin h-3 w-3 mr-2"/>}
                <Save className="h-3 w-3 mr-2" />
                Confirmar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* BANNER CONDICIONAL */}
      {!hasBaseline && (
        <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 text-amber-700 text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Nenhum baseline salvo.</span>
            <span>Salve um baseline antes de medir para visualizar desvios.</span>
          </div>
          <Button onClick={saveBaseline} variant="outline" size="sm" className="h-7 text-[11px] font-bold text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
            Salvar Baseline Agora
          </Button>
        </div>
      )}

      {/* TABELA SCROLLAVEL */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-8">
        
        {/* Tabela de Medição (somente as tarefas da lista geral) */}
        <div>
          <div className="grid grid-cols-[1fr_80px_100px_100px_100px_80px] gap-3 px-3 py-2 border-b border-border bg-muted/40 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider items-center rounded-t-lg">
            <span>Tarefa</span>
            <span className="text-right">Unid.</span>
            <span className="text-right">Qtd. Prevista</span>
            <span className="text-right">Qtd. Exec.</span>
            <span className="text-right">% Concluído</span>
            <span className="text-center">{hasBaseline ? 'Desvio' : ''}</span>
          </div>
          
          <div className="border border-t-0 border-border rounded-b-lg overflow-hidden pb-1 bg-card">
            {grupos.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa operacional cadastrada.</div>
            )}
            {grupos.map((grupo, gIdx) => (
              <div key={gIdx} className="border-b border-border/50 last:border-0">
                <button
                  onClick={() => setExpandedGrupos(prev => ({ ...prev, [String(gIdx)]: !prev[String(gIdx)] }))}
                  className="w-full px-3 py-1.5 bg-muted/20 text-xs font-semibold text-foreground/80 flex items-center gap-1.5 border-b border-border/30 hover:bg-muted/40 transition-colors"
                >
                  {expandedGrupos[String(gIdx)]
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50"/>
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50"/>
                  }
                  {grupo.paiNome}
                  <span className="ml-auto text-[10px] text-muted-foreground/60 font-normal">
                    {grupo.tarefas.length} tarefa{grupo.tarefas.length !== 1 ? 's' : ''}
                  </span>
                </button>
                {expandedGrupos[String(gIdx)] && grupo.tarefas.map(tarefa => {
                  const val = items[tarefa.id];
                  const atualPct = val ? val.percentual : (tarefa.percentual_concluido || 0);
                  
                  let desvioVal: number | null = null;
                  if (tarefa.baseline_inicio && tarefa.baseline_fim) {
                    const hoje = new Date();
                    const inicio = parseISO(tarefa.baseline_inicio);
                    const fim = parseISO(tarefa.baseline_fim);
                    const totalDias = differenceInDays(fim, inicio);
                    const diasDecorridos = differenceInDays(hoje, inicio);
                    const pctPlanejado = totalDias > 0
                      ? Math.min(100, Math.max(0, (diasDecorridos / totalDias) * 100))
                      : 0;
                    desvioVal = atualPct - pctPlanejado;
                  }
                  
                  return (
                    <div key={tarefa.id} className="grid grid-cols-[1fr_80px_100px_100px_100px_80px] gap-3 px-3 py-2 border-b border-border/50 last:border-0 items-center hover:bg-muted/10 transition-colors">
                      <span className="text-sm font-medium text-foreground pl-5 truncate" title={tarefa.nome}>{tarefa.nome}</span>
                      <span className="text-xs text-muted-foreground text-right">{tarefa.unidade || '—'}</span>
                      <span className="text-xs text-muted-foreground text-right">
                        {tarefa.quantidade_prevista != null ? tarefa.quantidade_prevista.toLocaleString() : '—'}
                      </span>
                      
                      <div className="flex justify-end">
                        {medicaoAtiva ? (
                          <Input
                            type="number" 
                            min="0"
                            className="h-7 w-24 text-right text-xs"
                            disabled={tarefa.quantidade_prevista == null}
                            placeholder={tarefa.quantidade_prevista == null ? '—' : ''}
                            value={val?.quantidade ?? ''}
                            onChange={e => handleQuantidadeChange(tarefa.id, e.target.value, tarefa)}
                          />
                        ) : (
                          <span className="text-xs font-semibold text-foreground">{tarefa.quantidade_executada || 0}</span>
                        )}
                      </div>

                      <div className="flex justify-end">
                        {medicaoAtiva ? (
                          <div className="relative">
                            <Input
                              type="number"
                              min="0" max="100"
                              className="h-7 w-20 text-right text-xs pr-6"
                              value={val?.percentual ?? ''}
                              onChange={e => handlePercentualChange(tarefa.id, e.target.value, tarefa)}
                            />
                            <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-semibold">%</span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-foreground">{tarefa.percentual_concluido}%</span>
                        )}
                      </div>
                      
                      <div className="flex justify-center">
                        {hasBaseline && desvioVal !== null ? (
                          <span className={cn(
                            "text-xs font-semibold",
                            desvioVal >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {desvioVal >= 0 ? '+' : ''}{desvioVal.toFixed(1)}%
                          </span>
                        ) : hasBaseline ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-xs text-muted-foreground cursor-help">—</span>
                              </TooltipTrigger>
                              <TooltipContent className="text-[11px]">
                                Baseline sem as datas da tarefa e percentual
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span/>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Historico */}
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Medições Anteriores</h3>
          {loadingHistory ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
          ) : historico.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma medição anterior registrada.</div>
          ) : (
            <div className="space-y-3">
              {historico.map(h => (
                <div key={h.id} className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-3.5 bg-muted/10">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase"> Confirmada </Badge>
                      <div className="text-sm font-semibold text-foreground">
                        {new Date(h.periodo_inicio).toLocaleDateString()} a {new Date(h.periodo_fim).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Confirmado em: {new Date(h.created_at).toLocaleString()}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold" onClick={() => toggleHist(h.id)}>
                      Ver Detalhes {expandedMedicoes[h.id] ? <ChevronDown className="h-3 w-3 ml-1"/> : <ChevronRight className="h-3 w-3 ml-1"/>}
                    </Button>
                  </div>
                  
                  {expandedMedicoes[h.id] && h.itens && (
                    <div className="p-4 border-t border-border/50 bg-[var(--color-background-primary)] bg-gradient-to-b from-muted/5 to-transparent">
                      <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Tarefa</span>
                        <span className="text-right">Anterior</span>
                        <span className="text-right">Novo</span>
                        <span className="text-right">Avanço</span>
                      </div>
                      {h.itens.map((it: any) => (
                        <div key={it.id} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 px-2 py-1.5 text-xs text-foreground items-center border-b border-border/30 last:border-0 hover:bg-muted/10">
                          <span className="truncate" title={it.tarefa?.nome}>{it.tarefa?.nome || '—'}</span>
                          <span className="text-right text-muted-foreground">{it.percentual_anterior}%</span>
                          <span className="text-right font-semibold">{it.percentual_novo}%</span>
                          <span className="text-right text-green-600 font-bold">+{Number(it.percentual_novo - it.percentual_anterior).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
