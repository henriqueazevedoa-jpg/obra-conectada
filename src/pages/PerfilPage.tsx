import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Building2, LogOut, Crown, Camera, Lock, Save, Loader2 } from 'lucide-react';
import { useObras } from '@/contexts/ObrasContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

const roleLabels: Record<string, string> = {
  admin: 'Admin da Plataforma',
  gestor: 'Gestor da Obra',
  funcionario: 'Funcionário / Equipe de Campo',
  cliente: 'Dono da Obra / Cliente',
};

export default function PerfilPage() {
  const { user, refreshUser, logout } = useAuth();
  const { company, plan, subscription } = useCompany();
  const navigate = useNavigate();
  const { obras } = useObras();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [profissao, setProfissao] = useState('');
  const [conselhoTipo, setConselhoTipo] = useState('CREA');
  const [registroConselho, setRegistroConselho] = useState('');
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States para senha
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setNome(user.name || '');
      setAvatarUrl(user.avatar_url || null);
      
      const fetchProfile = async () => {
        const { data } = await supabase.from('profiles').select('telefone, profissao, conselho_tipo, registro_conselho, avatar_url').eq('user_id', user.id).single();
        if (data) {
          setTelefone(data.telefone || '');
          setProfissao(data.profissao || '');
          setConselhoTipo(data.conselho_tipo || 'CREA');
          setRegistroConselho(data.registro_conselho || '');
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
      };
      
      fetchProfile();
    }
  }, [user?.id]);

  if (!user) return null;

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Atenção', description: 'O nome não pode ser vazio', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        nome,
        telefone,
        profissao,
        conselho_tipo: conselhoTipo,
        registro_conselho: registroConselho
      }).eq('user_id', user.id);

      if (error) throw error;
      
      await refreshUser();
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ title: 'Atenção', description: 'Formato inválido. Use JPG ou PNG.', variant: 'outline' });
        return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${ext}`;
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
        upsert: true,
        cacheControl: '0'
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl + '?t=' + new Date().getTime(); 
      
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl);
      await refreshUser();
      
      toast({ title: 'Sucesso', description: 'Foto de perfil atualizada.' });
    } catch (e: any) {
      toast({ title: 'Erro no Upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      // reset file input
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Atenção', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Atenção', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Senha atualizada com sucesso.' });
      setPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setChangingPwd(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <Badge variant="secondary" className="px-3 py-1 font-medium bg-primary/10 text-primary border-primary/20">
          {roleLabels[user.role]}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_250px]">
        {/* Lado Esquerdo: Formulário */}
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardContent className="p-6 space-y-5">
              {/* Foto Profile */}
              <div className="flex items-center gap-5">
                <div 
                  className="relative h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer group shrink-0 border-2 border-transparent hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                  
                  {/* Overlay camera */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{nome || 'Seu Nome'}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Clique na foto para alterar</p>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadFoto} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t mt-5">
                {/* Nome */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nome Completo</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Como você quer ser chamado?" />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label>E-mail <span className="text-muted-foreground text-xs font-normal ml-1">(Não editável)</span></Label>
                  <Input value={user.email} disabled className="bg-muted/50" />
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold border-b pb-2 text-sm uppercase tracking-wider text-muted-foreground">Dados Profissionais e ART</h3>
              
              <div className="space-y-1.5">
                <Label>Profissão</Label>
                <Input value={profissao} onChange={e => setProfissao(e.target.value)} placeholder="Ex: Engenheiro Civil, Arquiteto, Mestre de Obras" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de Conselho</Label>
                  <Select value={conselhoTipo} onValueChange={setConselhoTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREA">CREA</SelectItem>
                      <SelectItem value="CAU">CAU</SelectItem>
                      <SelectItem value="CFT">CFT</SelectItem>
                      <SelectItem value="outro">Outro / Nenhum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Número do Registro</Label>
                  <Input value={registroConselho} onChange={e => setRegistroConselho(e.target.value)} placeholder="Ex: SP 123456" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 justify-end">
            <Button onClick={handleSalvar} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Lado Direito: Info de Empresa, Obras, Conta */}
        <div className="space-y-5">
          {company && (
            <Card className="shadow-sm border-dashed">
              <CardContent className="p-4 space-y-3 pt-5">
                <div className="flex gap-3">
                  <Crown className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-foreground leading-tight">{company.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Plano {plan?.nome_comercial || '—'}
                      {subscription && <><br/>Status: {subscription.status === 'trial' ? 'Período teste' : subscription.status}</>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-dashed">
            <CardContent className="p-4 space-y-3 pt-5">
              <div className="flex gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium leading-tight">Obras vinculadas</p>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    {obras.length === 0 ? <p>Nenhuma obra</p> : obras.map(o => (
                      <p key={o.id} className="truncate" title={o.nome}>• {o.nome}</p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-dashed bg-muted/20">
            <CardContent className="p-4 space-y-3 pt-5">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="w-full">
                  <p className="text-sm font-medium leading-tight">Segurança</p>
                  
                  <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs bg-background">Alterar Senha</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Alterar Senha</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                          <Label>Nova Senha</Label>
                          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Confirmar Nova Senha</Label>
                          <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancelar</Button>
                        <Button onClick={handleChangePassword} disabled={changingPwd}>
                          {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                </div>
              </div>
            </CardContent>
          </Card>

          <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground hover:text-red-600 hover:bg-red-50 mt-10">
            <LogOut className="h-4 w-4 mr-2" />
            Sair da Plataforma
          </Button>
        </div>
      </div>
    </div>
  );
}
