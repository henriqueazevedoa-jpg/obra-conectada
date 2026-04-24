import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { supabase } from '@/integrations/supabase/untyped';
import type { SinapiConfig } from '@/contexts/OrcamentoContext';
import { formatCompetencia } from '@/utils/sinapiFormatters';

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

interface SinapiReferencia {
  id: string;
  competencia: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SinapiConfigModal({ open, onOpenChange }: Props) {
  const { sinapiConfig, updateSinapiConfig } = useOrcamento();
  const [referencias, setReferencias] = useState<SinapiReferencia[]>([]);
  const [loading, setLoading] = useState(false);

  // Local state to hold changes before saving
  const [localConfig, setLocalConfig] = useState<SinapiConfig>({
    referencia_id: null,
    uf: 'SP',
    regime: 'SEM_DESONERACAO',
    competencia: '',
    isSinapiSearchEnabled: true,
  });

  useEffect(() => {
    if (open) {
      setLocalConfig({ ...sinapiConfig });
      fetchReferencias();
    }
  }, [open, sinapiConfig]);

  async function fetchReferencias() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sinapi_referencias')
        .select('id, competencia')
        .order('competencia', { ascending: false });

      if (!error && data) {
        setReferencias(data);
        
        // Se a config atual não tem referencia_id mas tem competencia (legado),
        // ou se não tem nada configurado, seleciona a mais recente.
        if (!sinapiConfig.referencia_id && data.length > 0) {
          const matchByCompetencia = data.find(r => r.competencia === sinapiConfig.competencia);
          if (matchByCompetencia) {
            setLocalConfig(prev => ({ ...prev, referencia_id: matchByCompetencia.id, competencia: matchByCompetencia.competencia }));
          } else {
            setLocalConfig(prev => ({ ...prev, referencia_id: data[0].id, competencia: data[0].competencia }));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleConfirm = () => {
    updateSinapiConfig(localConfig);
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared: SinapiConfig = {
      referencia_id: null,
      competencia: '',
      uf: 'SP',
      regime: 'SEM_DESONERACAO',
      isSinapiSearchEnabled: true,
    };
    updateSinapiConfig(cleared);
    onOpenChange(false);
  };

  const handleRefChange = (val: string) => {
    const ref = referencias.find(r => r.id === val);
    if (ref) {
      setLocalConfig(prev => ({ ...prev, referencia_id: ref.id, competencia: ref.competencia }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuração do Banco SINAPI</DialogTitle>
          <DialogDescription>
            Configure a base de preços que será utilizada para importar composições e insumos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Versão / Competência</Label>
            <Select 
              value={localConfig.referencia_id || undefined} 
              onValueChange={handleRefChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a versão" />
              </SelectTrigger>
              <SelectContent>
                {referencias.map(ref => (
                  <SelectItem key={ref.id} value={ref.id}>
                    {formatCompetencia(ref.competencia)}
                  </SelectItem>
                ))}
                {referencias.length === 0 && !loading && (
                  <SelectItem value="empty" disabled>Nenhuma versão encontrada</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>UF</Label>
              <Select 
                value={localConfig.uf} 
                onValueChange={(val) => setLocalConfig(prev => ({ ...prev, uf: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Regime</Label>
              <Select 
                value={localConfig.regime} 
                onValueChange={(val: any) => setLocalConfig(prev => ({ ...prev, regime: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEM_DESONERACAO">Sem Desoneração</SelectItem>
                  <SelectItem value="COM_DESONERACAO">Com Desoneração</SelectItem>
                  <SelectItem value="SEM_ENCARGOS">Sem Encargos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t mt-2">
            <Switch 
              id="sinapi-search" 
              checked={localConfig.isSinapiSearchEnabled !== false}
              onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, isSinapiSearchEnabled: checked }))}
            />
            <Label htmlFor="sinapi-search" className="text-sm font-normal">
              Ativar busca automática no SINAPI (Planilha)
            </Label>
          </div>
        </div>

        <DialogFooter className="flex items-center sm:justify-between">
          <Button variant="ghost" onClick={handleClear} className="text-muted-foreground">
            Limpar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!localConfig.referencia_id}>
              Confirmar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
