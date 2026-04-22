import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Contrato, ContratoTipo, ModalidadeMedicao } from "@/types/contrato";

interface ContratoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: ContratoTipo;
  contrato?: Contrato | null;
  onSave: (data: Partial<Contrato>) => Promise<void>;
}

const MODALIDADES = [
  { value: "percentual", label: "Percentual por Etapa", desc: "% executado em cada etapa do orçamento." },
  { value: "quantidade", label: "Quantidade (Preço Unitário)", desc: "Itens medidos por unidade executada." },
  { value: "livre", label: "Livre", desc: "Itens e valores definidos livremente na medição." },
];

export default function ContratoDrawer({ open, onOpenChange, tipo, contrato, onSave }: ContratoDrawerProps) {
  const isEditing = !!contrato;

  const [numero, setNumero] = useState("");
  const [contratado, setContratado] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorInicial, setValorInicial] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [modalidade, setModalidade] = useState<ModalidadeMedicao>('percentual');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (contrato) {
        setNumero(contrato.numero || "");
        setContratado(contrato.contratado || "");
        setCnpj(contrato.cnpj || "");
        setDescricao(contrato.descricao || "");
        setValorInicial(contrato.valor_inicial?.toString() || "");
        setValorAtual(contrato.valor_atual?.toString() || "");
        setDataInicio(contrato.data_inicio || "");
        setDataFim(contrato.data_fim_prevista || "");
        setModalidade(contrato.modalidade_medicao || 'percentual');
      } else {
        setNumero("");
        setContratado("");
        setCnpj("");
        setDescricao("");
        setValorInicial("");
        setValorAtual("");
        setDataInicio("");
        setDataFim("");
        setModalidade('percentual');
      }
    }
  }, [open, contrato]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Partial<Contrato> = {
        tipo,
        numero,
        contratado,
        cnpj,
        descricao,
        data_inicio: dataInicio || undefined,
        data_fim_prevista: dataFim || undefined,
        modalidade_medicao: modalidade,
      };

      if (!isEditing) {
        payload.valor_inicial = Number(valorInicial) || 0;
        payload.valor_atual = payload.valor_inicial;
        payload.status = 'ativo';
        payload.moeda = 'BRL';
      }

      await onSave(payload);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-6 sm:max-w-[520px] overflow-y-auto w-full">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Contrato" : `Novo Contrato de ${tipo === 'cliente' ? 'Cliente' : 'Empreiteiro'}`}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? "Edite as informações básicas. Alterações de valor demandam aditivos formais." 
              : "Preencha os dados do novo instrumento contratual."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número / Código</Label>
              <Input 
                id="numero" 
                value={numero} 
                onChange={e => setNumero(e.target.value)} 
                required 
                placeholder="Ex: CT-24/001" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ / CPF</Label>
              <Input 
                id="cnpj" 
                value={cnpj} 
                onChange={e => setCnpj(e.target.value)} 
                placeholder="Opcional" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contratado">{tipo === 'cliente' ? 'Cliente Contratante' : 'Empreiteiro Contratado'}</Label>
            <Input 
              id="contratado" 
              value={contratado} 
              onChange={e => setContratado(e.target.value)} 
              required 
              placeholder="Razão Social ou Nome" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Objeto do Contrato</Label>
            <Textarea 
              id="descricao" 
              value={descricao} 
              onChange={e => setDescricao(e.target.value)} 
              required 
              placeholder="Descreva brevemente o escopo definido..." 
              className="resize-none h-20"
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4 bg-muted/20">
            <h4 className="font-medium text-sm">Financeiro</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorInicial">Valor Inicial (R$)</Label>
                <Input 
                  id="valorInicial" 
                  type="number" 
                  step="0.01" 
                  value={valorInicial} 
                  onChange={e => setValorInicial(e.target.value)} 
                  required={!isEditing} 
                  disabled={isEditing}
                  placeholder="0.00" 
                  className={isEditing ? "opacity-60 bg-muted cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2 relative group">
                <Label htmlFor="valorAtual">Valor Atual (R$)</Label>
                <Input 
                  id="valorAtual" 
                  value={isEditing ? valorAtual : valorInicial} 
                  readOnly
                  disabled
                  className="opacity-60 bg-muted cursor-not-allowed font-medium text-muted-foreground"
                />
                {isEditing && (
                  <p className="text-[10px] text-muted-foreground absolute -bottom-5 left-0">Travado. Use Aditivos.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modalidade de Medição</Label>
            <Select value={modalidade} onValueChange={(v) => setModalidade(v as ModalidadeMedicao)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                {MODALIDADES.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span>{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input 
                id="dataInicio" 
                type="date"
                value={dataInicio} 
                onChange={e => setDataInicio(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Término Previsto</Label>
              <Input 
                id="dataFim" 
                type="date"
                value={dataFim} 
                onChange={e => setDataFim(e.target.value)} 
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 pb-8">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Contrato"}
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
