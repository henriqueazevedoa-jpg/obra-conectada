import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import PageShell from "@/components/layout/PageShell";
import { supabase } from "@/integrations/supabase/untyped";
import { 
  Building2, 
  CalendarDays, 
  Settings2, 
  ShieldCheck, 
  Bell,
  ChevronRight,
  Upload,
  Save,
  Mail,
  Smartphone,
  Info,
  FileText,
  Bot,
  Zap,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfigCalendarioTab from "./components/ConfigCalendarioTab";
import ConfigProdutividadeTab from "./components/ConfigProdutividadeTab";
import ConfigPermissoesTab from "./components/ConfigPermissoesTab";
import ConfigOrcamentoTab from "./components/ConfigOrcamentoTab";
import ConfigCalculadoraTab from "@/components/configuracoes/ConfigCalculadoraTab";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

// ─── TABS CONFIG ─────────────────────────────────────────────────────────────

const CONFIG_TABS = [
  { id: "empresa",       label: "Empresa",       icon: Building2,    description: "Dados da conta, logo e informações fiscais." },
  { id: "calendario",    label: "Calendário",    icon: CalendarDays, description: "Dias úteis, feriados e horários padrão." },
  { id: "produtividade", label: "Produtividade", icon: Settings2,    description: "Metas globais, índices SINAPI e encargos." },
  { id: "orcamento",     label: "Orçamento",     icon: FileText,     description: "Critério de preço histórico e preferências de orçamento." },
  { id: "calculadora",  label: "Calculadora",  icon: Calculator,   description: "CUB, EAP e parâmetros padrão da calculadora estimativa." },
  { id: "permissoes",    label: "Permissões",    icon: ShieldCheck,  description: "Gerenciamento de papéis e níveis de acesso." },
  { id: "notificacoes",  label: "Notificações",  icon: Bell,         description: "Configuração de alertas por e-mail e push." },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { company, refreshCompany } = useCompany();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  
  const currentTab = searchParams.get("tab") || "empresa";

  // Upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const companyLogo = company?.logo_url;

  // Alertas state
  const [notificacoes, setNotificacoes] = useState({
    custoReal: true,
    estoqueCritico: true,
    financeiroAtrasado: false,
    resumoDiario: true,
    pushHabilitado: false
  });

  // ── Role Guard ──────────
  useEffect(() => {
    if (user && user.role === "engenheiro") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !company) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 2MB.', variant: 'destructive' });
      return;
    }

    try {
      setUploadingLogo(true);
      const ext = file.name.split('.').pop();
      const fileName = `${company.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const { error: dbError } = await (supabase as any)
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', company.id);

      if (dbError) throw dbError;

      await refreshCompany();
      toast({ title: 'Logo atualizado', description: 'Logotipo da empresa importado com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro de upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate save
    setSaving(false);
    toast({
      title: "Configurações salvas",
      description: "As alterações foram aplicadas com sucesso.",
    });
  };

  if (!user || user.role === "engenheiro") return <Navigate to="/dashboard" replace />;

  return (
    <PageShell
      title="Configurações"
      subtitle="Gerencie as configurações globais da sua empresa e plataforma."
    >
      <div className="flex flex-col md:flex-row h-full">
        {/* Sidebar Interna */}
        <aside className="w-full md:w-64 lg:w-72 border-r border-border p-4 shrink-0 overflow-y-auto">
          <nav className="space-y-1">
            {CONFIG_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setSearchParams({ tab: tab.id })}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
                    active 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    active ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground group-hover:text-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold truncate">{tab.label}</p>
                    <p className={cn(
                      "text-[10px] truncate",
                      active ? "text-primary/70" : "text-muted-foreground/60"
                    )}>
                      {tab.description}
                    </p>
                  </div>
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Área de Conteúdo */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto bg-background/50">
          <div className="max-w-3xl mx-auto">
            
            {currentTab === "empresa" && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Dados da Empresa
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Configure o perfil institucional e fiscal da sua conta.</p>
                  </div>
                  <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <Label className="text-sm font-semibold mb-3 block">Logotipo da Empresa</Label>
                    <label className="aspect-video relative rounded-2xl border-2 border-dashed border-border bg-muted/5 flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group overflow-hidden">
                      {uploadingLogo ? (
                        <div className="flex flex-col items-center gap-2">
                           <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                           <span className="text-xs text-muted-foreground">Enviando...</span>
                        </div>
                      ) : companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="h-12 w-12 bg-muted/50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground">Clique para enviar</p>
                          <p className="text-[9px] text-muted-foreground/50 mt-1">PNG, JPG (Máx. 2MB)</p>
                        </div>
                      )}
                      
                      {!uploadingLogo && companyLogo && (
                         <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-xs font-semibold">Alterar Logo</p>
                         </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo} 
                      />
                    </label>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="razao">Razão Social</Label>
                        <Input id="razao" placeholder="Sua Empresa Ltda" defaultValue={company?.nome} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cnpj">CNPJ</Label>
                          <Input id="cnpj" placeholder="00.000.000/0001-00" defaultValue={company?.cnpj} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tel">Telefone Comercial</Label>
                          <Input id="tel" placeholder="(00) 0000-0000" defaultValue={company?.telefone} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end">Endereço Completo</Label>
                        <Input id="end" placeholder="Rua, Número, Bairro - Cidade/UF" />
                      </div>
                    </div>

                    {/* AI Credits Card */}
                    <div className="border border-border rounded-xl p-5 bg-gradient-to-br from-violet-50/50 to-indigo-50/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="bg-violet-100 p-1.5 rounded-md text-violet-600">
                          <Bot className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-sm text-foreground">Obra Conectada AI</h3>
                        <Badge variant="outline" className="ml-auto text-[10px] bg-white border-violet-200 text-violet-700">Add-on</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Créditos Inclusos</p>
                          <p className="text-lg font-bold text-foreground">
                            {company?.ai_credits_included ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Consumo (Mês)</p>
                          <div className="flex items-end gap-1.5">
                            <p className="text-lg font-bold text-foreground">
                              {company?.ai_credits_used_month ?? 0}
                            </p>
                            <p className="text-[10px] text-muted-foreground mb-1.5">
                              / {(company?.ai_credits_included ?? 0) + (company?.ai_credits_extra ?? 0)} totais
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-violet-100/50 flex justify-between items-center">
                        <p className="text-xs text-violet-600">O ciclo renova a cada mês de faturamento.</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 gap-1.5">
                          <Zap className="h-3 w-3" />
                          Mais Créditos
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {currentTab === "notificacoes" && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" />
                      Preferências de Notificação
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Gerencie como você e sua equipe recebem alertas críticos.</p>
                  </div>
                  <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>

                <div className="space-y-4">
                   <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                        <Mail className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold">Notificações por E-mail</h4>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Relatório Diário Automático</Label>
                          <p className="text-xs text-muted-foreground">Receba um resumo das atividades de todas as obras às 07:00.</p>
                        </div>
                        <Switch 
                          checked={notificacoes.resumoDiario} 
                          onCheckedChange={(val) => setNotificacoes({...notificacoes, resumoDiario: val})} 
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Alertas de Estoque Crítico</Label>
                          <p className="text-xs text-muted-foreground">Notificar quando um material atingir o nível mínimo.</p>
                        </div>
                        <Switch 
                          checked={notificacoes.estoqueCritico} 
                          onCheckedChange={(val) => setNotificacoes({...notificacoes, estoqueCritico: val})} 
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Desvios de Custo Real</Label>
                          <p className="text-xs text-muted-foreground">Alerta quando o custo real exceder 10% do previsto.</p>
                        </div>
                        <Switch 
                          checked={notificacoes.custoReal} 
                          onCheckedChange={(val) => setNotificacoes({...notificacoes, custoReal: val})} 
                        />
                      </div>
                   </div>

                   <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-4 opacity-75">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                        <Smartphone className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold">Notificações Push (Mobile)</h4>
                        <Badge variant="outline" className="text-[8px] py-0 h-4 bg-muted text-muted-foreground">BETA</Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Habilitar no Navegador</Label>
                          <p className="text-xs text-muted-foreground">Receba alertas em tempo real mesmo com o sistema fechado.</p>
                        </div>
                        <Switch 
                          checked={notificacoes.pushHabilitado} 
                          onCheckedChange={(val) => setNotificacoes({...notificacoes, pushHabilitado: val})} 
                        />
                      </div>
                   </div>

                   <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
                      <Info className="h-5 w-5 text-blue-500 shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        <strong>Dica:</strong> Você pode configurar destinatários específicos para cada tipo de alerta na aba de <strong>Permissões</strong>, vinculando e-mails aos papéis de Canteiro ou Financeiro.
                      </p>
                   </div>
                </div>
              </section>
            )}

            {currentTab === "calendario" && (
              <ConfigCalendarioTab />
            )}

            {currentTab === "produtividade" && (
              <ConfigProdutividadeTab />
            )}

            {currentTab === "permissoes" && (
              <ConfigPermissoesTab />
            )}
            {currentTab === "orcamento" && (
              <ConfigOrcamentoTab />
            )}
            {currentTab === "calculadora" && (
              <ConfigCalculadoraTab />
            )}
          </div>
        </main>
      </div>
    </PageShell>
  );
}
