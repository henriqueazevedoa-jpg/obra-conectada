import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/untyped";
import toast from "react-hot-toast";
import { ProjetoProcessamentoStatus } from "./ProjetoProcessamentoStatus";

interface ProjetoUploadProps {
  obraId: string;
  companyId: string;
  onUploadSuccess?: () => void;
}

export function ProjetoUpload({ obraId, companyId, onUploadSuccess }: ProjetoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione apenas arquivos PDF.");
      return;
    }
    
    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 100MB.");
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setActiveFileId(null);

    // Generate random UUID for the file (fallback without uuid library)
    const arquivoId = crypto.randomUUID();
    const filePath = `${companyId}/${obraId}/${arquivoId}/${file.name}`;

    try {
      const { error } = await supabase.storage
        .from('projetos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setActiveFileId(arquivoId);
      toast.success("Upload concluído! Iniciando extração...");
      
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error: any) {
      console.error("Upload erro:", error);
      toast.error("Falha ao enviar arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full">
      {/* Zona de Drop */}
      <div 
        className={`relative flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-xl transition-all ${
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        } ${isUploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInput} 
          className="hidden" 
          accept="application/pdf"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-foreground">Enviando documento...</p>
            <p className="text-xs text-muted-foreground mt-1">Aguarde o upload para o Storage.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center p-6 text-center">
            <div className="w-12 h-12 mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <UploadCloud className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Arraste o PDF do projeto aqui
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ou clique para selecionar (máx 100MB)
            </p>
          </div>
        )}
      </div>

      {/* Exibe o status de processamento imediato se acabou de enviar */}
      {activeFileId && !isUploading && (
        <div className="mt-4">
          <ProjetoProcessamentoStatus arquivoId={activeFileId} />
        </div>
      )}
    </div>
  );
}
