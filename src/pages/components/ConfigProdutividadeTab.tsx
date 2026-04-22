import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { Settings2, RotateCcw, Info, Search, Activity, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Define the interface for the new table
interface AmdahlGrupoRow {
  id: string;
  company_id: string | null;
  nome: string;
  descricao: string | null;
  amdahl_p: number;
  amdahl_f: number;
  composicoes_sinapi: any;
}

const MACRO_GRUPOS = [
  { id: 'fundacao', label: 'Fundações e Terraplenagem', terms: ['escavação', 'compactação', 'estaca', 'tubulão', 'fundação', 'arrimo'] },
  { id: 'estrutura', label: 'Estrutura de Concreto', terms: ['pilar', 'viga', 'laje', 'concreto', 'forma', 'armação', 'desforma'] },
  { id: 'alvenaria', label: 'Alvenaria e Vedações', terms: ['bloco', 'tijolo', 'verga', 'drywall', 'cimentício'] },
  { id: 'cobertura', label: 'Cobertura', terms: ['telhado', 'telha', 'rufo', 'calha', 'cobertura plana'] },
  { id: 'instalacao', label: 'Instalações', terms: ['esgoto', 'água', 'louça', 'metais', 'aquecimento', 'eletroduto', 'fiação', 'quadro', 'tomada', 'luminária', 'spda', 'cftv', 'condicionado', 'gás', 'incêndio', 'elevador'] },
  { id: 'revestimento', label: 'Revestimentos e Pintura', terms: ['chapisco', 'emboço', 'reboco', 'cerâmica', 'porcelanato', 'textura', 'pintura', 'eifs', 'gesso', 'epóxi', 'massa corrida', 'verniz'] },
  { id: 'piso', label: 'Pisos e Forros', terms: ['lastro', 'contrapiso', 'piso', 'taco', 'rodapé', 'forro', 'pvc', 'isopor', 'laminado', 'madeira'] },
  { id: 'esquadria', label: 'Esquadrias', terms: ['esquadria', 'porta', 'vidro', 'portão'] },
  { id: 'externa', label: 'Áreas Externas e Canteiro', terms: ['calçada', 'pavimentação', 'drenagem', 'paisagismo', 'jardinagem', 'piscina', 'demolição', 'remoção', 'mobilização', 'limpeza', 'desmobilização', 'vistoria'] }
];

function getMacroGroup(nome: string) {
  const lower = nome.toLowerCase();
  for (const g of MACRO_GRUPOS) {
    if (g.terms.some(t => lower.includes(t))) return g.label;
  }
  return 'Outros';
}

export default function ConfigProdutividadeTab() {
  const { company } = useCompany();
  const [grupos, setGrupos] = useState<AmdahlGrupoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [obrasConcluidas, setObrasConcluidas] = useState(0);

  const fetchParams = async () => {
    if (!company) return;
    setLoading(true);
    // Fetch global and company specific groups
    const { data } = await supabase
      .from('amdahl_grupos')
      .select('*')
      .or(`company_id.is.null,company_id.eq.${company.id}`)
      .order('company_id', { ascending: false, nullsFirst: false }); // overrides first if duplicated

    if (data) {
      setGrupos(data);
    }
    
    const { count } = await supabase.from('obras').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'concluida');
    setObrasConcluidas(count || 0);

    setLoading(false);
  };

  useEffect(() => {
    fetchParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // Aggregate into unique items (prefer company override if exists)
  const consolidated = useMemo(() => {
    const map = new Map<string, { global: AmdahlGrupoRow | null; override: AmdahlGrupoRow | null }>();
    
    grupos.forEach(row => {
      // Find matching item by name to establish the global vs override relationship
      const key = row.nome.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { global: null, override: null });
      }
      
      const entry = map.get(key)!;
      if (row.company_id) {
        entry.override = row;
      } else {
        entry.global = row;
      }
    });

    // Now convert back to flat list grouped by Macro Group
    const list = Array.from(map.values()).map(e => ({
       active: e.override || e.global!,
       isOverride: !!e.override,
       globalRef: e.global,
       overrideRef: e.override
    })).filter(e => e.active);

    return list;
  }, [grupos]);

  const mapByMacroGroup = useMemo(() => {
     const grouped: Record<string, typeof consolidated> = {};
     consolidated.forEach(item => {
        if (searchTerm && !item.active.nome.toLowerCase().includes(searchTerm.toLowerCase()) && !item.active.descricao?.toLowerCase().includes(searchTerm.toLowerCase())) {
           return;
        }
        const mg = getMacroGroup(item.active.nome);
        if (!grouped[mg]) grouped[mg] = [];
        grouped[mg].push(item);
     });
     return grouped;
  }, [consolidated, searchTerm]);

  const updateParam = async (itemKey: string, field: 'amdahl_p' | 'amdahl_f', val: number) => {
    if (!company) return;
    
    const entry = consolidated.find(e => e.active.nome.toLowerCase() === itemKey);
    if (!entry) return;
    
    if (entry.isOverride) {
      // Update existing override
      const { error } = await supabase.from('amdahl_grupos').update({ [field]: val }).eq('id', entry.overrideRef!.id);
      if (!error) {
        setGrupos(prev => prev.map(r => r.id === entry.overrideRef!.id ? { ...r, [field]: val } : r));
      } else {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' });
      }
    } else {
      // Create override
      const baseRow = entry.globalRef!;
      const newRow = { 
        company_id: company.id, 
        nome: baseRow.nome,
        descricao: baseRow.descricao,
        composicoes_sinapi: baseRow.composicoes_sinapi,
        amdahl_p: field === 'amdahl_p' ? val : baseRow.amdahl_p,
        amdahl_f: field === 'amdahl_f' ? val : baseRow.amdahl_f
      };
      
      const { data, error } = await supabase.from('amdahl_grupos').insert(newRow).select().single();
      if (!error && data) {
         setGrupos(prev => [data, ...prev]);
      } else {
         toast({ title: 'Erro ao criar customização', variant: 'destructive' });
      }
    }
  };

  const redefinirPadrao = async (overrideId: string) => {
    if (!company) return;
    const { error } = await supabase.from('amdahl_grupos').delete().eq('id', overrideId);
    if (!error) {
       setGrupos(prev => prev.filter(r => r.id !== overrideId));
       toast({ title: 'Parâmetro restaurado ao padrão' });
    }
  };

  if (loading) return null;

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row gap-4 md:items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Taxas de Produtividade (Amdahl)
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Ajuste as métricas da Lei de Amdahl para os grupos de serviços. O sistema utiliza essas premissas para calcular a perda de eficiência (coordenação) e o limite de paralelização de equipes.
          </p>
        </div>
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Pesquisar perfil de serviço..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(mapByMacroGroup).length === 0 ? (
           <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl bg-card">
              Nenhum perfil encontrado para "{searchTerm}"
           </div>
        ) : (
           Object.entries(mapByMacroGroup).map(([mgName, items]) => (
             <div key={mgName} className="space-y-3">
               <h3 className="font-semibold text-sm text-muted-foreground px-1 uppercase tracking-wider">{mgName}</h3>
               
               <Accordion type="multiple" className="space-y-3">
                 {items.map((item) => {
                   const { active, isOverride, overrideRef } = item;
                   const p_value = Math.round(active.amdahl_p * 100);
                   const f_value = Math.round(active.amdahl_f * 100);

                   return (
                     <AccordionItem 
                       value={active.id} 
                       key={active.id} 
                       className={`border rounded-2xl overflow-hidden shadow-sm transition-colors ${
                         isOverride ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                       }`}
                     >
                       <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 pr-4">
                            <div className="text-left w-full max-w-lg">
                               <div className="font-semibold text-foreground flex items-center gap-2">
                                 {active.nome}
                                 {isOverride && (
                                   <Badge className="bg-primary/20 hover:bg-primary/20 text-primary border-primary/30 text-[10px] h-5 py-0">
                                      Customizado
                                   </Badge>
                                 )}
                               </div>
                               <p className="text-xs text-muted-foreground font-normal mt-0.5 line-clamp-1">{active.descricao}</p>
                            </div>
                            
                            <div className="flex gap-6 items-center flex-wrap shrink-0 mr-4">
                               <div className="flex items-center gap-2">
                                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                  <div className="text-xs">
                                     <span className="text-muted-foreground">Paralelização:</span> <span className="font-mono font-medium">{p_value}%</span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-2">
                                  <Activity className="w-3.5 h-3.5 text-red-500/70" />
                                  <div className="text-xs">
                                     <span className="text-muted-foreground">Perda/coord.:</span> <span className="font-mono font-medium">{f_value}%</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                       </AccordionTrigger>
                       <AccordionContent className="px-5 pb-5 pt-2 border-t border-border/50 bg-background/50">
                          <div className="flex flex-col lg:flex-row gap-8 items-start max-w-4xl pt-4">
                             <div className="space-y-6 flex-1 w-full">
                                <div>
                                  <div className="flex justify-between text-sm mb-2 font-medium">
                                    <Label className="flex flex-col text-foreground">
                                       Fator de Paralelização (P)
                                       <span className="text-[11px] font-normal text-muted-foreground mt-0.5">Quanto desta tarefa pode ser dividida entre múltiplos operários simultâneos.</span>
                                    </Label>
                                    <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md self-start">{p_value}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0" max="100" step="1"
                                    value={p_value}
                                    className="w-full h-1.5 accent-primary cursor-pointer mb-1"
                                    onChange={(e) => updateParam(active.nome.toLowerCase(), 'amdahl_p', Number(e.target.value) / 100)}
                                  />
                                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                     <span>Uma pessoa apenas</span>
                                     <span>Várias pessoas (Divisível)</span>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between text-sm mb-2 font-medium">
                                    <Label className="flex flex-col text-foreground">
                                       Fator de Perda de Coordenação (f)
                                       <span className="text-[11px] font-normal text-muted-foreground mt-0.5">Percentual de eficiência perdido a cada operário adicionado (gargalo de espaço ou gestão).</span>
                                    </Label>
                                    <span className="font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded-md self-start">{f_value}%</span>
                                  </div>
                                  <input 
                                    type="range" min="0" max="35" step="1"
                                    value={f_value}
                                    className="w-full h-1.5 accent-destructive cursor-pointer mb-1"
                                    onChange={(e) => updateParam(active.nome.toLowerCase(), 'amdahl_f', Number(e.target.value) / 100)}
                                  />
                                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                     <span>Sem Perda</span>
                                     <span>Altíssima Perda (Gargalo Rápido)</span>
                                  </div>
                                </div>
                             </div>

                             <div className="w-full lg:w-64 bg-card border rounded-xl p-4 shrink-0 flex flex-col items-center text-center">
                                <Clock className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
                                <h4 className="text-sm font-semibold mb-1">Amdahl em Ação</h4>
                                <p className="text-[11px] text-muted-foreground mb-4">
                                   Com {p_value}% paralelizável e {f_value}% de perda por cabeça, colocar 2 pessoas não fará o tempo cair pela metade, mas sim preverá as quebras naturais de convívio na frente de serviço.
                                </p>
                                {isOverride && (
                                   <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full text-xs h-8 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => redefinirPadrao(overrideRef!.id)}
                                   >
                                      <RotateCcw className="w-3 h-3 mr-2" />
                                      Restaurar Padrão Global
                                   </Button>
                                )}
                             </div>
                          </div>
                       </AccordionContent>
                     </AccordionItem>
                   );
                 })}
               </Accordion>
             </div>
           ))
        )}
      </div>

      <div className="p-6 border border-border bg-card rounded-2xl flex flex-col md:flex-row items-center gap-6 justify-between">
         <div className="flex-1">
           <h3 className="font-bold mb-2 flex items-center gap-2 text-foreground">
             <Info className="w-4 h-4 text-primary" />
             Calibração Automática de IA
           </h3>
           <p className="text-xs text-muted-foreground mb-3 max-w-xl">
             O sistema analisa frentes de serviço das suas obras concluídas para ajustar os Parâmetros Amdahl automaticamente à realidade da sua empresa. Para isso, são necessárias pelo menos 5 obras concluídas como base de dados.
           </p>
           
           <div className="flex items-center gap-4 max-w-sm mt-1">
             <div className="flex-1">
               <Progress value={(obrasConcluidas / 5) * 100} className="h-2" />
             </div>
             <span className="text-xs font-semibold text-foreground whitespace-nowrap">
               {Math.min(obrasConcluidas, 5)} / 5 obras
             </span>
           </div>
         </div>

         {obrasConcluidas >= 5 ? (
           <Button className="w-full md:w-auto text-sm shadow-sm">Habilitar Machine Learning</Button>
         ) : (
           <Button disabled variant="outline" className="w-full md:w-auto text-xs bg-muted/30">
             Aguardando mais Diários de Obra
           </Button>
         )}
      </div>
    </section>
  );
}
