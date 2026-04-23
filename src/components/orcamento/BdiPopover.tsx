import { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Calculator, Save, Loader2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface BdiComponentes {
  adm_central: number;
  seguros: number;
  riscos: number;
  garantia: number;
  despesas_financeiras: number;
  lucro: number;
}

export interface BdiConfig {
  enabled: boolean;
  componentes: BdiComponentes;
  rate: number;
  contingencia: number;
}

interface Props {
  obraId: string;
  initialConfig?: BdiConfig | null;
  onConfigChange: (config: BdiConfig) => void;
  children?: React.ReactNode;
}

export const DEFAULT_COMPONENTES: BdiComponentes = {
  adm_central: 5.0,
  seguros: 0.8,
  riscos: 2.0,
  garantia: 0.5,
  despesas_financeiras: 1.3,
  lucro: 8.0,
};

export const DEFAULT_BDI: BdiConfig = { 
  enabled: false, 
  componentes: DEFAULT_COMPONENTES,
  rate: 20.35, // will be recalculated, roughly 20.35
  contingencia: 5.0
};

export default function BdiPopover({ obraId, initialConfig, onConfigChange, children }: Props) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<BdiConfig>(initialConfig || DEFAULT_BDI);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig({
        ...DEFAULT_BDI,
        ...initialConfig,
        componentes: {
          ...DEFAULT_COMPONENTES,
          ...initialConfig.componentes
        }
      });
    }
  }, [initialConfig]);

  // Recalcular rate sempre que os componentes mudam
  useEffect(() => {
    const { adm_central, seguros, riscos, garantia, despesas_financeiras, lucro } = config.componentes;
    
    // BDI = ((1 + (adm_central + seguros + riscos + garantia) / 100) / (1 - (despesas_financeiras + lucro) / 100)) - 1
    const numerador = 1 + (adm_central + seguros + riscos + garantia) / 100;
    const denominador = 1 - (despesas_financeiras + lucro) / 100;
    
    let rate = 0;
    if (denominador > 0) {
      rate = (numerador / denominador - 1) * 100;
    }

    // Only update rate if it has actually changed to avoid infinite loops
    if (Math.abs(config.rate - rate) > 0.01) {
      setConfig(prev => ({ ...prev, rate }));
    }
  }, [config.componentes, config.rate]);

  const handleSave = async () => {
    if (!obraId) return;
    setSaving(true);
    try {
      await supabase
        .from('obras')
        .update({ orcamento_bdi_config: config })
        .eq('id', obraId);
      
      onConfigChange(config);
      toast({ title: 'Configurações de BDI atualizadas' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar BDI', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setConfig(prev => ({ ...prev, enabled: checked }));
  };

  const handleComponentChange = (key: keyof BdiComponentes, value: string) => {
    const num = parseFloat(value) || 0;
    setConfig(prev => ({
      ...prev,
      componentes: {
        ...prev.componentes,
        [key]: num
      }
    }));
  };

  const handleReset = () => {
    setConfig(prev => ({
      ...prev,
      componentes: DEFAULT_COMPONENTES,
      contingencia: 5.0
    }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2" title="Configurar BDI">
            <Calculator className="h-3.5 w-3.5" />
            BDI {config.enabled ? `(${config.rate.toFixed(2)}%)` : 'Desativado'}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4 shadow-xl" align="end">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold leading-none">BDI do Orçamento</h4>
            <p className="text-xs text-muted-foreground">Benefícios e Despesas Indiretas</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={handleToggle} />
        </div>

        <div className="space-y-4">
          <div className="border-t border-border/50 pt-3 space-y-2">
            {[
              { label: 'Adm. Central', key: 'adm_central' as keyof BdiComponentes },
              { label: 'Seguros', key: 'seguros' as keyof BdiComponentes },
              { label: 'Riscos', key: 'riscos' as keyof BdiComponentes },
              { label: 'Garantia', key: 'garantia' as keyof BdiComponentes },
              { label: 'Desp. Financeiras', key: 'despesas_financeiras' as keyof BdiComponentes },
              { label: 'Lucro', key: 'lucro' as keyof BdiComponentes },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="h-7 w-20 text-xs text-right"
                    value={config.componentes[item.key]}
                    onChange={(e) => handleComponentChange(item.key, e.target.value)}
                    disabled={!config.enabled}
                    step="0.1"
                  />
                  <span className="text-xs text-muted-foreground w-3">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">BDI calculado:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">
                      BDI = ((1 + AC + S + R + G) / (1 - DF - L)) - 1<br/>
                      Fórmula conforme SINAPI/TCU
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-bold text-primary">{config.rate.toFixed(2)}%</span>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-muted-foreground">Contingência:</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  className="h-7 w-20 text-xs text-right"
                  value={config.contingencia}
                  onChange={(e) => setConfig(prev => ({ ...prev, contingencia: parseFloat(e.target.value) || 0 }))}
                  disabled={!config.enabled}
                  step="0.1"
                />
                <span className="text-xs text-muted-foreground w-3">%</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-3 flex gap-2">
            <Button 
              variant="outline"
              className="flex-1 h-8 text-xs" 
              onClick={handleReset} 
              disabled={!config.enabled || saving}
            >
              Resetar padrões
            </Button>
            <Button 
              className="flex-1 h-8 text-xs" 
              onClick={handleSave} 
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
