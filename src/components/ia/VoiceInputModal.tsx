import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Mic, Square, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Chamado com o Blob de áudio quando o usuário confirmar */
  onReady: (audioBlob: Blob) => void;
}

type RecState = 'idle' | 'recording' | 'stopped' | 'processing';

export default function VoiceInputModal({ open, onClose, onReady }: Props) {
  const [recState, setRecState] = useState<RecState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopRecording();
      setRecState('idle');
      setElapsed(0);
      setAudioBlob(null);
      setAudioUrl(null);
    }
  }, [open]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecState('stopped');
      };

      mr.start(100);
      setRecState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      alert('Permissão de microfone negada. Verifique as configurações do browser.');
    }
  };

  const handleStop = () => { stopRecording(); };

  const handleReset = () => {
    setRecState('idle');
    setElapsed(0);
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleConfirm = () => {
    if (!audioBlob) return;
    onReady(audioBlob);
    onClose();
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Comando de Voz</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Visualizador */}
          <div className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300',
            recState === 'recording'
              ? 'bg-red-500/15 border-2 border-red-500/40 animate-pulse'
              : 'bg-muted/30 border-2 border-border'
          )}>
            <Mic className={cn('h-10 w-10', recState === 'recording' ? 'text-red-400' : 'text-muted-foreground')} />
          </div>

          {/* Timer */}
          {recState === 'recording' && (
            <p className="text-2xl font-mono text-foreground">{fmt(elapsed)}</p>
          )}

          {/* Hints */}
          {recState === 'idle' && (
            <div className="text-center space-y-1.5">
              <p className="text-sm text-foreground font-medium">Exemplos de comandos:</p>
              <p className="text-xs text-muted-foreground">"Recebi 50 sacos de cimento Portland hoje"</p>
              <p className="text-xs text-muted-foreground">"25 metros de tubo PVC 100mm"</p>
              <p className="text-xs text-muted-foreground">"Hoje choveu, paramos às 14h30"</p>
            </div>
          )}

          {recState === 'recording' && (
            <p className="text-xs text-muted-foreground animate-pulse">Gravando... Fale normalmente</p>
          )}

          {/* Preview áudio */}
          {recState === 'stopped' && audioUrl && (
            <div className="w-full space-y-3">
              <audio src={audioUrl} controls className="w-full h-10 accent-primary" />
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg p-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary/80 shrink-0" />
                <p className="text-xs text-primary/60">Gravação pronta. Confirme para processar com IA.</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 w-full">
            {recState === 'idle' && (
              <Button onClick={startRecording} className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white">
                <Mic className="h-4 w-4 mr-2" /> Iniciar Gravação
              </Button>
            )}
            {recState === 'recording' && (
              <Button onClick={handleStop} variant="outline" className="flex-1 h-11 border-red-500/30 text-red-400">
                <Square className="h-4 w-4 mr-2" /> Parar
              </Button>
            )}
            {recState === 'stopped' && (
              <>
                <Button onClick={handleReset} variant="outline" className="h-11 px-4">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button onClick={handleConfirm} className="flex-1 h-11">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Processar com IA
                </Button>
              </>
            )}
            {recState === 'processing' && (
              <Button disabled className="flex-1 h-11">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...
              </Button>
            )}
          </div>

          <Button variant="ghost" className="w-full h-9 text-muted-foreground" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
