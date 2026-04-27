// Tipos compartilhados do Chat — sem dependências de contexto ou hooks
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
