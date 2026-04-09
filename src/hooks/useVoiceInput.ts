import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

export type VoiceStatus = 'idle' | 'recording' | 'uploading' | 'processing' | 'done' | 'error';

interface VoiceResult {
  transcription: string;
  parsed: Record<string, any>;
  confidence: number;
}

export function useVoiceInput(moduleOrigin: string, obraId?: string) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
    } catch (err) {
      setError('Não foi possível acessar o microfone.');
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
        resolve();
      };
      mediaRecorder.stop();
    });
  }, [user, company, obraId, moduleOrigin]);

  const processAudio = async (blob: Blob) => {
    if (!user || !company) return;
    setStatus('uploading');

    try {
      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-audio')
        .upload(fileName, blob, { contentType: 'audio/webm' });

      if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);

      setStatus('processing');

      // Call edge function
      const { data, error: fnError } = await supabase.functions.invoke('process-voice', {
        body: { audioPath: fileName, module: moduleOrigin, obraId },
      });

      if (fnError) throw new Error('Erro no processamento: ' + fnError.message);

      const voiceResult: VoiceResult = {
        transcription: data.transcription || '',
        parsed: data.parsed || {},
        confidence: data.confidence || 0,
      };

      // Save to voice_inputs
      await supabase.from('voice_inputs').insert({
        company_id: company.id,
        user_id: user.id,
        obra_id: obraId || null,
        module_origin: moduleOrigin,
        audio_path: fileName,
        transcription: voiceResult.transcription,
        parsed_json: voiceResult.parsed,
        confidence: voiceResult.confidence,
        status: 'completed',
      } as any);

      setResult(voiceResult);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
      setStatus('error');
    }
  };

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, startRecording, stopRecording, reset };
}
