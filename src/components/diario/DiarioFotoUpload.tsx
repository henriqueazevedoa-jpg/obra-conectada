import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, X, Upload } from 'lucide-react';

export interface FotoPendente {
  id: string;
  file: File;
  preview: string;
  legenda: string;
}

interface Props {
  fotos: FotoPendente[];
  onChange: (fotos: FotoPendente[]) => void;
}

export default function DiarioFotoUpload({ fotos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const newFotos: FotoPendente[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      legenda: '',
    }));
    onChange([...fotos, ...newFotos]);
  };

  const updateLegenda = (id: string, legenda: string) => {
    onChange(fotos.map(f => f.id === id ? { ...f, legenda } : f));
  };

  const remove = (id: string) => {
    const foto = fotos.find(f => f.id === id);
    if (foto) URL.revokeObjectURL(foto.preview);
    onChange(fotos.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Camera className="h-4 w-4" /> Fotos
        </label>
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => inputRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {fotos.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Nenhuma foto adicionada. (Opcional)</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {fotos.map(foto => (
          <div key={foto.id} className="border border-border rounded-lg overflow-hidden">
            <div className="relative aspect-video bg-muted">
              <img src={foto.preview} alt="" className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                onClick={() => remove(foto.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-1.5">
              <Input
                placeholder="Legenda..."
                value={foto.legenda}
                onChange={e => updateLegenda(foto.id, e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
