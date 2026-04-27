import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
import PageShell, { PageKPI } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, AlertTriangle, Wallet, Users, Lightbulb, CheckCircle2, TrendingUp, CalendarDays, ExternalLink, Clock } from 'lucide-react';
import { format, parseISO, isBefore, isAfter, startOfDay, startOfWeek, endOfWeek, differenceInDays, differenceInBusinessDays, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function calcSPI(tarefas: any[]) {
  const ts = tarefas.filter(t => t.data_fim);
  if (ts.length === 0) return 1.0;
  const hoje = startOfDay(new Date());
  const andReal = ts.reduce((s, c) => s + c.percentual_concluido, 0) / ts.length;
  const schedCount = ts.filter(t => isBefore(parseISO(t.data_fim), hoje)).length;
  const andPlan = (schedCount / ts.length) * 100;
  return andPlan > 0 ? (andReal / andPlan) : 1.0;
}

export default function GestorDashboard() {
  const { obras } = useObras();
  const { company } = useCompany();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState({
    tarefas: [] as any[],
    diario: [] as any[],
    pagamentos: [] as any[],
    contratos: [] as any[],
    custoReal: [] as any[],
    orcamentoCats: [] as any[],
    profiles: [] as any[],
  });

  const obraIds = useMemo(() => obras.map(o => o.id), [obras]);
  const obraIdsKey = obraIds.join(',');
  const companyId = company?.id;

  useEffect(() => {
    if (obraIds.length === 0 || !companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      supabase.from('cronograma_tarefas').select('id, obra_id, percentual_concluido, data_fim').in('obra_id', obraIds),
      supabase.from('diario_registros').select('id, obra_id, user_id, data').in('obra_id', obraIds).order('data', { ascending: false }),
      supabase.from('pagamentos').select('id, obra_id, status, data_vencimento, valor_previsto, valor_pago').in('obra_id', obraIds),
      supabase.from('contratos').select('id, obra_id, descricao, contratos_medicoes!contratos_medicoes_contrato_id_fkey(data_referencia, status)').in('obra_id', obraIds),
      supabase.from('custo_real').select('id, obra_id, valor').in('obra_id', obraIds),
      supabase.from('orcamento_categorias').select('id, obra_id, preco_total').in('obra_id', obraIds),
      supabase.from('profiles').select('id, user_id, nome').eq('company_id', companyId),
      supabase.from('user_roles').select('user_id, role').eq('company_id', companyId)
    ]).then(([resT, resD, resP, resC, resCust, resOrc, resProf, resRoles]) => {
      const rolesArr = resRoles.data || [];
      const profilesMerged = (resProf.data || []).map((p: any) => {
        const found = rolesArr.find((r: any) => r.user_id === p.user_id);
        return { ...p, role: found?.role || '' };
      });

      setDbData({
        tarefas: resT.data || [],
        diario: resD.data || [],
        pagamentos: resP.data || [],
        contratos: resC.data || [],
        custoReal: resCust.data || [],
        orcamentoCats: resOrc.data || [],
        profiles: profilesMerged,
      });
      setLoading(false);
    });
  }, [obraIdsKey, companyId]);

  const hoje = startOfDay(new Date());

  const computed = useMemo(() => {
    const list = obras.map(obra => {
      const ts = dbData.tarefas.filter(t => t.obra_id === obra.id);
      const ds = dbData.diario.filter(d => d.obra_id === obra.id);
      const cust = dbData.custoReal.filter(c => c.obra_id === obra.id).reduce((s, c) => s + (c.valor || 0), 0);
      const orc = dbData.orcamentoCats.filter(o => o.obra_id === obra.id).reduce((s, o) => s + (o.preco_total || 0), 0);
      const pags = dbData.pagamentos.filter(p => p.obra_id === obra.id);
      const contrs = dbData.contratos.filter(c => c.obra_id === obra.id);

      const spi = calcSPI(ts);
      
      let lastDiarioDate: Date | null = null;
      if (ds.length > 0) lastDiarioDate = parseISO(ds[0].data);
      const diasSemDiario = lastDiarioDate ? differenceInBusinessDays(hoje, lastDiarioDate) : 999;

      let medicaoPendente = false;
      let contratoNomePendente = '';
      for (const c of contrs) {
        const purs = c.contratos_medicoes || [];
        if (purs.length === 0) continue;
        const last = [...purs].sort((a: any, b: any) => new Date(b.data_referencia).getTime() - new Date(a.data_referencia).getTime())[0];
        if (differenceInDays(hoje, parseISO(last.data_referencia)) >= 25 && last.status !== 'concluida') {
          medicaoPendente = true;
          contratoNomePendente = c.descricao;
          break;
        }
      }

      const atrasados = pags.filter(p => p.status === 'atrasado' || (p.status === 'previsto' && isBefore(parseISO(p.data_vencimento), hoje)));
      const sumAtrasados = atrasados.reduce((s, p) => s + (p.valor_previsto || 0), 0);

      const tsSemana = ts.filter(t => t.data_fim && t.percentual_concluido < 100 && isAfter(parseISO(t.data_fim), addDays(hoje, -1)) && isBefore(parseISO(t.data_fim), addDays(endOfWeek(hoje, { weekStartsOn: 1 }), 1))).length;

      return {
        obra,
        spi,
        cust,
        orc,
        diasSemDiario,
        medicaoPendente,
        contratoNomePendente,
        sumAtrasados,
        tsSemana
      };
    });

    return list;
  }, [obras, dbData, hoje]);

  const globalPagsInAtraso = computed.reduce((s, c) => s + c.sumAtrasados, 0);
  const obrasInAtraso = computed.filter(c => c.sumAtrasados > 0).length;
  const totalOrcado = computed.reduce((s, c) => s + c.orc, 0);
  const totalExecutado = computed.reduce((s, c) => s + c.cust, 0);
  const totalDesvio = totalOrcado > 0 ? (totalExecutado / totalOrcado) * 100 : 0;

  const alertas = useMemo(() => {
    const list: any[] = [];
    
    // ALERTA 1: Risco de prazo (SPI < 0.8)
    const piorSpi = [...computed].sort((a,b) => a.spi - b.spi)[0];
    if (piorSpi && piorSpi.spi < 0.8) {
      list.push({ tipo: 'prazo', text: `⚠ [${piorSpi.obra.codigo}] Ritmo atual compromete prazo final (SPI ${piorSpi.spi.toFixed(2)})`, link: '/cronograma' });
    }

    // ALERTA 2: Estouro Financeiro (> 85%)
    const piorCusto = [...computed].filter(c => c.orc > 0).sort((a,b) => (b.cust/b.orc) - (a.cust/a.orc))[0];
    if (piorCusto && (piorCusto.cust / piorCusto.orc) > 0.85) {
      list.push({ tipo: 'fin', text: `⚠ [${piorCusto.obra.codigo}] Custo real já em ${((piorCusto.cust / piorCusto.orc)*100).toFixed(1)}% do orçado`, link: '/financeiro?tab=dashboard' });
    }

    // ALERTA 3: Engenheiro inativo (+3 dias sem diário)
    const piorDiario = [...computed].sort((a,b) => b.diasSemDiario - a.diasSemDiario)[0];
    if (piorDiario && piorDiario.diasSemDiario >= 3 && piorDiario.diasSemDiario < 999) {
      list.push({ tipo: 'diario', text: `💡 [${piorDiario.obra.codigo}] Sem registro de equipe em campo há ${piorDiario.diasSemDiario} dias`, link: '/painel' });
    }

    // ALERTA 4: Medição não emitida
    const comMed = computed.find(c => c.medicaoPendente);
    if (comMed) {
      list.push({ tipo: 'med', text: `💡 [${comMed.obra.codigo}] - Contrato "${comMed.contratoNomePendente}" com medição pendente`, link: '/projetos?tab=contratos' });
    }

    // ALERTA 5: Pagamento vencido
    if (globalPagsInAtraso > 0) {
      list.push({ tipo: 'pag', text: `🔴 R$ ${globalPagsInAtraso.toLocaleString('pt-BR', {minimumFractionDigits:2})} em pagamentos vencidos em ${obrasInAtraso} obra(s)`, link: '/financeiro?tab=pagamentos' });
    }

    return list.slice(0, 5);
  }, [computed, globalPagsInAtraso, obrasInAtraso]);

  const ranking = [...computed].sort((a, b) => a.spi - b.spi).slice(0, 10);

  const kpis: PageKPI[] = [
    { id: 'k1', label: 'Obras Ativas', value: String(obras.length), icon: <Building2 size={18} className="text-primary"/>, main: true, tint: '#fdfbfe', valueColor: 'var(--color-primary)', labelColor: '#6b7280' },
    { id: 'k2', label: 'Total Orçado', value: `R$ ${(totalOrcado/1000).toFixed(0)}k`, icon: <Wallet size={18} className="text-blue-500"/>, tint: '#eff6ff', valueColor: '#3b82f6', labelColor: '#6b7280' },
    { id: 'k3', label: 'Desvio Gasto/Orçado', value: `${totalDesvio.toFixed(1)}%`, icon: <TrendingUp size={18} className="text-orange-500"/>, tint: '#fff7ed', valueColor: totalDesvio > 85 ? '#ef4444' : '#f97316', labelColor: '#6b7280' },
    { id: 'k4', label: 'Etapas em Atraso', value: String(computed.reduce((s,c) => s + c.tsSemana, 0)), icon: <AlertTriangle size={18} className="text-red-500"/>, tint: '#fef2f2', valueColor: '#ef4444', labelColor: '#6b7280' },
  ];

  if (obraIds.length === 0) {
    return (
      <PageShell title="Visão da Empresa" subtitle="Dashboard Executivo">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-xl font-bold mb-2">Sem operações ativas</h2>
          <p className="text-muted-foreground w-[300px] text-center text-sm">A empresa não possui obras em andamento para exibir a visão consolidada.</p>
        </div>
      </PageShell>
    );
  }

  const engenheiros = dbData.profiles.filter(p => p.role === 'funcionario' || p.role === 'engenheiro' || p.role === 'gestor').map(prof => {
    const profDiarios = dbData.diario.filter(d => d.user_id === prof.user_id);
    let ult = null;
    let diasAusente = 999;
    if (profDiarios.length > 0) {
      ult = parseISO(profDiarios[0].data);
      diasAusente = differenceInBusinessDays(hoje, ult);
    }
    const profObras = [...new Set(profDiarios.map(d => d.obra_id))].length;
    return { ...prof, ultimoRegistro: ult, diasAusente, profObras };
  });

  return (
    <PageShell title="Visão da Empresa" subtitle="Centro de controle executivo do portfólio" kpis={kpis}>
      {loading ? (
        <div className="flex h-64 items-center justify-center animate-pulse"><p className="text-muted-foreground">Consolidando Datalake da Plataforma...</p></div>
      ) : (
        <div className="max-w-[1280px] mx-auto w-full space-y-6 pb-20 animate-fade-in px-4 sm:px-6 h-full overflow-y-auto">

          {/* BRIEFING EXECUTIVO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <section className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-6 text-slate-100 shadow-card">
                <h3 className="text-xs uppercase font-bold text-slate-400 mb-2">Resumo Operacional</h3>
                <p className="text-2xl font-bold mb-1">
                  {obras.length} <span className="text-slate-300 text-lg font-medium">obras ativas</span>
                </p>
                <div className="flex gap-4 mt-4">
                  <div>
                    <p className="text-3xl font-bold text-amber-400">{computed.filter(c => c.spi < 0.9 || c.diasSemDiario > 2).length}</p>
                    <p className="text-xs text-amber-100/50">com atenção</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-500">{obrasInAtraso}</p>
                    <p className="text-xs text-red-200/50">bloqueadas / dívida</p>
                  </div>
                </div>
              </section>

              {/* INTELIGENCIA DECISIONAL */}
              <section className="bg-white border rounded-xl shadow-sm p-4">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-2 mb-3"><Lightbulb className="h-4 w-4 text-primary" /> Alertas Priorizados</h3>
                <div className="space-y-3">
                  {alertas.length === 0 && <p className="text-sm text-slate-500">Nenhum ruído detectado no sistema hoje.</p>}
                  {alertas.map((al, idx) => (
                    <div key={idx} className="bg-slate-50 border rounded p-3 text-sm flex flex-col items-start gap-2 transition hover:bg-slate-100 cursor-default">
                      <span className="font-medium text-slate-700 leading-tight">{al.text}</span>
                      <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => navigate(al.link)}>Verificar <ExternalLink className="h-3 w-3 ml-1" /></Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="lg:col-span-8 space-y-6">
              
              {/* CAMADAS TEMPORAIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-none border bg-blue-50/50">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2"><Clock className="h-4 w-4 text-blue-600"/> Esta Semana</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center"><span className="text-slate-600">Obras c/ etapas vencendo</span><span className="font-bold">{computed.filter(c => c.tsSemana > 0).length}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">Total vencendo (R$)</span><span className="font-bold text-red-600">{(globalPagsInAtraso/1000).toFixed(1)}k</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">Eng. inativos (+3d)</span><span className="font-bold">{engenheiros.filter(e => e.diasAusente >= 3 && e.diasAusente < 99).length}</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-none border bg-indigo-50/50">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-600"/> Este Mês</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center"><span className="text-slate-600">Obras com SPI &lt; 0.9</span><span className="font-bold text-orange-600">{computed.filter(c => c.spi < 0.9).length}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">Desvio Financeiro Geral</span><span className="font-bold">{totalDesvio.toFixed(1)}%</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-600">Contratos s/ medição</span><span className="font-bold">{computed.filter(c => c.medicaoPendente).length}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PAINEL FINANCEIRO CONSOLIDADO */}
              <Card className="shadow-md">
                <CardHeader className="py-4 border-b">
                  <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4"/> Finanças Orçado vs Apropriado</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded border">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Total Orçado</p>
                      <p className="text-xl font-bold mt-1 text-slate-900">R$ {(totalOrcado/1000).toFixed(0)}k</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Realizado</p>
                      <p className="text-xl font-bold mt-1 text-slate-900">R$ {(totalExecutado/1000).toFixed(0)}k</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded border">
                      <p className="text-xs text-slate-500 font-semibold uppercase">Consumo Global</p>
                      <p className={`text-xl font-bold mt-1 ${totalDesvio > 100 ? 'text-red-600' : 'text-emerald-600'}`}>{totalDesvio.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                    {computed.filter(c => c.orc > 0).sort((a,b) => b.orc - a.orc).slice(0,8).map(c => {
                      const perc = Math.min((c.cust / c.orc) * 100, 100);
                      const isOver = c.cust > c.orc;
                      return (
                        <div key={c.obra.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 truncate w-3/4">{c.obra.nome}</span>
                            <span className="font-semibold text-slate-500">{((c.cust/c.orc)*100).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${perc}%` }} />
                            {isOver && <div className="h-full bg-red-500 flex-1 ml-1 rounded-full"/>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PERFORMANCE COMPARATIVA */}
            <Card className="shadow-sm">
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4"/> Performance das Obras</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-500">
                    <tr>
                      <th className="font-semibold py-2 px-4">Obra</th>
                      <th className="font-semibold py-2 px-3 text-center">SPI</th>
                      <th className="font-semibold py-2 px-3 text-center">Desvio $</th>
                      <th className="font-semibold py-2 px-3 text-center">Atrasos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row, i) => (
                      <tr key={row.obra.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-700 truncate max-w-[120px]" title={row.obra.nome}>{row.obra.nome}</td>
                        <td className={`py-3 px-3 text-center font-bold ${row.spi < 0.8 ? 'text-red-600' : 'text-emerald-600'}`}>{row.spi.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center font-medium">
                          {row.orc > 0 ? `${((row.cust/row.orc)*100).toFixed(0)}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {row.tsSemana > 0 ? <Badge variant="destructive" className="px-1.5 h-5 text-[10px]">{row.tsSemana} atrs</Badge> : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* GESTÃO DE EQUIPE */}
            <Card className="shadow-sm">
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4"/> Gestão de Equipe (Diários)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-[340px]">
                {engenheiros.length === 0 ? (
                  <p className="text-sm p-5 text-slate-500 text-center">Nenhum funcionário encontrado na empresa.</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b text-slate-500">
                      <tr>
                        <th className="font-semibold py-2 px-4">Engenheiro / Técnico</th>
                        <th className="font-semibold py-2 px-3 text-center">Obras Vinculadas</th>
                        <th className="font-semibold py-2 px-4 text-right">Último Log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {engenheiros.sort((a,b) => b.diasAusente - a.diasAusente).map(eng => (
                        <tr key={eng.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {eng.nome || 'Usuário Pendente'}
                            <div className="text-[10px] text-slate-400 capitalize">{eng.role}</div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600">{eng.profObras > 0 ? eng.profObras : '-'}</td>
                          <td className="py-3 px-4 text-right">
                            {eng.diasAusente > 99 ? (
                              <span className="text-slate-400">Nunca</span>
                            ) : eng.diasAusente >= 3 ? (
                              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px]">Há {eng.diasAusente} dias</Badge>
                            ) : (
                              <span className="text-emerald-600 font-medium whitespace-nowrap">{eng.ultimoRegistro ? format(eng.ultimoRegistro, "dd MMM 'às' HH:mm", {locale:ptBR}) : '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </PageShell>
  );
}
