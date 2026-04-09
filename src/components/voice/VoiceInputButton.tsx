import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Loader2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { useVoiceInput, VoiceStatus } from '@/hooks/useVoiceInput';
import { useAddonAccess } from '@/hooks/useAddonAccess';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  module: string;
  obraId?: string;
  onResult: (parsed: Record<string, any>, transcription: string) => void;
}

const statusMessages: Record<VoiceStatus, string> = {
  idle: 'Clique para gravar',
  recording: 'Gravando... Clique para parar',
  uploading: 'Enviando áudio...',
  processing: 'Processando com IA...',
  done: 'Pronto! Revise os dados abaixo.',
  error: 'Ocorreu um erro.',
};

export default function VoiceInputButton({ module, obraId, onResult }: VoiceInputButtonProps) {
  const { allowed, status: addonStatus } = useAddonAccess('voice_ai');
  const { status, result, error, startRecording, stopRecording, reset } = useVoiceInput(module, obraId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    if (!allowed) {
      setDialogOpen(true);
      return;
    }
    setDialogOpen(true);
  };

  const handleRecord = async () => {
    if (status === 'recording') {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleApply = () => {
    if (result) {
      onResult(result.parsed, result.transcription);
      setDialogOpen(false);
      reset();
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    reset();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-9"
        onClick={handleClick}
        title="Entrada por voz (IA)"
      >
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Voz IA</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Assistente por Voz IA
            </DialogTitle>
          </DialogHeader>

          {!allowed ? (
            <div className="text-center py-6 space-y-3">
              <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Este recurso faz parte do <strong>Assistente por Voz IA</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                {addonStatus === 'expired'
                  ? 'Seu período de teste expirou. Entre em contato para ativar.'
                  : 'Entre em contato com o administrador para ativar este add-on.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status indicator */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{statusMessages[status]}</p>
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>

              {/* Record button */}
              {(status === 'idle' || status === 'recording' || status === 'error') && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRecord}
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center transition-all',
                      status === 'recording'
                        ? 'bg-destructive text-destructive-foreground animate-pulse'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    {status === 'recording' ? (
                      <Square className="h-8 w-8" />
                    ) : (
                      <Mic className="h-8 w-8" />
                    )}
                  </button>
                </div>
              )}

              {/* Processing indicator */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}

              {/* Result preview */}
              {status === 'done' && result && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Transcrição</span>
                    {result.confidence < 0.7 && (
                      <Badge variant="secondary" className="text-[10px] bg-warning/10 text-warning">
                        <AlertTriangle className="h-3 w-3 mr-0.5" /> Baixa confiança
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs bg-muted p-3 rounded-lg">{result.transcription}</p>

                  <div>
                    <span className="text-sm font-medium">Dados extraídos</span>
                    <div className="bg-muted p-3 rounded-lg mt-1 text-xs space-y-1">
                      {Object.entries(result.parsed).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleApply} className="flex-1">Aplicar dados</Button>
                    <Button variant="outline" onClick={() => reset()}>Regravar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
