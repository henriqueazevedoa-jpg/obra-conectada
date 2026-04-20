import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface HelpPopoverProps {
  text: string;
  title?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Ícone de ajuda contextual com popover.
 * Coloque ao lado de títulos ou labels para explicar conceitos ao usuário.
 */
export function HelpPopover({ text, title, side = 'bottom', className }: HelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 ml-1',
            className
          )}
          aria-label="Ajuda"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-72 p-3 text-xs leading-relaxed space-y-1">
        {title && (
          <p className="font-semibold text-foreground mb-1">{title}</p>
        )}
        <p className="text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}
