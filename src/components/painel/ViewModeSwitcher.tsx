import { Button } from '@/components/ui/button';
import { List, GitBranch, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'lista' | 'timeline' | 'calendario';

const config: Record<ViewMode, { icon: typeof List; label: string }> = {
  lista: { icon: List, label: 'Lista' },
  timeline: { icon: GitBranch, label: 'Timeline' },
  calendario: { icon: Calendar, label: 'Calendário' },
};

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  options?: ViewMode[];
}

export default function ViewModeSwitcher({ value, onChange, options = ['lista', 'timeline', 'calendario'] }: Props) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
      {options.map(mode => {
        const { icon: Icon, label } = config[mode];
        return (
          <Button
            key={mode}
            variant={value === mode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1"
            onClick={() => onChange(mode)}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </Button>
        );
      })}
    </div>
  );
}
