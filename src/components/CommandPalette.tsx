import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Building2, DollarSign, CalendarDays, BookOpen,
  Package, Receipt, Wallet, ListChecks, Store, FolderOpen,
  CalendarCheck, ShoppingBasket, Users, User, BarChart3,
} from 'lucide-react';
import { useCommandPalette } from '@/contexts/CommandPaletteContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';

interface CommandEntry {
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  group: string;
  keywords?: string[];
}

export default function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const { obras } = useObras();
  const { setSelectedObraId } = useObraSelection();
  const [search, setSearch] = useState('');

  // Fechar e navegar
  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  const navEntries: CommandEntry[] = [
    { label: 'Obras',           icon: Building2,      action: () => go('/obras'),        group: 'Páginas', keywords: ['lista obras'] },
    { label: 'Painel da Obra',  icon: LayoutDashboard, action: () => go('/painel'),       group: 'Páginas', keywords: ['dashboard'] },
    { label: 'Orçamento',       icon: DollarSign,      action: () => go('/orcamento'),    group: 'Páginas', keywords: ['planilha', 'sinapi', 'composicao'] },
    { label: 'Custo Real',      icon: Receipt,         action: () => go('/custo-real'),   group: 'Páginas', keywords: ['custo realizado'] },
    { label: 'Pagamentos',      icon: Wallet,          action: () => go('/pagamentos'),   group: 'Páginas', keywords: ['pagar', 'receber', 'financeiro'] },
    { label: 'Insumos',         icon: ShoppingBasket,  action: () => go('/insumos'),      group: 'Páginas', keywords: ['cotacao', 'preco', 'material'] },
    { label: 'Fornecedores',    icon: Store,           action: () => go('/fornecedores'), group: 'Páginas', keywords: ['fornecedor', 'empresa'] },
    { label: 'Cronograma',      icon: CalendarDays,    action: () => go('/cronograma'),   group: 'Páginas', keywords: ['gantt', 'prazo', 'tarefa'] },
    { label: 'Agenda da Obra',  icon: CalendarCheck,   action: () => go('/agenda'),       group: 'Páginas', keywords: ['evento', 'compromisso'] },
    { label: 'Diário de Obra',  icon: BookOpen,        action: () => go('/diario'),       group: 'Páginas', keywords: ['rdo', 'registro', 'campo'] },
    { label: 'Pendências',      icon: ListChecks,      action: () => go('/pendencias'),   group: 'Páginas', keywords: ['punch list', 'problema'] },
    { label: 'Estoque',         icon: Package,         action: () => go('/estoque'),      group: 'Páginas', keywords: ['material', 'almoxarifado'] },
    { label: 'Documentos',      icon: FolderOpen,      action: () => go('/documentos'),   group: 'Páginas', keywords: ['arquivo', 'planta', 'contrato'] },
    { label: 'Usuários',        icon: Users,           action: () => go('/usuarios'),     group: 'Páginas', keywords: ['equipe', 'funcionario'] },
    { label: 'Meu Perfil',      icon: User,            action: () => go('/perfil'),       group: 'Páginas', keywords: ['conta', 'senha'] },
    { label: 'Relatórios',      icon: BarChart3,       action: () => go('/relatorios'),   group: 'Páginas', keywords: ['kpi', 'grafico', 'evm'] },
  ];

  // Obras recentes como ações
  const obraEntries: CommandEntry[] = obras.slice(0, 6).map((obra) => ({
    label: obra.nome,
    description: obra.endereco || undefined,
    icon: Building2,
    group: 'Obras',
    keywords: [obra.codigo || '', obra.tipo || ''],
    action: () => {
      setSelectedObraId(obra.id);
      setOpen(false);
      navigate('/painel');
    },
  }));

  // Filtro combinado
  const normalizar = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const q = normalizar(search);

  function matchEntry(entry: CommandEntry) {
    if (!q) return true;
    const haystack = normalizar(
      [entry.label, entry.description || '', ...(entry.keywords || [])].join(' ')
    );
    return haystack.includes(q);
  }

  const filteredNav = navEntries.filter(matchEntry);
  const filteredObras = obraEntries.filter(matchEntry);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar páginas, obras, ações..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {filteredObras.length > 0 && (
          <>
            <CommandGroup heading="Obras Recentes">
              {filteredObras.map((entry) => {
                const Icon = entry.icon;
                return (
                  <CommandItem
                    key={entry.label}
                    value={entry.label}
                    onSelect={entry.action}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary/80" />
                    <span>{entry.label}</span>
                    {entry.description && (
                      <span className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">
                        {entry.description}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredNav.length > 0 && (
          <CommandGroup heading="Ir para">
            {filteredNav.map((entry) => {
              const Icon = entry.icon;
              return (
                <CommandItem
                  key={entry.label}
                  value={entry.label}
                  onSelect={entry.action}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{entry.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>

      {/* Dica de atalho */}
      <div className="border-t px-3 py-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span><kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">↑↓</kbd> navegar</span>
        <span><kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">↵</kbd> selecionar</span>
        <span><kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">Esc</kbd> fechar</span>
      </div>
    </CommandDialog>
  );
}
