import { BarChart3, Calendar, TrendingUp, Wallet, Package, BookOpen, Users, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const modules = [
  { icon: BarChart3, title: 'Orçamento detalhado', desc: 'Estruture custos por categorias e composições' },
  { icon: Calendar, title: 'Cronograma físico', desc: 'Planeje e acompanhe o andamento' },
  { icon: TrendingUp, title: 'Controle de custos', desc: 'Compare previsto vs realizado' },
  { icon: Wallet, title: 'Gestão de pagamentos', desc: 'Parcelas, vencimentos e status' },
  { icon: Package, title: 'Estoque e materiais', desc: 'Movimentações e controle' },
  { icon: BookOpen, title: 'Diário de obra', desc: 'Atividades, clima e ocorrências' },
  { icon: Users, title: 'Fornecedores', desc: 'Cadastro e comparação de preços' },
  { icon: FileText, title: 'Documentos', desc: 'Organize e acesse documentos' },
];

export default function ModulesSection() {
  return (
    <section id="modulos" className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Tudo que você precisa em um só lugar</h2>
        <p className="text-center text-muted-foreground mb-10">Módulos integrados que cobrem cada aspecto da sua obra</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <mod.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{mod.title}</h3>
                <p className="text-xs text-muted-foreground">{mod.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-8 text-sm">
          Tudo integrado para você finalmente <span className="font-semibold text-foreground">entender sua obra</span>.
        </p>
      </div>
    </section>
  );
}
