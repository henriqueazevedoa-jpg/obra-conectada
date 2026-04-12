import { useState, useEffect, useMemo } from "react";
import { useObraSelection } from "@/contexts/ObraSelectionContext";
import { useObras } from "@/contexts/ObrasContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/untyped";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Search,
  Plus,
  File,
  Image,
  FileSpreadsheet,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import PageHeader from "@/components/PageHeader";

const CATEGORIAS = [
  "Contratos",
  "Projetos",
  "Orçamentos aprovados",
  "ART / RRT",
  "Licenças",
  "Financeiro",
  "Comprovantes",
  "Boletos",
  "Recibos",
  "Fotos importantes",
  "Outros",
];

interface Documento {
  id: string;
  company_id: string;
  obra_id: string;
  nome: string;
  categoria: string;
  descricao: string;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string;
  tamanho_bytes: number;
  created_by: string | null;
  created_at: string;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function fileIcon(tipo: string) {
  if (tipo.startsWith("image/")) return Image;
  if (tipo.includes("spreadsheet") || tipo.includes("excel") || tipo.includes("csv"))
    return FileSpreadsheet;
  return File;
}

export default function DocumentosPage() {
  const { selectedObraId } = useObraSelection();
  const { obras } = useObras();
  const { user } = useAuth();
  const { toast } = useToast();

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  // Upload dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formCategoria, setFormCategoria] = useState("Outros");
  const [formDescricao, setFormDescricao] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);

  const obra = obras.find((o) => o.id === selectedObraId);

  // Fetch documents
  async function fetchDocumentos() {
    if (!selectedObraId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documentos_obra" as any)
      .select("*")
      .eq("obra_id", selectedObraId)
      .order("created_at", { ascending: false });
    if (!error && data) setDocumentos(data as any);
    setLoading(false);
  }

  useEffect(() => {
    fetchDocumentos();
  }, [selectedObraId]);

  // Filtered list
  const filtered = useMemo(() => {
    return documentos.filter((d) => {
      const matchSearch =
        !search || d.nome.toLowerCase().includes(search.toLowerCase()) ||
        d.arquivo_nome.toLowerCase().includes(search.toLowerCase());
      const matchCat = filtroCategoria === "todas" || d.categoria === filtroCategoria;
      return matchSearch && matchCat;
    });
  }, [documentos, search, filtroCategoria]);

  // Upload
  async function handleUpload() {
    if (!formFile || !formNome.trim() || !selectedObraId || !user) return;
    setUploading(true);

    const ext = formFile.name.split(".").pop();
    const path = `${selectedObraId}/${crypto.randomUUID()}.${ext}`;

    const { error: storageErr } = await supabase.storage
      .from("documentos-obra")
      .upload(path, formFile);

    if (storageErr) {
      toast({ title: "Erro no upload", description: storageErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documentos-obra").getPublicUrl(path);

    const companyId = (obra as any)?.company_id || user.id;

    const { error: dbErr } = await supabase.from("documentos_obra" as any).insert({
      company_id: companyId,
      obra_id: selectedObraId,
      nome: formNome.trim(),
      categoria: formCategoria,
      descricao: formDescricao.trim(),
      arquivo_url: urlData.publicUrl,
      arquivo_nome: formFile.name,
      arquivo_tipo: formFile.type,
      tamanho_bytes: formFile.size,
      created_by: user.id,
    } as any);

    if (dbErr) {
      toast({ title: "Erro ao salvar", description: dbErr.message, variant: "destructive" });
    } else {
      toast({ title: "Documento enviado com sucesso!" });
      setDialogOpen(false);
      resetForm();
      fetchDocumentos();
    }
    setUploading(false);
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`Excluir "${doc.nome}"?`)) return;

    const urlParts = doc.arquivo_url.split("/documentos-obra/");
    if (urlParts[1]) {
      await supabase.storage.from("documentos-obra").remove([urlParts[1]]);
    }

    const { error } = await supabase
      .from("documentos_obra" as any)
      .delete()
      .eq("id", doc.id);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Documento excluído" });
      fetchDocumentos();
    }
  }

  function resetForm() {
    setFormNome("");
    setFormCategoria("Outros");
    setFormDescricao("");
    setFormFile(null);
  }

  if (!selectedObraId) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Documentos"
          icon={<FileText className="h-5 w-5 text-primary" />}
          showObraSelector={true}
        />
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <FolderOpen className="h-12 w-12 opacity-50" />
          <p className="text-sm">Selecione uma obra para ver os documentos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <PageHeader
        title="Documentos"
        icon={<FileText className="h-5 w-5 text-primary" />}
        showObraSelector={true}
      >
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Enviar Documento
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <FolderOpen className="h-10 w-10 mx-auto opacity-50" />
          <p className="text-sm">
            {documentos.length === 0
              ? "Nenhum documento enviado ainda."
              : "Nenhum documento encontrado com esse filtro."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                  <th className="text-left px-4 py-2.5 font-medium">Categoria</th>
                  <th className="text-left px-4 py-2.5 font-medium">Arquivo</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tamanho</th>
                  <th className="text-left px-4 py-2.5 font-medium">Data</th>
                  <th className="text-right px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((doc) => {
                  const Icon = fileIcon(doc.arquivo_tipo);
                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{doc.nome}</p>
                            {doc.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {doc.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-muted px-2 py-0.5 rounded text-xs">
                          {doc.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[160px]">
                        {doc.arquivo_nome}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatFileSize(doc.tamanho_bytes)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a href={doc.arquivo_url} target="_blank" rel="noreferrer" download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((doc) => {
              const Icon = fileIcon(doc.arquivo_tipo);
              return (
                <div
                  key={doc.id}
                  className="border rounded-lg p-3 bg-card space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{doc.nome}</p>
                      <span className="inline-block bg-muted px-1.5 py-0.5 rounded text-[11px] mt-0.5">
                        {doc.categoria}
                      </span>
                      {doc.descricao && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {doc.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.tamanho_bytes)}</span>
                    <span>{format(new Date(doc.created_at), "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={doc.arquivo_url} target="_blank" rel="noreferrer" download>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Baixar
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Contrato de prestação de serviço"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={formCategoria} onValueChange={setFormCategoria}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Breve descrição (opcional)"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Arquivo *</label>
              <Input
                type="file"
                onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
              {formFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formFile.name} — {formatFileSize(formFile.size)}
                </p>
              )}
            </div>
            <Button
              onClick={handleUpload}
              disabled={uploading || !formFile || !formNome.trim()}
              className="w-full"
            >
              {uploading ? (
                "Enviando..."
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
