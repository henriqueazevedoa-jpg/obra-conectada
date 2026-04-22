import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import NoObraState from '@/components/obras/NoObraState';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, Camera, Signature, BarChart, TrendingUp, AlertTriangle, 
  BookOpen, Receipt, ShoppingCart, DollarSign, Activity, Loader2
} from 'lucide-react';

import { gerarRelatorioPDF } from '@/lib/gerarRelatorioPDF';
import { gerarBoletimMedicaoPDF } from '@/lib/gerarBoletimMedicao';

export default function RelatoriosPage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { getOrcamento } = useOrcamento();
  const { company } = useCompany();
  const { user } = useAuth();
  
  const obra = obras.find(o => o.id === selectedObraId) || obras[0];
  
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  
  // Dados brutos
  const [diarios, setDiarios] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  
  // Link e permissões
  const [obraLink, setObraLink] = useState<any>(null);
  const [linkPermissoes, setLinkPermissoes] = useState<any>({});

  useEffect(() => {
    if (!obra) return;
    setLoading(true);
    
    Promise.all([
      supabase.from('diario_registros').select('*').eq('obra_id', obra.id).order('data', { ascending: false }).limit(30),
      supabase.from('pagamentos').select('*').eq('obra_id', obra.id).neq('status', 'cancelado'),
      supabase.from('contratos').select('id, numero, contratado, descricao, modalidade_medicao, valor_atual, tipo, medicoes:contratos_medicoes(*)').eq('obra_id', obra.id),
      supabase.from('obra_links').select('*').eq('obra_id', obra.id).limit(1).maybeSingle()
    ]).then(([diariosRes, pagsRes, contsRes, linkRes]) => {
      setDiarios(diariosRes.data || []);
      setPagamentos(pagsRes.data || []);
      setContratos(contsRes.data?.filter(c => c.medicoes?.length > 0) || []);
      
      if (linkRes.data) {
        setObraLink(linkRes.data);
        setLinkPermissoes(linkRes.data.permissoes || {});
      } else {
        setObraLink(null);
        setLinkPermissoes({});
      }
      setLoading(false);
    });
  }, [obra?.id]);

  if (!obra) {
    return <NoObraState title="Nenhuma obra selecionada" description="Selecione uma obra para gerar seus relatórios." />;
  }

  // Métricas extraídas
  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.etapas || [];
  const totalPrevisto = categorias.reduce((s, c) => s + (c.precoTotal || 0), 0);
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_previsto), 0);
  const andamentoReal = categorias.length > 0
    ? Math.round(categorias.reduce((s, c) => s + (c.percentualCronograma || 0), 0) / categorias.length)
    : (obra.percentualAndamento || 0);

  const isAdminOrGestor = user?.role === 'admin' || user?.role === 'gestor';

  const handleTogglePermissao = async (key: string, checked: boolean) => {
    if (!obraLink) {
      toast({ title: 'Atenção', description: 'Crie um link de acesso primeiro no Painel da Obra.', variant: 'destructive' });
      return;
    }
    
    const newPermissoes = { ...linkPermissoes, [key]: { ativo: checked } };
    setLinkPermissoes(newPermissoes);
    
    // update async
    await supabase.from('obra_links').update({ permissoes: newPermissoes }).eq('id', obraLink.id);
  };

  const handleGerarExecutivo = async () => {
    setExportingId('executivo');
    await gerarRelatorioPDF({
      type: 'executivo',
      company: { nome: company?.nome || 'Construtora', logo_url: company?.logo_url },
      obra: { nome: obra.nome, codigo: obra.codigo, cliente: obra.cliente, responsavel: obra.responsavel, endereco: obra.endereco },
      data: { andamentoReal, totalPrevisto, totalPago, categorias, prazoPrevisto: '—' }
    });
    setExportingId(null);
  };

  const handleGerarRDO = async () => {
    setExportingId('rdo');
    await gerarRelatorioPDF({
      type: 'rdo',
      company: { nome: company?.nome || 'Construtora', logo_url: company?.logo_url },
      obra: { nome: obra.nome, codigo: obra.codigo, cliente: obra.cliente, responsavel: obra.responsavel, endereco: obra.endereco },
      data: { registros: diarios }
    });
    setExportingId(null);
  };

  const handleGerarFinanceiro = async () => {
    setExportingId('financeiro');
    await gerarRelatorioPDF({
      type: 'financeiro',
      company: { nome: company?.nome || 'Construtora', logo_url: company?.logo_url },
      obra: { nome: obra.nome, codigo: obra.codigo, cliente: obra.cliente, responsavel: obra.responsavel, endereco: obra.endereco },
      data: { pagamentos, contratosValor: contratos.reduce((s, c) => s + Number(c.valor_atual), 0), totalPago }
    });
    setExportingId(null);
  };

  const handleGerarBoletim = async () => {
    // Pega o ultimo BM
    if (contratos.length === 0) return;
    setExportingId('boletim');
    try {
      const c = contratos[0];
      const m = c.medicoes[0];
      const { data: itens } = await supabase.from('contratos_medicao_itens').select('*').eq('medicao_id', m.id);
      await gerarBoletimMedicaoPDF({
        obra: { nome: obra.nome, codigo: obra.codigo, endereco: obra.endereco },
        contrato: c as any,
        medicao: m as any,
        itens: itens || []
      });
    } catch(e) { /* silent */ }
    setExportingId(null);
  };

  const GROUPS = [
    {
      title: 'Para o Cliente',
      items: [
        { id: 'executivo', icon: FileText, title: 'Relatório Executivo', desc: 'Visão geral da obra em uma página', permissionKey: 'dashboard', action: handleGerarExecutivo },
        { id: 'fotos', icon: Camera, title: 'Relatório Fotográfico', desc: 'Fotos organizadas e categorizadas', permissionKey: 'fotos', action: () => toast({title:'Em breve', description:'Plugin fotográfico será habilitado em breve.'}) },
        ...(contratos.length > 0 ? [{ id: 'boletim', icon: Signature, title: 'Boletim de Medição', desc: 'Último boletim sumarizado', action: handleGerarBoletim }] : [])
      ]
    },
    {
      title: 'Acompanhamento de Controle',
      items: [
        { id: 'avanco', icon: BarChart, title: 'Avanço Físico-Financeiro', desc: 'Etapas vs Custos executados', permissionKey: 'cronograma', action: handleGerarExecutivo },
        { id: 'curvas', icon: TrendingUp, title: 'Curva S (Previsto x Realizado)', desc: 'Comparação de acúmulo de obra', action: () => toast({title:'Em breve', description:'Relatório analítico em desenvolvimento.'}) },
        { id: 'ocorrencias', icon: AlertTriangle, title: 'Ocorrências e Problemas', desc: 'Lista de impedimentos reportados', permissionKey: 'diario', action: handleGerarRDO }
      ]
    },
    {
      title: 'Operacional de Campo',
      items: [
        { id: 'rdo', icon: BookOpen, title: 'Diário de Obra (RDO)', desc: 'Formato ABNT de registros diários', permissionKey: 'diario', action: handleGerarRDO },
        { id: 'pags', icon: Receipt, title: 'Pagamentos do Período', desc: 'Filtro por datas', permissionKey: 'financeiro', action: handleGerarFinanceiro },
        { id: 'compras', icon: ShoppingCart, title: 'Compras e Pedidos', desc: 'Resumo de materiais solicitados', action: () => toast({title:'Em breve', description:'Plugin de compras será ativado.'}) }
      ]
    }
  ];

  if (isAdminOrGestor) {
    GROUPS.push({
      title: 'Financeiro (Visão Restrita)',
      items: [
        { id: 'dre', icon: DollarSign, title: 'DRE da Obra', desc: 'Receitas vs Despesas (Demonstrativo)', permissionKey: 'financeiro', action: handleGerarFinanceiro },
        { id: 'desembolso', icon: Activity, title: 'Curva de Desembolso', desc: 'Fluxo financeiro mês a mês', action: () => toast({title:'Em breve', description:'Curva financeira em desenvolvimento.'}) }
      ]
    });
  }

  return (
    <PageShell title="Galeria de Relatórios" subtitle={`Gestão documental da obra ${obra.nome}`}>
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="animate-spin text-muted-foreground w-6 h-6" /></div>
      ) : (
        <div className="space-y-10 animate-in fade-in pb-8">
          {GROUPS.map(group => (
            <div key={group.title}>
              <h3 className="text-xl font-bold text-foreground mb-4 opacity-90">{group.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map(item => (
                  <Card key={item.id} className="relative shadow-sm transition-all hover:shadow-md border border-border/50 bg-card overflow-hidden group">
                    <CardContent className="p-5 flex gap-4 h-full">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed flex-1">{item.desc}</p>
                        
                        <div className="mt-4 flex flex-col gap-3">
                          {item.permissionKey && (
                            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-foreground">
                                  Link do Cliente
                                </span>
                                {linkPermissoes[item.permissionKey]?.ativo && (
                                  <Badge variant="secondary" className="h-4 text-[8px] px-1 bg-emerald-500/10 text-emerald-600 border-none">Online</Badge>
                                )}
                              </div>
                              <Switch 
                                checked={!!linkPermissoes[item.permissionKey]?.ativo} 
                                onCheckedChange={(v) => handleTogglePermissao(item.permissionKey!, v)}
                                className="scale-75 origin-right"
                              />
                            </div>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="w-full text-xs font-semibold"
                            onClick={item.action}
                            disabled={exportingId === item.id}
                          >
                            {exportingId === item.id ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            {exportingId === item.id ? 'Gerando...' : 'Gerar PDF'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
