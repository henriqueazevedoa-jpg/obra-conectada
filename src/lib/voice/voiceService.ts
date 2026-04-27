export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_OPENAI_API_KEY não configurada no ambiente.");
  }

  const formData = new FormData();
  // Ensure the blob has a webm extension so Whisper accepts it
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na transcrição: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.text;
}

export async function synthesizeSpeech(text: string): Promise<void> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_OPENAI_API_KEY não configurada no ambiente.");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",
      speed: 1.1,
      input: text
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha na síntese de voz: ${response.status} - ${errorText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      reject(e);
    };
    audio.play().catch(reject);
  });
}

// Global declaration for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class WakeWordDetector {
  private recognition: any = null;
  private isListening: boolean = false;
  private onWakeWord: () => void;
  private autoRestart: boolean = true;

  constructor(onWakeWord: () => void) {
    this.onWakeWord = onWakeWord;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'pt-BR';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const combined = (finalTranscript + ' ' + interimTranscript).toLowerCase();
        
        // Verifica se ouviu "hey lastra" ou variações fonéticas próximas
        if (combined.includes('hey lastra') || combined.includes('rei lastra') || combined.includes('hei lastra')) {
          // Detectado! Para evitar triggers repetidos, paramos temporariamente
          this.stop(false);
          this.onWakeWord();
        }
      };

      this.recognition.onerror = (event: any) => {
        // Silently ignore errors to prevent UI spam. 
        // Note: some errors abort the recognition (like 'not-allowed').
        if (event.error === 'not-allowed') {
          this.autoRestart = false; // User denied permission
        }
      };

      this.recognition.onend = () => {
        if (this.autoRestart && this.isListening) {
          // Reinicia silenciosamente se cair
          try {
            this.recognition.start();
          } catch (e) {
            // Already started or errored
          }
        } else {
          this.isListening = false;
        }
      };
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  start() {
    if (!this.recognition || this.isListening) return;
    this.autoRestart = true;
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      // Pega caso já tenha sido startado concorrentemente
      console.warn("WakeWordDetector: já estava escutando", e);
    }
  }

  stop(disableAutoRestart: boolean = true) {
    if (!this.recognition) return;
    if (disableAutoRestart) {
      this.autoRestart = false;
    }
    this.isListening = false;
    try {
      this.recognition.stop();
    } catch (e) {}
  }
}
