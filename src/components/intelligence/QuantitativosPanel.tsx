import React, { useState } from 'react';
import { useQuantitativos, QuantitativoItem } from '@/hooks/useQuantitativos';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileSpreadsheet, RefreshCw, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuantitativosPanelProps {
  obraId: string;
}

export function QuantitativosPanel({ obraId }: QuantitativosPanelProps) {
  const { user } = useAuth();
  const { status, quantitativos, loading, creditosPreview, fetchPreview, consolidar } = useQuantitativos(obraId);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleOpenModal = async () => {
    setModalOpen(true);
    if (!creditosPreview && user) {
      setLoadingPreview(true);
      try {
        await fetchPreview(user.id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const handleConfirmar = async () => {
    if (!user) return;
    try {
      await consolidar(user.id);
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Card className="mt-8 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
          <p className="text-muted-foreground">Carregando painel de quantitativos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Quantitativos Extraídos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Consolidação estruturada usando IA para deduplicação e resolução de conflitos.
          </p>
        </div>
        {status === 'concluido' && (
          <Button variant="outline" size="sm" onClick={handleOpenModal}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerar
          </Button>
        )}
      </div>

      {status === 'nao_gerado' || status === 'erro' ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Quantitativos não consolidados</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              A consolidação cruza os dados de todas as páginas classificadas, removendo duplicidades e resolvendo ambiguidades para extrair a lista exata de materiais.
            </p>
            <Button onClick={handleOpenModal}>Gerar Quantitativos</Button>
            {status === 'erro' && (
              <p className="text-sm text-destructive mt-4 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Falha na última tentativa
              </p>
            )}
          </CardContent>
        </Card>
      ) : status === 'gerando' ? (
        <Card className="border-primary/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-10 w-10 text-primary animate-spin mb-6" />
            <h3 className="text-xl font-medium animate-pulse">Consolidando dados do projeto...</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
              O motor de inteligência está processando algoritmos de similaridade e usando a rede neural para resolver conflitos de projeto. Isso pode levar alguns minutos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quantitativos.map((q) => (
            <Card key={q.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg capitalize">{q.disciplina} - {q.tipo.replace('_', ' ')}</CardTitle>
                    <CardDescription>Confiança: {q.confianca}</CardDescription>
                  </div>
                  {q.conflitos && q.conflitos.length > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Revisado por IA
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground bg-muted/10 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-medium">Elemento / Valor</th>
                        <th className="px-4 py-2 font-medium w-24 text-right">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {q.dados.elementos.map((el, i) => (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="px-4 py-2 text-foreground/80">
                            {el.valor ? String(el.valor) : Object.entries(el).filter(([k]) => k !== 'ocorrencias' && k !== 'id').map(([k,v]) => `${k}: ${v}`).join(' | ')}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">{el.ocorrencias || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Quantitativos Consolidados</DialogTitle>
            <DialogDescription>
              Esta operação lerá todas as páginas com tabelas e entidades processadas na obra.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : creditosPreview ? (
              <div className="bg-muted/40 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Páginas úteis identificadas:</span>
                  <span className="font-medium">{creditosPreview.total_chunks}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-3">
                  <span className="text-muted-foreground">Custo estimado em Créditos:</span>
                  <span className="font-semibold text-primary">{creditosPreview.creditos_estimados.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  * Serão aplicados algoritmos de OCR avançado, NLP e Modelos de Linguagem para deduplicação.
                </p>
              </div>
            ) : (
              <p className="text-sm text-destructive">Não foi possível calcular o preview de custos.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmar} disabled={loadingPreview || !creditosPreview}>
              Confirmar Geração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
