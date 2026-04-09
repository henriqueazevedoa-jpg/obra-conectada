import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HardHat, Mail, Lock, ArrowRight, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupNome, setSignupNome] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const success = await login(loginEmail, loginPassword);
    setSubmitting(false);
    if (success) {
      navigate('/painel');
    } else {
      setError('E-mail ou senha inválidos.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (signupPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    const result = await signup(signupEmail, signupPassword, signupNome);
    setSubmitting(false);
    if (result.success) {
      toast({ title: 'Conta criada com sucesso!', description: 'Você já está logado.' });
      navigate('/painel');
    } else {
      setError(result.error || 'Erro ao criar conta.');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-primary text-primary-foreground p-12">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <HardHat className="h-12 w-12" />
            <h1 className="text-4xl font-bold">ObraFácil</h1>
          </div>
          <p className="text-xl leading-relaxed opacity-90">
            Controle cronograma, orçamento, materiais e diário de obra em um só sistema.
          </p>
          <div className="pt-4 space-y-3 text-sm opacity-80">
            <p>✓ Cronograma visual com acompanhamento de etapas</p>
            <p>✓ Orçamento previsto × realizado</p>
            <p>✓ Diário de obra digital</p>
            <p>✓ Controle de estoque e materiais</p>
            <p>✓ Acesso diferenciado por perfil</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-4">
            <HardHat className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">ObraFácil</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
                <p className="text-muted-foreground text-sm mt-1">Entre com sua conta</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                  Entrar
                </Button>
              </form>

              {/* Atalhos temporários para teste */}
              <div className="border border-dashed border-warning/50 rounded-lg p-3 space-y-2 bg-warning/5">
                <p className="text-xs font-medium text-warning flex items-center gap-1">⚡ Acesso rápido (temporário)</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Gestor', email: 'gestor@teste.com' },
                    { label: 'Funcionário', email: 'funcionario@teste.com' },
                    { label: 'Cliente', email: 'cliente@teste.com' },
                    { label: 'Admin', email: 'admin@teste.com' },
                  ].map(acc => (
                    <Button
                      key={acc.email}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      disabled={submitting}
                      onClick={() => {
                        setLoginEmail(acc.email);
                        setLoginPassword('123456');
                        setError('');
                      }}
                    >
                      {acc.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Clique para preencher, depois aperte Entrar</p>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
                <p className="text-muted-foreground text-sm mt-1">Cadastre-se para começar</p>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Seu nome"
                      value={signupNome}
                      onChange={e => setSignupNome(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRight className="h-4 w-4 mr-1" />}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
