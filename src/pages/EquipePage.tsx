import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, ShieldCheck, HardHat, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  user_id: string;
  nome: string;
  email: string | null;
  status: string | null;
  role: string;
}

interface Invite {
  id: string;
  nome: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  gestor: 'Gestor',
  funcionario: 'Funcionário',
  cliente: 'Cliente',
  admin: 'Admin',
};

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  gestor: 'default',
  funcionario: 'secondary',
  cliente: 'outline',
};

export default function EquipePage() {
  const { user } = useAuth();
  const { company, plan, checkLimit } = useCompany();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<Record<string, { current: number; limit: number }>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [inviteNome, setInviteNome] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('funcionario');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);

    // Fetch profiles + roles for company members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nome, email, status')
      .eq('company_id', company.id);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('company_id', company.id);

    const roleMap = new Map<string, string>();
    roles?.forEach(r => roleMap.set(r.user_id, r.role));

    const teamMembers: TeamMember[] = (profiles || []).map(p => ({
      ...p,
      role: roleMap.get(p.user_id) || 'funcionario',
    }));
    setMembers(teamMembers);

    // Fetch invites
    const { data: inviteData } = await supabase
      .from('company_user_invites')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    setInvites((inviteData as unknown as Invite[]) || []);

    // Check limits
    const [gestores, funcionarios, clientes] = await Promise.all([
      checkLimit('gestores'),
      checkLimit('funcionarios'),
      checkLimit('clientes'),
    ]);
    setLimits({
      gestores: { current: gestores.current, limit: gestores.limit },
      funcionarios: { current: funcionarios.current, limit: funcionarios.limit },
      clientes: { current: clientes.current, limit: clientes.limit },
    });

    setLoading(false);
  }, [company, checkLimit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Informe o email');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-company-user', {
        body: { nome: inviteNome, email: inviteEmail, role: inviteRole },
      });

      if (error) throw error;
      const result = data as any;
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Convite enviado com sucesso!');
        setModalOpen(false);
        setInviteNome('');
        setInviteEmail('');
        setInviteRole('funcionario');
        fetchData();
      }
    } catch {
      toast.error('Erro ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  const LimitCard = ({ label, icon: Icon, resource }: { label: string; icon: any; resource: string }) => {
    const data = limits[resource];
    const isUnlimited = data?.limit === -1;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.current ?? 0}
            {!isUnlimited && <span className="text-sm font-normal text-muted-foreground"> / {data?.limit ?? 0}</span>}
          </div>
          {!isUnlimited && data && data.current >= data.limit && (
            <p className="text-xs text-destructive mt-1">Limite atingido</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os membros da {company?.nome || 'empresa'}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar
        </Button>
      </div>

      {/* Limit Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <LimitCard label="Gestores" icon={ShieldCheck} resource="gestores" />
        <LimitCard label="Funcionários" icon={HardHat} resource="funcionarios" />
        <LimitCard label="Clientes" icon={UserCheck} resource="clientes" />
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Membros Atuais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum membro encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">{m.nome || '—'}</TableCell>
                    <TableCell>{m.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[m.role] || 'outline'}>
                        {roleLabels[m.role] || m.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'ativo' ? 'default' : 'secondary'}>
                        {m.status || 'ativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Convites Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invites.filter(i => i.status === 'pending').length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum convite pendente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.filter(i => i.status === 'pending').map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.nome || '—'}</TableCell>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[inv.role] || 'outline'}>
                        {roleLabels[inv.role] || inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pendente</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-nome">Nome</Label>
              <Input id="invite-nome" value={inviteNome} onChange={e => setInviteNome(e.target.value)} placeholder="Nome do convidado" />
            </div>
            <div>
              <Label htmlFor="invite-email">Email *</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Função</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
