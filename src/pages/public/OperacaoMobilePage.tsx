/**
 * OperacaoMobilePage — /o/:token
 * Formulário mobile-first para funcionários em campo.
 * Sem login — acesso via link gerado pelo gestor.
 * Página única com scroll natural (não wizard).
 */
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClient } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { Loader2, Link2Off, CheckCircle2, Camera, Sun, Cloud, CloudRain } from 'lucide-react';

const SUPABASE_URL = 'https://ehmdwwuhhumgxhsjvvrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobWR3d3VoaHVtZ3hoc2p2dnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzI1MDgsImV4cCI6MjA5MDY0ODUwOH0.qmzYKaoUluhbwsQgKR9yzuM6wyW7qA7XbEP8LG1fnjk';

// Cliente Supabase isolado — usa a anon key explicitamente, sem sessão persistida.
// Garante que o formulário mobile sempre funciona como 'anon', independente
// de haver ou não um usuário logado no mesmo browser.
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface LinkInfo {
  id: string;
  nome_label: string;
  permite_estoque: boolean;
}
interface ObraInfo {
  id: string;
  nome: string;
}

// Valores alinhados com climaLabels/climaIcons do DiarioTab
type Clima = 'sol' | 'nublado' | 'chuva' | 'chuvoso_forte';

// ── Clima config ───────────────────────────────────────────────────────────────

const CLIMAS: { key: Clima; label: string; icon: React.ElementType; bg: string }[] = [
  { key: 'sol',           label: 'Sol',        icon: Sun,       bg: 'bg-amber-50 border-amber-300 text-amber-700' },
  { key: 'nublado',       label: 'Nublado',    icon: Cloud,     bg: 'bg-slate-100 border-slate-300 text-slate-600' },
  { key: 'chuva',         label: 'Chuva',      icon: CloudRain, bg: 'bg-blue-50 border-blue-300 text-blue-700' },
  { key: 'chuvoso_forte', label: 'Tempestade', icon: CloudRain, bg: 'bg-purple-50 border-purple-300 text-purple-700' },
];

// ── Error ──────────────────────────────────────────────────────────────────────

function ErrorPage({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Link2Off className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Link indisponível</h1>
        <p className="text-sm text-gray-500">{msg}</p>
        <p className="text-xs text-gray-400">ObraConectada</p>
      </div>
    </div>
  );
}

// ── Sucesso ────────────────────────────────────────────────────────────────────

