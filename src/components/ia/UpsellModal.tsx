import { Sparkles, CheckCircle2, Mic, Camera, FileText, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  addonType?: 'ia_documentos' | 'voice_ai';
}

const CONTENT = {
  ia_documentos: {
    icon: FileText,
    title: 'IA Leitura de Documentos',
    description: 'Fotografe notas fiscais, envie XMLs NF-e ou PDFs — o sistema identifica os materiais e lança automaticamente no estoque.',
    features: [
      { icon: FileText, label: 'XML NF-e', desc: '100% preciso, sem processamento de IA' },
      { icon: Camera, label: 'Foto de NF / Romaneio', desc: 'Câmera do celular no canteiro' },
      { icon: Sparkles, label: 'Match automático', desc: 'Associa itens da NF aos materiais cadastrados' },
    ],
  },
  voice_ai: {
    icon: Mic,
    title: 'Assistente de Voz IA',
    description: 'Fale um comando e o sistema interpreta e lança automaticamente — sem digitar nada no canteiro.',
    features: [
      { icon: Mic, label: 'Estoque por voz', desc: '"Recebi 50 sacos de cimento Portland"' },
      { icon: Volume2, label: 'Diário por voz', desc: '"Hoje choveu, paramos às 14h30"' },
      { icon: Sparkles, label: 'Interpretação contextual', desc: 'Detecta materiais, quantidades e unidades automaticamente' },
    ],
  },
};

export default function UpsellModal({ open, onClose, addonType = 'ia_documentos' }: Props) {
  const content = CONTENT[addonType];
  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary/80" />
            </div>
            <DialogTitle className="text-lg">{content.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {content.description}
          </p>

          <div className="space-y-2.5">
            {content.features.map(({ icon: FIcon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl p-3">
                <CheckCircle2 className="h-4 w-4 text-primary/80 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 space-y-2">
            <Button
              className="w-full h-11 bg-primary hover:bg-primary"
              onClick={() => {
                onClose();
                window.open(
                  `mailto:comercial@obraconectada.com.br?subject=Interesse Add-on: ${content.title}`,
                  '_blank'
                );
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Contratar Add-on
            </Button>
            <Button variant="ghost" className="w-full h-9 text-muted-foreground" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
