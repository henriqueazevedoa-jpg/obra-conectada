import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import UpsellModal from './UpsellModal';
import VoiceInputModal from './VoiceInputModal';
import type { DocTipo } from '@/hooks/useIADocumentos';
import { Sparkles, Camera, FileText, Mic, Upload, ChevronDown, Lock } from 'lucide-react';

interface Props {
  /** Chamado quando o usuário selecionou um arquivo (foto, PDF, XML) */
  onFileSelected: (file: File, tipo: DocTipo) => void;
  /** Chamado quando a gravação de voz estiver pronta */
  onVoiceReady: (audioBlob: Blob) => void;
  /** Variante visual */
  size?: 'sm' | 'default';
  className?: string;
  disabled?: boolean;
}

export default function IAInputButton({
  onFileSelected, onVoiceReady, size = 'default', className, disabled,
}: Props) {
  const hasDocAddon  = useFeatureFlag('ia_documentos');
  const hasVoiceAddon = useFeatureFlag('voice_ai');
  const hasAnyAddon  = hasDocAddon || hasVoiceAddon;

  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellType, setUpsellType] = useState<'ia_documentos' | 'voice_ai'>('ia_documentos');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTipo, setPendingTipo] = useState<DocTipo>('foto_nf');

  const handleFileClick = (tipo: DocTipo) => {
    if (!hasDocAddon) { setUpsellType('ia_documentos'); setUpsellOpen(true); return; }
    setPendingTipo(tipo);
    const acceptMap: Record<DocTipo, string> = {
      foto_nf: 'image/*',
      pdf_nf: 'application/pdf',
      xml_nfe: '.xml,text/xml,application/xml',
      romaneio: 'image/*,application/pdf',
      boleto: 'image/*,application/pdf',
      audio: 'audio/*',
    };
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptMap[tipo];
      if (tipo === 'foto_nf' || tipo === 'romaneio' || tipo === 'boleto') {
        fileInputRef.current.setAttribute('capture', 'environment');
      } else {
        fileInputRef.current.removeAttribute('capture');
      }
      fileInputRef.current.click();
    }
  };

  const handleVoiceClick = () => {
    if (!hasVoiceAddon) { setUpsellType('voice_ai'); setUpsellOpen(true); return; }
    setVoiceOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileSelected(file, pendingTipo);
    e.target.value = '';
  };

  const buttonLabel = size === 'sm' ? null : 'Leitura IA';

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant="outline"
            disabled={disabled}
            className={cn(
              'gap-1.5 border-primary/30 text-primary/80 hover:bg-primary/10 hover:text-primary/60',
              !hasAnyAddon && 'opacity-80',
              className
            )}
          >
            <Sparkles className="h-4 w-4" />
            {buttonLabel && <span>{buttonLabel}</span>}
            {!hasAnyAddon && <span className="text-[10px] ml-0.5 bg-primary/20 rounded px-1 py-0.5">Pro</span>}
            <ChevronDown className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* ── Leitura de Documentos ── */}
          <div className="px-2 py-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Leitura de Documentos
              {!hasDocAddon && <Lock className="inline h-3 w-3 ml-1 opacity-60" />}
            </p>
          </div>
          <DropdownMenuItem onClick={() => handleFileClick('foto_nf')} className="gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm">Foto da NF</p>
              <p className="text-[11px] text-muted-foreground">Abre câmera do celular</p>
            </div>
            {!hasDocAddon && <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFileClick('xml_nfe')} className="gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm">XML NF-e</p>
              <p className="text-[11px] text-muted-foreground">100% preciso, sem IA</p>
            </div>
            {!hasDocAddon && <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFileClick('pdf_nf')} className="gap-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm">PDF / Romaneio</p>
              <p className="text-[11px] text-muted-foreground">Upload de arquivo</p>
            </div>
            {!hasDocAddon && <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* ── Voz ── */}
          <div className="px-2 py-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Assistente de Voz
              {!hasVoiceAddon && <Lock className="inline h-3 w-3 ml-1 opacity-60" />}
            </p>
          </div>
          <DropdownMenuItem onClick={handleVoiceClick} className="gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm">Comando de Voz</p>
              <p className="text-[11px] text-muted-foreground">"Recebi 50 sacos de cimento"</p>
            </div>
            {!hasVoiceAddon && <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UpsellModal
        open={upsellOpen}
        addonType={upsellType}
        onClose={() => setUpsellOpen(false)}
      />
      <VoiceInputModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onReady={onVoiceReady}
      />
    </>
  );
}
