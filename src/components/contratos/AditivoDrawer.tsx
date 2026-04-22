import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContratoComMetricas, ContratoAditivo, AditivoTipo } from "@/types/contrato";
import { format, addDays, parseISO, isValid } from "date-fns";
import { ArrowRight, AlertTriangle, FileText } from "lucide-react";

interface AditivoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: ContratoComMetricas | null;
  onSave: (payload: Partial<ContratoAditivo>) => Promise<void>;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function AditivoDrawer({ open, onOpenChange, contrato, onSave }: AditivoDrawerProps) {
  const [tipo, setTipo] = useState<AditivoTipo>("valor");
  const [deltaValor, setDeltaValor] = useState<string>("");
  const [deltaPrazo, setDeltaPrazo] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");
  const [dataAssinatura, setDataAssinatura] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo("valor");
      setDeltaValor("");
      setDeltaPrazo("");
      setJustificativa("");
      setDataAssinatura("");
    }
  }, [open]);

  if (!contrato) return null;

  const currentValor = Number(contrato.valor_atual) || 0;
  const numDeltaValor = Number(deltaValor) || 0;
  const nextValor = currentValor + numDeltaValor;
  
  const currentFimDate = contrato.data_fim_prevista ? parseISO(contrato.data_fim_prevista) : null;
  const numDeltaPrazo = Number(deltaPrazo) || 0;
  const nextFimDate = currentFimDate && isValid(currentFimDate) ? addDays(currentFimDate, numDeltaPrazo) : null;

  const isInvalidValor = tipo === "valor" && nextValor < 0;
  const isInvalidPrazo = tipo === "prazo" && !currentFimDate;
  
  const blockSave = isInvalidValor || isInvalidPrazo || !justificativa.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockSave) return;
    
    setLoading(true);
    try {
      const payload: Partial<ContratoAditivo> = {
        contrato_id: contrato.id,
        tipo,
        justificativa: justificativa.trim(),
        data_assinatura: dataAssinatura || undefined,
        status: dataAssinatura ? 'assinado' : 'pendente',
      };

      if (tipo === "valor") {
        payload.delta_valor = numDeltaValor;
      } else if (tipo === "prazo") {
        payload.delta_prazo_dias = numDeltaPrazo;
      }

      await onSave(payload);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6 sm:max-w-[480px] overflow-y-auto w-full border-l border-border/60">
        <SheetHeader>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">{contrato.numero}</span>
          </div>
          <SheetTitle>Novo Aditivo Contratual</SheetTitle>
          <SheetDescription>
            Defina o tipo e detalhe as alterações. Os montantes originais deste contrato serão atualizados após a assinatura.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
          <Tabs value={tipo} onValueChange={(v) => { setTipo(v as AditivoTipo); setDeltaValor(""); setDeltaPrazo(""); }} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="valor">R$ Valor</TabsTrigger>
              <TabsTrigger value="prazo">Prazo (Dias)</TabsTrigger>
              <TabsTrigger value="escopo">Escopo</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="py-2">
            {tipo === "valor" && (
              <div className="space-y-3">
                <Label htmlFor="deltaValor">Acréscimo ou Supressão em R$ (use - para subtrair)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                  <Input 
                    id="deltaValor" 
                    type="number" 
                    step="0.01" 
                    value={deltaValor} 
                    onChange={e => setDeltaValor(e.target.value)} 
                    placeholder="0.00" 
                    className="pl-9 font-medium"
                  />
                </div>
              </div>
            )}
            
            {tipo === "prazo" && (
              <div className="space-y-3">
                <Label htmlFor="deltaPrazo">Prorrogação ou Antecipação de Prazo (use - para dias)</Label>
                <div className="relative">
                  <Input 
                    id="deltaPrazo" 
                    type="number" 
                    step="1" 
                    value={deltaPrazo} 
                    onChange={e => setDeltaPrazo(e.target.value)} 
                    placeholder="0" 
                    className="pr-12 font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">dias</span>
                </div>
              </div>
            )}

             {tipo === "escopo" && (
              <div className="space-y-3">
                <Label className="text-muted-foreground italic text-xs">
                  Aditivo puramente textual/documental. Nenhuma variável financeira ou de prazo será recalculada no contrato raiz.
                </Label>
              </div>
             )}
          </div>

          <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Preview da Modificação</p>
            {tipo === "valor" && (
              <>
                <div className="flex items-center gap-3 font-medium">
                  <span className="line-through opacity-70">{formatCurrency(currentValor)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className={nextValor < currentValor ? "text-amber-600" : nextValor > currentValor ? "text-emerald-600" : "text-foreground"}>
                    {formatCurrency(nextValor)}
                  </span>
                </div>
                {isInvalidValor && (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Redução maior que o valor atual do contrato.
                  </p>
                )}
              </>
            )}
            
            {tipo === "prazo" && (
              <>
                {!currentFimDate ? (
                  <p className="text-xs text-amber-600 font-medium bg-amber-500/10 p-2 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> Contrato sem data de término — defina uma data no contrato antes de adicionar aditivo de prazo.
                  </p>
                ) : (
                  <div className="flex items-center gap-3 font-medium">
                    <span className="line-through opacity-70">{format(currentFimDate, "dd/MM/yyyy")}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className={numDeltaPrazo < 0 ? "text-amber-600" : numDeltaPrazo > 0 ? "text-blue-600" : "text-foreground"}>
                      {nextFimDate ? format(nextFimDate, "dd/MM/yyyy") : "—"}
                    </span>
                  </div>
                )}
              </>
            )}

            {tipo === "escopo" && (
              <p className="text-sm font-medium text-muted-foreground">
                Alteração qualitativa (Sem impacto na fórmula).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa Legal / Escopo do Aditivo *</Label>
            <Textarea 
              id="justificativa" 
              value={justificativa} 
              onChange={e => setJustificativa(e.target.value)} 
              placeholder="Descreva o motivo que balizou esta assinatura (obrigatório)" 
              className="resize-none h-24"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataAssinatura">Data de Assinatura (opcional)</Label>
            <Input 
              id="dataAssinatura" 
              type="date"
              value={dataAssinatura} 
              onChange={e => setDataAssinatura(e.target.value)} 
            />
            <p className="text-[10px] text-muted-foreground">
              Deixando em branco, constará como <strong className="font-semibold text-amber-600">Pendente</strong>.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 pb-8">
            <Button type="submit" className="w-full" disabled={loading || blockSave}>
              {loading ? "Processando..." : "Gerar Aditivo"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
