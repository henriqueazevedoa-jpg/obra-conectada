import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardHat, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NoObraStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export default function NoObraState({
  title,
  description,
  ctaLabel = 'Cadastrar obra',
  ctaTo = '/obras?nova=1',
}: NoObraStateProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed shadow-card">
      <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HardHat className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => navigate(ctaTo)} className="gap-2">
          <Plus className="h-4 w-4" />
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
