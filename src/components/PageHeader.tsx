import { useObras } from "@/contexts/ObrasContext";
import { useObraSelection } from "@/contexts/ObraSelectionContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showObraSelector?: boolean;
  /** Show "+ Criar Nova Obra" option in dropdown */
  showCreateObra?: boolean;
  onCreateObra?: () => void;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  showObraSelector = true,
  showCreateObra = false,
  onCreateObra,
  children,
}: PageHeaderProps) {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const obra = obras.find((o) => o.id === selectedObraId);

  const handleChange = (value: string) => {
    if (value === "__nova_obra__" && onCreateObra) {
      onCreateObra();
    } else {
      setSelectedObraId(value);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {showObraSelector && obra && !subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {obra.codigo ? `${obra.codigo} — ` : ""}{obra.nome}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {showObraSelector && (
          <Select value={selectedObraId} onValueChange={handleChange}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo ? `${o.codigo} - ` : ""}{o.nome}
                </SelectItem>
              ))}
              {showCreateObra && (
                <SelectItem value="__nova_obra__" className="text-primary font-medium">
                  + Criar Nova Obra
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
        {children}
      </div>
    </div>
  );
}
