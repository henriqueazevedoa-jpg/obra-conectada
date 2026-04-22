import { useNavigate } from "react-router-dom";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
          <Construction className="h-8 w-8 text-slate-500" />
        </div>
        <h1 className="text-xl font-semibold text-slate-100 mb-2">{title}</h1>
        {description && (
          <p className="text-sm text-slate-400 leading-relaxed mb-6">{description}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="border-slate-700 text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
