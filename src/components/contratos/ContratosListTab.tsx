import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PageKPI } from '@/components/layout/PageShell';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { FileText, Edit, Plus, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Contrato, ContratoTipo, ContratoComMetricas } from '@/types/contrato';
import { cn } from '@/lib/utils';
import ContratoDrawer from './ContratoDrawer';
import AditivoDrawer from './AditivoDrawer';
import MedicaoDrawer from './MedicaoDrawer';
import MedicaoHistorico from './MedicaoHistorico';
import type { ContratoAditivo } from '@/types/contrato';
import { toast } from '@/hooks/use-toast';

interface Props { 
  obraId: string; 
  tipo: ContratoTipo;
  isActive?: boolean; 
  onKpisReady?: (kpis: PageKPI[]) => void; 
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function ContratosListTab({ obraId, tipo, isActive = true, onKpisReady }: Props) {
  const { company } = useCompany();
  const companyId = company?.id;

  const [contratos, setContratos] = useState<ContratoComMetricas[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);

  const [aditivoDrawerOpen, setAditivoDrawerOpen] = useState(false);
  const [aditivoContrato, setAditivoContrato] = useState<ContratoComMetricas | null>(null);

  const [medicaoDrawerOpen, setMedicaoDrawerOpen] = useState(false);
  const [medicaoContrato, setMedicaoContrato] = useState<ContratoComMetricas | null>(null);
  const [historicoOpenId, setHistoricoOpenId] = useState<string | null>(null);
  const [obraInfo, setObraInfo] = useState<{ nome: string; codigo?: string; endereco?: string }>({ nome: '' });

  const fetchContratos = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data: dbContratos, error } = await supabase
      .from('contratos')
      .select('*, contratos_medicoes!contratos_medicoes_contrato_id_fkey(valor_periodo, status)')
      .eq('obra_id', obraId)
      .eq('tipo', tipo);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const cMetricas: ContratoComMetricas[] = (dbContratos || []).map((c: any) => {
      // Sum all approved/paid medicoes for total_medido
      let sum = 0;
      if (c.contratos_medicoes && Array.isArray(c.contratos_medicoes)) {
        c.contratos_medicoes.forEach((m: any) => {
          if (m.status === 'aprovado' || m.status === 'pago') {
            sum += Number(m.valor_periodo || 0);
          }
        });
      }
      return { ...c, total_medido: sum };
    });

    setContratos(cMetricas);

    // Fetch obra info (para PDF do BM)
    const { data: obraDat } = await supabase
      .from('obras')
      .select('id, nome, codigo, endereco')
      .eq('id', obraId)
      .single();
    if (obraDat) setObraInfo({ nome: (obraDat as any).nome, codigo: (obraDat as any).codigo, endereco: (obraDat as any).endereco });

