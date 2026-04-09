import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Puzzle, Mic } from 'lucide-react';

interface AddonCatalogItem { code: string; nome: string; descricao: string; ativo: boolean; }

export default function AdminAddonsPage() {
  const [addons, setAddons] = useState<AddonCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('addon_catalog').select('*').then(({ data }) => {
      if (data) setAddons(data as unknown as AddonCatalogItem[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Puzzle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Add-ons</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {addons.map(addon => (
          <Card key={addon.code}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{addon.nome}</h3>
                </div>
                <Badge variant={addon.ativo ? 'default' : 'secondary'}>{addon.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{addon.descricao || '—'}</p>
              <p className="text-[10px] text-muted-foreground mt-2">Código: {addon.code}</p>
            </CardContent>
          </Card>
        ))}
        {addons.length === 0 && <p className="text-muted-foreground text-sm">Nenhum add-on cadastrado.</p>}
      </div>
    </div>
  );
}
