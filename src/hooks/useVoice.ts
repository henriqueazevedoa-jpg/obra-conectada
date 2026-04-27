import { useState, useRef, useEffect, useCallback } from "react";
import { transcribeAudio, synthesizeSpeech, WakeWordDetector } from "@/lib/voice/voiceService";
import toast from "react-hot-toast";

interface UseVoiceProps {
  wakeWordEnabled?: boolean;
  onWakeWord?: () => void;
}

export function useVoice({ wakeWordEnabled = false, onWakeWord }: UseVoiceProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const detectorRef = useRef<WakeWordDetector | null>(null);

  // Inicializa o Wake Word se habilitado
  useEffect(() => {
    if (wakeWordEnabled && onWakeWord) {
      if (!detectorRef.current) {
        detectorRef.current = new WakeWordDetector(onWakeWord);
      }
      
      if (detectorRef.current.isSupported()) {
        detectorRef.current.start();
        setIsWakeWordActive(true);
      } else {
        console.warn("Wake word não suportada neste browser");
      }
    } else {
      if (detectorRef.current) {
        detectorRef.current.stop();
        setIsWakeWordActive(false);
      }
    }

    return () => {
      if (detectorRef.current) {
        detectorRef.current.stop();
        setIsWakeWordActive(false);
      }
    };
  }, [wakeWordEnabled, onWakeWord]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      // Stop the detector temporarily while recording to prevent feedback or false positives
      if (detectorRef.current) detectorRef.current.stop();

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Haptic feedback se suportado
      if (navigator.vibrate) navigator.vibrate(50);
      
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      toast.error("Permissão de microfone necessária.");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve('');
        return;
      }

      recorder.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        // Desliga o stream de áudio para limpar a barra vermelha do browser
        recorder.stream.getTracks().forEach(track => track.stop());

        try {
          const text = await transcribeAudio(audioBlob);
          resolve(text);
        } catch (err: any) {
          console.error("Erro na transcrição:", err);
          toast.error("Não consegui transcrever. Tente novamente.");
          reject(err);
        } finally {
          // Restart detector se estiver ativo nas configs
          if (wakeWordEnabled && detectorRef.current) {
            detectorRef.current.start();
          }
        }
      };

      recorder.stop();
    });
  }, [wakeWordEnabled]);

  const speak = useCallback(async (text: string) => {
    try {
      setIsPlaying(true);
      // Stop the detector so it doesn't hear itself
      if (detectorRef.current) detectorRef.current.stop();
      
      await synthesizeSpeech(text);
      
    } catch (err) {
      console.error("Erro na fala:", err);
      // Silenciosamente ignora o erro para o usuário
    } finally {
      setIsPlaying(false);
      // Restart detector se estiver ativo nas configs
      if (wakeWordEnabled && detectorRef.current) {
        detectorRef.current.start();
      }
    }
  }, [wakeWordEnabled]);

  return {
    isRecording,
    isPlaying,
    isWakeWordActive,
    startRecording,
    stopRecording,
    speak
  };
}
