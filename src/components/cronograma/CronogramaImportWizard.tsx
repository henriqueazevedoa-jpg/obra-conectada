import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Calculator, CalendarDays } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrcamentoEtapaImport, useCronogramaImport } from '@/hooks/useCronogramaImport';
import BaselineConfirmModal from './BaselineConfirmModal';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CronogramaImportWizardProps {
  obraId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EtapaState {
  selecionada: boolean;
  etapa: OrcamentoEtapaImport;
  produtividade: number;
  duracaoCalculada: number;
}

export default function CronogramaImportWizard({ obraId, open, onOpenChange }: CronogramaImportWizardProps) {
  const { fetchEtapas, importarEtapas, loading: importLoading } = useCronogramaImport(obraId);
  
  const [step, setStep] = useState(1);
  const [etapas, setEtapas] = useState<EtapaState[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  
  // Passo 3 states
  const [dataInicioProj, setDataInicioProj] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load etapas ao abrir
  useEffect(() => {
    if (open && step === 1) {
      setLoadingFetch(true);
      fetchEtapas().then(data => {
        setEtapas(data.map(e => ({
          selecionada: true,
          etapa: e,
          produtividade: 100, // Produtividade mock inicial ou buscar de histórico se houver
          duracaoCalculada: 7, // Duração padrão se não for possível calcular por qtd/produtividade
        })));
        setLoadingFetch(false);
      });
    } else if (!open) {
      setStep(1);
      setShowConfirmModal(false);
    }
  }, [open, fetchEtapas, step]);

  const selecionadas = etapas.filter(e => e.selecionada);
  const todasSelecionadas = selecionadas.length === etapas.length && etapas.length > 0;

  const toggleAll = () => {
    setEtapas(etapas.map(e => ({ ...e, selecionada: !todasSelecionadas })));
  };

  const toggleOne = (id: string) => {
    setEtapas(etapas.map(e => e.etapa.id === id ? { ...e, selecionada: !e.selecionada } : e));
  };

  const updateProdutividade = (id: string, prod: number) => {
    // Exemplo de cálculo: se tivéssemos quantidade, seria qtd / prod.
    // Como na categoria só temos preco_total (não temos qtd da categoria),
    // o usuário preenche a duração diretamente ou podemos simular um cálculo.
    // O prompt diz: "Duração calculada como quantidade / produtividade"
    // Porém na etapa (categoria) não há "quantidade_total".
    // Vamos permitir editar a duração sugerida diretamente.
    setEtapas(etapas.map(e => e.etapa.id === id ? { ...e, duracaoCalculada: prod } : e));
  };

  const handleImport = async () => {
    let dataAtual = parseISO(dataInicioProj);
    
    const payload = selecionadas.map(e => {
      const start = format(dataAtual, 'yyyy-MM-dd');
      const dur = e.duracaoCalculada;
      const end = format(addDays(dataAtual, dur - 1), 'yyyy-MM-dd');
      
      // Cascata simples (FS) inicial
      dataAtual = addDays(dataAtual, dur);
      
      return {
        etapa: e.etapa,
        duracaoSugerida: dur,
        dataInicio: start,
        dataFim: end
      };
    });

    const sucesso = await importarEtapas(payload);
    if (sucesso) {
      setShowConfirmModal(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open && !showConfirmModal} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Assistente de Importação
            </DialogTitle>
            <DialogDescription>
              {step === 1 && "Selecione as etapas do orçamento que deseja incluir no cronograma."}
              {step === 2 && "Estime a duração de cada etapa (produtividade diária)."}
              {step === 3 && "Defina a data de início e confirme o baseline."}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Header */}
          <div className="flex items-center gap-2 mb-6 mt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                  step === s ? "bg-primary text-white" : step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <div className={cn("h-1 flex-1 rounded-full", step >= s ? "bg-primary/30" : "bg-muted")} />
              </div>
            ))}
          </div>

          {/* Passo 1: Seleção */}
          {step === 1 && (
            <div className="space-y-4">
              {loadingFetch ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : etapas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma etapa encontrada no orçamento ativo.
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border-b border-border">
                    <Checkbox checked={todasSelecionadas} onCheckedChange={toggleAll} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etapa do Orçamento</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {etapas.map(e => (
                      <div key={e.etapa.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30">
                        <Checkbox checked={e.selecionada} onCheckedChange={() => toggleOne(e.etapa.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{e.etapa.nome}</p>
                          {e.etapa.codigo && <p className="text-xs text-muted-foreground">{e.etapa.codigo}</p>}
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          R$ {e.etapa.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Passo 2: Duração */}
          {step === 2 && (
            <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-sidebar pr-2">
              <div className="grid grid-cols-[1fr_120px] gap-4 mb-2 px-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Etapa Selecionada</span>
                <span className="text-xs font-semibold text-muted-foreground uppercase text-right">Duração (dias)</span>
              </div>
              {selecionadas.map(e => (
                <div key={e.etapa.id} className="grid grid-cols-[1fr_120px] gap-4 items-center bg-muted/20 p-3 rounded-lg border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={e.etapa.nome}>{e.etapa.nome}</p>
                    <p className="text-[10px] text-muted-foreground">R$ {e.etapa.valor_total.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <Input 
                      type="number" min={1} 
                      value={e.duracaoCalculada} 
                      onChange={(ev) => updateProdutividade(e.etapa.id, Number(ev.target.value))}
                      className="h-8 text-right font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Passo 3: Baseline */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <label className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Data de Início do Projeto
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-[240px] justify-start text-left font-normal bg-card')}>
                      {dataInicioProj ? format(parseISO(dataInicioProj), 'dd de MMMM de yyyy', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseISO(dataInicioProj)}
                      onSelect={(d) => d && setDataInicioProj(format(d, 'yyyy-MM-dd'))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="border border-border rounded-lg p-4 bg-muted/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Resumo da Importação</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tarefas a criar:</span>
                    <span className="font-semibold">{selecionadas.length} etapas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duração total estimada:</span>
                    <span className="font-semibold">{selecionadas.reduce((s, e) => s + e.duracaoCalculada, 0)} dias (sequencial)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orçamento vinculado:</span>
                    <span className="font-semibold text-emerald-600">
                      R$ {selecionadas.reduce((s, e) => s + e.etapa.valor_total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex justify-between w-full">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            ) : <div />}
            
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={selecionadas.length === 0}>
                Avançar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => setShowConfirmModal(true)} disabled={selecionadas.length === 0}>
                Salvar e Definir Baseline
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Final */}
      <BaselineConfirmModal 
        open={showConfirmModal}
        onOpenChange={(v) => {
          if (!v) setShowConfirmModal(false);
        }}
        onConfirm={handleImport}
        loading={importLoading}
      />
    </>
  );
}
