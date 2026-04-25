import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

const DIAS_SEMANA = [
  { val: 0, label: 'Dom' },
  { val: 1, label: 'Seg' },
  { val: 2, label: 'Ter' },
  { val: 3, label: 'Qua' },
  { val: 4, label: 'Qui' },
  { val: 5, label: 'Sex' },
  { val: 6, label: 'Sáb' },
];

const FERIADOS_NACIONAIS = [
  { dataStr: '01-01', desc: 'Confraternização Universal' },
  { dataStr: '04-21', desc: 'Tiradentes' },
  { dataStr: '05-01', desc: 'Dia do Trabalho' },
  { dataStr: '09-07', desc: 'Independência do Brasil' },
  { dataStr: '10-12', desc: 'Nossa Senhora Aparecida' },
  { dataStr: '11-02', desc: 'Finados' },
  { dataStr: '11-15', desc: 'Proclamação da República' },
  { dataStr: '12-25', desc: 'Natal' },
];

interface CalendarioObraTabProps {
  obraId: string;
}

export default function CalendarioObraTab({ obraId }: CalendarioObraTabProps) {
  const { company } = useCompany();
  const [diasUteis, setDiasUteis] = useState<number[]>([1,2,3,4,5]);
  const [horasPorDia, setHorasPorDia] = useState<number>(8);
  const [feriados, setFeriados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInheriting, setIsInheriting] = useState(true);
  
  const [newFData, setNewFData] = useState('');
  const [newFDesc, setNewFDesc] = useState('');

  useEffect(() => {
    if (!company || !obraId) return;
    
    const fetchCal = async () => {
      setLoading(true);
      
      // Tentar buscar calendário específico da obra
      const { data: obraCal } = await supabase.from('obra_calendarios').select('*').eq('obra_id', obraId).maybeSingle();
      
      if (obraCal) {
        setIsInheriting(false);
        setDiasUteis(obraCal.dias_uteis || [1,2,3,4,5]);
        setHorasPorDia(obraCal.horas_por_dia || 8);
        
        const { data: fData } = await supabase.from('obra_calendarios_holidays').select('*').eq('obra_id', obraId);
        if (fData) setFeriados(fData);
      } else {
        // Obra não tem calendário próprio, usar o da empresa (herdado)
        setIsInheriting(true);
        const { data: compCal } = await supabase.from('company_calendar').select('*').eq('company_id', company.id).maybeSingle();
        if (compCal) {
          setDiasUteis(compCal.dias_uteis || [1,2,3,4,5]);
          setHorasPorDia(compCal.horas_por_dia || 8);
        }
        
        const { data: cFData } = await supabase.from('company_calendar_holidays').select('*').eq('company_id', company.id);
        if (cFData) setFeriados(cFData);
      }
      
      setLoading(false);
    };
    
    fetchCal();
  }, [company, obraId]);

  const saveCal = async (novosDias: number[], novasHoras: number) => {
    if (!obraId) return;
    
    // Se estava herdando, primeiro os feriados precisam ser copiados, ou pode começar vazio. 
    // Para simplificar, quando a pessoa alterar, ela passa a ter o próprio calendário
    const { error } = await supabase.from('obra_calendarios').upsert({
      obra_id: obraId,
      dias_uteis: novosDias,
      horas_por_dia: novasHoras
    }, { onConflict: 'obra_id' });
    
    if (error) {
      toast({ title: 'Erro ao salvar jornada', variant: 'destructive' });
    } else {
      if (isInheriting) {
        // Se começou agora a customizar, os feriados herdados devem ser mostrados
        // mas não estão ainda na tabela obra_calendarios_holidays. Poderíamos clonar, 
        // mas por enquanto basta setInheriting = false.
        setIsInheriting(false);
        setFeriados([]); // Opcional: clonar os feriados da empresa para a obra aqui.
      }
      toast({ title: 'Jornada da obra atualizada' });
    }
  };

  const toggleDia = (d: number) => {
    const novos = diasUteis.includes(d) ? diasUteis.filter(x => x !== d) : [...diasUteis, d].sort();
    setDiasUteis(novos);
    saveCal(novos, horasPorDia);
  };

  const changeHoras = (val: string) => {
    const h = Number(val);
    setHorasPorDia(h);
    saveCal(diasUteis, h);
  };

  const addFeriado = async (dataInput: string, desc: string, recorrente: boolean = false) => {
    if (!obraId || !dataInput || !desc) return;
    
    // Se estiver herdando, ao adicionar feriado ele já customiza o calendário
    if (isInheriting) {
       await saveCal(diasUteis, horasPorDia); // Cria a config base primeiro
    }

    const isoDate = dataInput.includes('-') && dataInput.length === 5 
       ? `${new Date().getFullYear()}-${dataInput}` 
       : dataInput;

    const { data: novo, error } = await supabase.from('obra_calendarios_holidays').insert({
      obra_id: obraId,
      data: isoDate,
      descricao: desc,
      recorrente: recorrente
    }).select().single();

    if (error) {
      toast({ title: 'Erro ao adicionar feriado', variant: 'destructive' });
    } else if (novo) {
      setFeriados(prev => [...prev, novo]);
      toast({ title: 'Feriado adicionado' });
      setNewFData('');
      setNewFDesc('');
    }
  };

  const removeFeriado = async (id: string) => {
    if (isInheriting) {
      toast({ title: 'Este é um feriado da empresa', description: 'Você deve customizar os dias úteis antes de remover feriados.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('obra_calendarios_holidays').delete().eq('id', id);
    if (!error) {
       setFeriados(feriados.filter(f => f.id !== id));
       toast({ title: 'Feriado removido' });
    }
  };

  const revertToCompany = async () => {
    if (!obraId) return;
    setLoading(true);
    await supabase.from('obra_calendarios').delete().eq('obra_id', obraId);
    toast({ title: 'Calendário revertido para o padrão da empresa' });
    // Recarrega
    if (company) {
       const { data: compCal } = await supabase.from('company_calendar').select('*').eq('company_id', company.id).maybeSingle();
       if (compCal) {
         setDiasUteis(compCal.dias_uteis || [1,2,3,4,5]);
         setHorasPorDia(compCal.horas_por_dia || 8);
       }
       const { data: cFData } = await supabase.from('company_calendar_holidays').select('*').eq('company_id', company.id);
       if (cFData) setFeriados(cFData);
    }
    setIsInheriting(true);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <section className="space-y-6 h-full p-4 overflow-y-auto pb-24">
      {isInheriting && (
        <Alert className="bg-blue-50 text-blue-900 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-semibold">Calendário Herdado</AlertTitle>
          <AlertDescription className="text-blue-700/90 text-sm">
            Esta obra está usando o calendário padrão da empresa. Qualquer alteração aqui criará um calendário customizado exclusivo para esta obra.
          </AlertDescription>
        </Alert>
      )}
      
      {!isInheriting && (
        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200 flex justify-between items-center">
          <div>
            <AlertTitle className="text-emerald-800 font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Calendário Customizado
            </AlertTitle>
            <AlertDescription className="text-emerald-700/90 text-sm">
              Esta obra possui seu próprio calendário de produção.
            </AlertDescription>
          </div>
          <Button variant="outline" size="sm" onClick={revertToCompany} className="bg-white hover:bg-emerald-100 text-emerald-700 border-emerald-200">
            Reverter para Padrão
          </Button>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="p-5 border border-border rounded-xl bg-card shadow-sm space-y-5">
             <h3 className="font-semibold text-sm border-b border-border pb-2">Jornada Semanal</h3>
             
             <div>
               <Label className="text-xs text-muted-foreground mb-3 block">Dias Úteis</Label>
               <div className="flex gap-2">
                 {DIAS_SEMANA.map(dia => {
                   const ativo = diasUteis.includes(dia.val);
                   return (
                     <button 
                       key={dia.val}
                       onClick={() => toggleDia(dia.val)}
                       className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${ativo ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'}`}
                     >
                       {dia.label}
                     </button>
                   );
                 })}
               </div>
             </div>

             <div>
               <Label className="text-xs text-muted-foreground mb-2 block">Horas Produtivas por Dia</Label>
               <Select value={horasPorDia.toString()} onValueChange={changeHoras}>
                 <SelectTrigger className="w-full text-sm">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="6">6 horas</SelectItem>
                   <SelectItem value="7">7 horas</SelectItem>
                   <SelectItem value="7.5">7 horas e 30 minutos</SelectItem>
                   <SelectItem value="8">8 horas</SelectItem>
                   <SelectItem value="9">9 horas</SelectItem>
                   <SelectItem value="10">10 horas</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             <div className="bg-primary/5 p-3 rounded-md border border-primary/20 text-center">
               <p className="text-xs text-primary font-medium">Jornada configurada: {diasUteis.length} dias × {horasPorDia}h = {diasUteis.length * horasPorDia}h / semana</p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-5 border border-border rounded-xl bg-card shadow-sm space-y-5">
            <h3 className="font-semibold text-sm border-b border-border pb-2">Dias Não Úteis (Feriados Locais)</h3>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Data</Label>
                <Input type="date" value={newFData} onChange={e => setNewFData(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex-[2] space-y-1">
                <Label className="text-[10px] text-muted-foreground">Descrição</Label>
                <Input value={newFDesc} onChange={e => setNewFDesc(e.target.value)} placeholder="Ex: Feriado Municipal" className="h-8 text-xs" />
              </div>
              <Button size="sm" onClick={() => addFeriado(newFData, newFDesc, false)} disabled={!newFData || !newFDesc} className="h-8 shadow-sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-sidebar pt-2">
              {feriados.map(f => (
                <div key={f.id} className="flex justify-between items-center bg-muted/30 border border-border p-2 rounded-md">
                   <div className="flex flex-col">
                     <span className="text-xs font-medium text-foreground">{format(parseISO(f.data), 'dd/MM/yyyy')}</span>
                     <span className="text-[10px] text-muted-foreground">{f.descricao} {f.recorrente && '(Recorrente)'}</span>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => removeFeriado(f.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive" disabled={isInheriting}>
                     <Trash2 className="w-3.5 h-3.5" />
                   </Button>
                </div>
              ))}
              {feriados.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum feriado configurado</p>}
            </div>

            <div className="bg-muted/30 p-3 rounded lg space-y-2 mt-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sugestões (Se não adicionados)</p>
              <div className="flex flex-wrap gap-1.5">
                {FERIADOS_NACIONAIS.map(fn => (
                  <button 
                    key={fn.dataStr}
                    onClick={() => addFeriado(fn.dataStr, fn.desc, true)}
                    className="px-2 py-1 bg-background border border-border rounded text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors hover:shadow-sm"
                  >
                    {fn.dataStr.split('-').reverse().join('/')}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