    setLoading(false);
  }, [obraId, tipo, companyId]);

  useEffect(() => {
    if (isActive) fetchContratos();
  }, [isActive, fetchContratos]);

  const kpis = useMemo(() => {
    const ativos = contratos.filter(c => c.status === 'ativo').length;
    const contratado = contratos.reduce((acc, c) => acc + Number(c.valor_atual), 0);
    const medido = contratos.reduce((acc, c) => acc + c.total_medido, 0);

    return [
      { 
        id: 'contratado', 
        label: 'Total Contratado', 
        value: formatCurrency(contratado),
        icon: <FileText style={{ width: 14, height: 14, color: '#534AB7' }} />,
        tint: '#F3F2FD', 
        valueColor: '#3C3489', 
        main: true 
      },
      { 
        id: 'medido', 
        label: 'Total Medido', 
        value: formatCurrency(medido),
        icon: <Activity style={{ width: 14, height: 14, color: medido > 0 ? '#3B6D11' : '#888' }} />,
        tint: medido > 0 ? '#EAF3DE' : undefined,
        valueColor: medido > 0 ? '#3B6D11' : undefined 
      },
      { 
        id: 'ativos', 
        label: 'Contratos Ativos', 
        value: ativos.toString(),
      }
    ];
  }, [contratos]);

  useEffect(() => {
    if (isActive && onKpisReady && !loading) {
      onKpisReady(kpis);
    }
  }, [kpis, isActive, loading, onKpisReady]);

  const handleSaveContrato = async (payload: Partial<Contrato>) => {
    if (!companyId) return;
    
    // Add missing IDs for creation
    let queryData = { ...payload };
    if (!editingContrato) {
      queryData = { 
        ...queryData, 
        obra_id: obraId, 
        company_id: companyId 
      } as any;
    }

    if (editingContrato) {
      const { error } = await supabase
        .from('contratos')
        .update(queryData)
        .eq('id', editingContrato.id);
      
      if (error) throw error;
      toast({ title: "Atualizado", description: "Contrato salvo com sucesso." });
    } else {
      const { error } = await supabase
        .from('contratos')
        .insert(queryData);
      
      if (error) throw error;
      toast({ title: "Criado", description: "Novo contrato registrado com sucesso." });
    }
    
    fetchContratos();
  };

  const handleSaveAditivo = async (payload: Partial<ContratoAditivo>) => {
    if (!aditivoContrato) return;
    try {
      // 1. Get max numero_aditivo
      const { data: maxData, error: maxErr } = await supabase
        .from('contratos_aditivos')
        .select('numero_aditivo')
        .eq('contrato_id', aditivoContrato.id)
        .order('numero_aditivo', { ascending: false })
        .limit(1);
        
      if (maxErr) throw maxErr;
      
      const nextNum = maxData && maxData.length > 0 ? (maxData[0].numero_aditivo || 0) + 1 : 1;

      // 2. Insert aditivo
      const aditivoPayload = {
        ...payload,
        numero_aditivo: nextNum,
      };

      const { error: insertErr } = await supabase
        .from('contratos_aditivos')
        .insert(aditivoPayload as any);
        
      if (insertErr) throw insertErr;

      // 3. Update contrato
      if (payload.tipo === 'valor' && payload.delta_valor) {
        const nextValor = Number(aditivoContrato.valor_atual) + payload.delta_valor;
        const { error: updErr } = await supabase
          .from('contratos')
          .update({ valor_atual: nextValor })
          .eq('id', aditivoContrato.id);
        if (updErr) throw updErr;
      } else if (payload.tipo === 'prazo' && payload.delta_prazo_dias && aditivoContrato.data_fim_prevista) {
        const currentFim = new Date(aditivoContrato.data_fim_prevista);
        const nextFim = new Date(currentFim);
        nextFim.setDate(nextFim.getDate() + payload.delta_prazo_dias);
        
        const { error: updErr } = await supabase
          .from('contratos')
          .update({ data_fim_prevista: nextFim.toISOString().split('T')[0] })
          .eq('id', aditivoContrato.id);
        if (updErr) throw updErr;
      }
      
      toast({ title: "Sucesso", description: "Aditivo salvo e contrato atualizado." });
      fetchContratos();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = (c: Contrato) => {
    setEditingContrato(c);
    setDrawerOpen(true);
  };

  const handleNewAditivo = (c: ContratoComMetricas) => {
    setAditivoContrato(c);
    setAditivoDrawerOpen(true);
  };

  const handleVerMedicoes = (c: ContratoComMetricas) => {
    setHistoricoOpenId(prev => prev === c.id ? null : c.id);
  };

  const handleNovaMedicao = (c: ContratoComMetricas) => {
    setMedicaoContrato(c);
    setMedicaoDrawerOpen(true);
  };

  const handleNew = () => {
    setEditingContrato(null);
    setDrawerOpen(true);
  };

  if (loading && contratos.length === 0) {
    return (
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted/40 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-background-secondary)]">
      
      {/* TOOLBAR SECUNDÁRIA GERAL DA TELA */}
      <div className="flex justify-between items-center px-6 py-4">
        <h2 className="text-xl font-bold">Base de {tipo === 'cliente' ? 'Clientes' : 'Empreiteiros'}</h2>
        <Button onClick={handleNew} className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <div className="px-6 pb-6 overflow-auto">
        {contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 bg-white rounded-3xl border border-border border-dashed shadow-sm">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-bold text-foreground">Sem contratos registrados</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Comece organizando suas contratações de {tipo === 'cliente' ? 'cliente' : 'empreiteiros'} para liberar relatórios e medições automáticas.
            </p>
            <Button className="mt-3 gap-2" variant="outline" onClick={handleNew}>
              <Plus className="h-4 w-4" /> Adicionar Primeiro
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {contratos.map(c => {
              const medido = c.total_medido || 0;
              const atual = Number(c.valor_atual) || 1;
              const percent = Math.min(100, Math.round((medido / atual) * 100));
              const semMedicao = medido === 0;

              return (
                <Card key={c.id} className="shadow-sm border-border hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full", c.status === 'ativo' ? 'bg-primary' : 'bg-muted-foreground')} />
                  
                  <CardHeader className="pb-3 pt-5 pl-7">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <CardTitle className="text-base text-primary/90 hover:text-primary font-bold cursor-pointer underline-offset-4 hover:underline" onClick={() => handleEdit(c)}>
                          {c.contratado}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest mt-0.5">{c.numero}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 bg-muted/50 capitalize font-medium text-xs">
                        {c.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pl-7 pb-5">
                    <div className="space-y-5">
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                        {c.descricao}
                      </p>

                      <div className="flex items-center gap-8 border-t border-b border-border/40 py-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Valor Atual</p>
                          <p className="font-bold">{formatCurrency(Number(c.valor_atual))}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Modalidade</p>
                          <p className="text-sm font-medium capitalize">{c.modalidade_medicao}</p>
                        </div>
                        {c.data_fim_prevista && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Término Prev.</p>
                            <p className="text-sm font-medium">{format(new Date(c.data_fim_prevista), 'dd/MM/yy')}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs items-end">
                          <span className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Evolução Financeira</span>
                          {semMedicao ? (
                            <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] bg-muted/50">Sem medições</Badge>
                          ) : (
                            <span className="font-bold text-emerald-700">{formatCurrency(medido)} ({percent}%)</span>
                          )}
                        </div>
                        <Progress value={semMedicao ? 0 : percent} className="h-2" />
                      </div>

                      {/* HOVER ROW ACTIONS */}
                      <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur border-t border-border p-3 px-7 flex gap-3 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <Button variant="secondary" size="sm" className="flex-1 text-xs gap-2" onClick={() => handleEdit(c)}>
                          <Edit className="h-3 w-3" /> Editar Base
                        </Button>
                        <Button size="sm" className="flex-1 text-xs gap-2 shrink-0" onClick={() => handleVerMedicoes(c)}>
                          <Activity className="h-3 w-3" /> {historicoOpenId === c.id ? 'Fechar' : 'Ver Medições'}
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs shrink-0 px-3 hover:bg-sidebar-primary/10 hover:text-sidebar-primary hover:border-sidebar-primary/40" onClick={() => handleNewAditivo(c)}>
                          <div className="flex items-center gap-1.5"><Plus className="h-3 w-3" /> Aditivo</div>
                        </Button>
                      </div>
                    </div>
                  </CardContent>

                  {/* MEDIÇÃO HISTÓRICO — expandable below card */}
                  <MedicaoHistorico
                    contratoId={c.id}
                    contrato={c}
                    obra={obraInfo}
                    valorContrato={Number(c.valor_atual)}
                    open={historicoOpenId === c.id}
                    onRequestNovaMedicao={() => handleNovaMedicao(c)}
                  />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ContratoDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tipo={tipo}
        contrato={editingContrato}
        onSave={handleSaveContrato}
      />

      <AditivoDrawer
        open={aditivoDrawerOpen}
        onOpenChange={setAditivoDrawerOpen}
        contrato={aditivoContrato}
        onSave={handleSaveAditivo}
      />

      <MedicaoDrawer
        open={medicaoDrawerOpen}
        onOpenChange={setMedicaoDrawerOpen}
        contrato={medicaoContrato}
        onSaved={fetchContratos}
      />
    </div>
  );
}