function SuccessPage({ nome, obra, onNovo }: { nome: string; obra: string; onNovo: () => void }) {
  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-5">
        <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Registro enviado!</h1>
          <p className="text-base text-gray-600">Obrigado, {nome.split(' ')[0]}.</p>
          <p className="text-sm text-gray-400">
            Diário registrado para <strong>{obra}</strong><br />
            <span className="capitalize">{hoje}</span>
          </p>
        </div>
        <button
          onClick={onNovo}
          className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium text-sm active:scale-95 transition-transform"
        >
          Fazer novo registro
        </button>
        <p className="text-xs text-gray-300">ObraConectada</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function OperacaoMobilePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [link, setLink] = useState<LinkInfo | null>(null);
  const [obra, setObra] = useState<ObraInfo | null>(null);

  // Form fields
  const [trabalhadores, setTrabalhadores] = useState(1);
  const [clima, setClima] = useState<Clima | null>(null);
  const [atividades, setAtividades] = useState('');
  const [temProblema, setTemProblema] = useState(false);
  const [problemas, setProblemas] = useState('');
  const [recebeuMaterial, setRecebeuMaterial] = useState(false);
  const [fotoNF, setFotoNF] = useState<File | null>(null);
  const [fotoNFPreview, setFotoNFPreview] = useState<string | null>(null);
  const [obsNF, setObsNF] = useState('');
  const [faltouMaterial, setFaltouMaterial] = useState(false);
  const [qualMaterial, setQualMaterial] = useState('');
  const [fotosDia, setFotosDia] = useState<File[]>([]);
  const [fotosDiaPreview, setFotosDiaPreview] = useState<string[]>([]);

  const nfInputRef = useRef<HTMLInputElement>(null);
  const fotosInputRef = useRef<HTMLInputElement>(null);

  // ── Verifica token ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }

    fetch(`${SUPABASE_URL}/functions/v1/verify-link?token=${token}`, {
      headers: { 'apikey': SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(res => {
        if (res.error) { setError(res.error); setLoading(false); return; }
        if (res.link.tipo !== 'operacao') { setError('Este link não é de operação.'); setLoading(false); return; }
        setLink(res.link);
        setObra(res.obra);
        setLoading(false);
      })
      .catch(() => { setError('Erro ao carregar link. Verifique sua conexão.'); setLoading(false); });
  }, [token]);

  const handleNFPhoto = (file: File | null) => {
    setFotoNF(file);
    if (file) setFotoNFPreview(URL.createObjectURL(file));
    else setFotoNFPreview(null);
  };

  const handleFotosDia = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6);
    setFotosDia(arr);
    setFotosDiaPreview(arr.map(f => URL.createObjectURL(f)));
  };

  // ── Upload fotos (via cliente público isolado) ────────────────────────────
  const uploadFotos = async (files: File[], bucket: string, path: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const fname = `${path}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabasePublic.storage.from(bucket).upload(fname, file);
      if (!error) {
        const { data } = supabasePublic.storage.from(bucket).getPublicUrl(fname);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  // ── Submit via Edge Function (service_role, sem dependência de RLS) ────────
  const handleSubmit = async () => {
    if (!link || !obra) return;
    if (!clima) { alert('Selecione o clima do dia.'); return; }
    if (!atividades.trim()) { alert('Descreva as atividades do dia.'); return; }

    setSubmitting(true);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');

      // Upload fotos do dia
      const urlsFotos = fotosDia.length > 0
        ? await uploadFotos(fotosDia, 'diario-fotos', `${obra.id}/${hoje}`)
        : [];

      // Prepara entrada pendente (se aplicável)
      let entrada_pendente: { tipo: string; foto_urls: string[]; observacao: string | null } | null = null;

      if (recebeuMaterial && fotoNF) {
        const urlsNF = await uploadFotos([fotoNF], 'diario-fotos', `${obra.id}/nf`);
        entrada_pendente = {
          tipo: 'nota_fiscal',
          foto_urls: urlsNF,
          observacao: obsNF.trim() || null,
        };
      } else if (faltouMaterial && qualMaterial.trim()) {
        entrada_pendente = {
          tipo: 'outro',
          foto_urls: [],
          observacao: `FALTA DE MATERIAL: ${qualMaterial.trim()}`,
        };
      }

      // Chama a Edge Function de submissão (usa service_role internamente)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-diario-operacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          token,
          diario: {
            trabalhadores,
            clima,
            servicos_executados: atividades.trim(),
            problemas: temProblema && problemas.trim() ? problemas.trim() : null,
            fotos: urlsFotos,
          },
          entrada_pendente,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`);

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Erro ao enviar: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTrabalhadores(1);
    setClima(null);
    setAtividades('');
    setTemProblema(false);
    setProblemas('');
    setRecebeuMaterial(false);
    setFotoNF(null);
    setFotoNFPreview(null);
    setObsNF('');
    setFaltouMaterial(false);
    setQualMaterial('');
    setFotosDia([]);
    setFotosDiaPreview([]);
    setSuccess(false);
  };

  const hoje = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  if (error) return <ErrorPage msg={error} />;
  if (success && link && obra) return (
    <SuccessPage nome={link.nome_label} obra={obra.nome} onNovo={resetForm} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{obra?.nome}</p>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Registro do Dia</h1>
          <p className="text-xs text-gray-400 capitalize">{hoje} · {link?.nome_label}</p>
        </div>
      </header>

      <div className="px-4 py-6 space-y-7 max-w-lg mx-auto pb-32">

        {/* ── Trabalhadores ──────────────────────────────────────────────── */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-gray-900">
            Quantos trabalhadores <span className="text-primary">da sua equipe</span> estavam na obra hoje?
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTrabalhadores(t => Math.max(0, t - 1))}
              className="h-12 w-12 rounded-xl bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
            >
              −
            </button>
            <span className="text-4xl font-bold text-gray-900 w-16 text-center">{trabalhadores}</span>
            <button
              onClick={() => setTrabalhadores(t => t + 1)}
              className="h-12 w-12 rounded-xl bg-primary text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        </section>

        {/* ── Clima ─────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-gray-900">Como estava o tempo hoje?</label>
          <div className="grid grid-cols-5 gap-2">
            {CLIMAS.map(c => {
              const Icon = c.icon;
              const selected = clima === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setClima(c.key)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95',
                    selected ? c.bg + ' border-current shadow-sm' : 'bg-white border-gray-200 text-gray-400'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium leading-tight text-center">{c.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Atividades ─────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-gray-900">
            O que sua equipe fez hoje?
          </label>
          <textarea
            value={atividades}
            onChange={e => setAtividades(e.target.value)}
            rows={4}
            placeholder="Descreva as atividades realizadas hoje..."
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none resize-none"
          />
          <p className="text-xs text-gray-400">Ex: "Concretagem da laje do 2º pavimento, área de 80m²"</p>
        </section>

        {/* ── Problema ───────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-gray-900">Houve algum problema ou ocorrência hoje?</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: false, label: '✅  Não, tudo bem', cls: !temProblema ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500' },
              { v: true,  label: '⚠️  Sim, houve',   cls: temProblema  ? 'border-amber-400 bg-amber-50 text-amber-700'   : 'border-gray-200 bg-white text-gray-500' },
            ].map(opt => (
              <button
                key={String(opt.v)}
                onClick={() => setTemProblema(opt.v)}
                className={cn('py-4 rounded-xl border-2 font-medium text-sm transition-all active:scale-95', opt.cls)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {temProblema && (
            <textarea
              value={problemas}
              onChange={e => setProblemas(e.target.value)}
              rows={3}
              placeholder="Descreva o problema ou ocorrência..."
              className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none resize-none"
            />
          )}
        </section>

        {/* ── Material (se permitido) ────────────────────────────────────── */}
        {link?.permite_estoque && (
          <>
            <section className="space-y-3">
              <label className="block text-base font-semibold text-gray-900">Recebeu algum material hoje?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: false, label: 'Não', cls: !recebeuMaterial ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-gray-200 bg-white text-gray-400' },
                  { v: true,  label: '📦  Sim, com NF', cls: recebeuMaterial ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-white text-gray-400' },
                ].map(opt => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setRecebeuMaterial(opt.v)}
                    className={cn('py-4 rounded-xl border-2 font-medium text-sm transition-all active:scale-95', opt.cls)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {recebeuMaterial && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Tire uma foto da nota fiscal ou recibo:</p>
                  <input
                    ref={nfInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleNFPhoto(e.target.files?.[0] || null)}
                  />
                  {fotoNFPreview ? (
                    <div className="relative">
                      <img src={fotoNFPreview} alt="NF" className="w-full rounded-xl object-cover max-h-48" />
                      <button
                        onClick={() => { setFotoNF(null); setFotoNFPreview(null); }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-xs text-gray-500"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => nfInputRef.current?.click()}
                      className="w-full py-5 rounded-xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center gap-2 text-gray-400 active:scale-95 transition-transform"
                    >
                      <Camera className="h-8 w-8" />
                      <span className="text-sm font-medium">Tirar foto da NF</span>
                    </button>
                  )}
                  <textarea
                    value={obsNF}
                    onChange={e => setObsNF(e.target.value)}
                    rows={2}
                    placeholder="Observação sobre o recebimento (opcional)..."
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none resize-none"
                  />
                </div>
              )}
            </section>

            <section className="space-y-3">
              <label className="block text-base font-semibold text-gray-900">Faltou algum material necessário?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: false, label: 'Não', cls: !faltouMaterial ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-gray-200 bg-white text-gray-400' },
                  { v: true,  label: '⚠️  Sim', cls: faltouMaterial ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-400' },
                ].map(opt => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setFaltouMaterial(opt.v)}
                    className={cn('py-4 rounded-xl border-2 font-medium text-sm transition-all active:scale-95', opt.cls)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {faltouMaterial && (
                <textarea
                  value={qualMaterial}
                  onChange={e => setQualMaterial(e.target.value)}
                  rows={2}
                  placeholder="Qual material está faltando?"
                  className="w-full rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none resize-none"
                />
              )}
            </section>
          </>
        )}

        {/* ── Fotos do dia ───────────────────────────────────────────────── */}
        <section className="space-y-3">
          <label className="block text-base font-semibold text-gray-900">Fotos do dia <span className="text-gray-400 font-normal">(opcional)</span></label>
          <input
            ref={fotosInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={e => handleFotosDia(e.target.files)}
          />
          {fotosDiaPreview.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {fotosDiaPreview.map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-xl aspect-square object-cover w-full" />
                ))}
              </div>
              <button
                onClick={() => fotosInputRef.current?.click()}
                className="text-sm text-primary font-medium"
              >
                + Adicionar mais
              </button>
            </div>
          ) : (
            <button
              onClick={() => fotosInputRef.current?.click()}
              className="w-full py-5 rounded-xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center gap-2 text-gray-400 active:scale-95 transition-transform"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-medium">Adicionar fotos</span>
            </button>
          )}
        </section>

      </div>

      {/* Botão fixo de envio */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <button
          onClick={handleSubmit}
          disabled={submitting || !clima || !atividades.trim()}
          className={cn(
            'w-full py-4 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-95',
            submitting || !clima || !atividades.trim()
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
          )}
        >
          {submitting ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
          ) : (
            <>✓  Enviar Registro</>
          )}
        </button>
      </div>
    </div>
  );
}
