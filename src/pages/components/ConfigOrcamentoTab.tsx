import { useState, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Opções de critério histórico ──────────────────────────────────────────────
const CRITERIOS = [
  {
    value: 'ultimo',
    label: 'Último preço usado',
    desc: 'Preenche com o preço mais recente registrado para a composição',
  },
  {
    value: 'menor',
    label: 'Menor preço registrado',
    desc: 'Preenche com o menor valor histórico — conservador em relação ao orçamento',
  },
  {
    value: 'media_simples',
    label: 'Média simples',
    desc: 'Média aritmética de todos os preços históricos',
  },
  {
    value: 'media_ponderada',
    label: 'Média ponderada por uso',
    desc: 'Composições mais usadas têm maior peso na média',
  },
];

export default function ConfigOrcamentoTab() {
  const { company } = useCompany();
  const [criterio, setCriterio] = useState<string>('ultimo');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ((company as any)?.preco_criterio) {
      setCriterio((company as any).preco_criterio);
    }
  }, [company]);

  const handleSaveCriterio = async (valor: string) => {
    if (!company?.id) return;
    setCriterio(valor);
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('companies')
        .update({ preco_criterio: valor })
        .eq('id', company.id);
      if (error) throw error;
      toast({ 
        title: '✅ Critério salvo', 
        description: `Preço histórico agora usa: ${CRITERIOS.find(c => c.value === valor)?.label}` 
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Módulo de Orçamento
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as preferências globais para a composição do Banco de Preços e métricas do Orçamento.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl border border-border bg-card">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">Critério de Preço Histórico</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Define qual valor será sugerido quando a ferramenta "Auto Preencher" encontrar o insumo/composição no histórico da sua empresa.
          </p>

          <RadioGroup
            value={criterio}
            onValueChange={handleSaveCriterio}
            disabled={saving}
            className="space-y-3"
          >
            {CRITERIOS.map(opt => (
              <div
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  criterio === opt.value
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                )}
                onClick={() => handleSaveCriterio(opt.value)}
              >
                <RadioGroupItem value={opt.value} id={`criterio-${opt.value}`} className="mt-0.5 accent-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`criterio-${opt.value}`} className="text-sm font-medium cursor-pointer">
                      {opt.label}
                    </Label>
                    {criterio === opt.value && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>
    </section>
  );
}
