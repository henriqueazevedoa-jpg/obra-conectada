import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  ShieldCheck,
  HardHat,
  UserCheck,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
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
  admin: 'default',
};

export default function EquipePage() {
  const { user } = useAuth();
  const { company, plan, checkLimit } = useCompany();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<Record<string, { current: number; limit: number }>>({});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Invite modal
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteNome, setInviteNome] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('funcionario');
  const [sending, setSending] = useState(false);

  // Edit role modal
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState('funcionario');
  const [savingRole, setSavingRole] = useState(false);

  // Remove user confirm
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // Cancel invite confirm
  const [cancelInviteOpen, setCancelInviteOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Invite | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!company) {
      setMembers([]);
      setInvites([]);
      setLimits({});
      setCurrentUserRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [profilesResponse, rolesResponse, invitesResponse, gestores, funcionarios, clientes] = await Promise.all([
        supabase.from('profiles').select('user_id, nome, email').eq('company_id', company.id),
        supabase.from('user_roles').select('user_id, role').eq('company_id', company.id),
        (supabase as any)
          .from('company_user_invites')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false }),
        checkLimit('gestores'),
        checkLimit('funcionarios'),
        checkLimit('clientes'),
      ]);

      const { data: profiles, error: profilesError } = profilesResponse;
      const { data: roles, error: rolesError } = rolesResponse;
      const { data: inviteData, error: invitesError } = invitesResponse;

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;
      if (invitesError) throw invitesError;

      const roleMap = new Map<string, string>();
      roles?.forEach((roleEntry) => roleMap.set(roleEntry.user_id, roleEntry.role));

      const viewerRole = roles?.find((roleEntry) => roleEntry.user_id === user?.id)?.role ?? null;
      setCurrentUserRole(viewerRole);

      setMembers(
        (profiles || []).map((profile) => ({
          user_id: profile.user_id,
          nome: profile.nome,
          email: profile.email,
          status: 'ativo',
          role: roleMap.get(profile.user_id) || 'funcionario',
        }))
      );

      setInvites((inviteData as Invite[]) || []);
      setLimits({
        gestores: { current: gestores.current, limit: gestores.limit },
        funcionarios: { current: funcionarios.current, limit: funcionarios.limit },
        clientes: { current: clientes.current, limit: clientes.limit },
      });
    } catch (error: any) {
      console.error('Erro ao carregar equipe', error);
      toast.error(error?.message || 'Erro ao carregar equipe');
      setMembers([]);
      setInvites([]);
      setCurrentUserRole(null);
    } finally {
      setLoading(false);
    }
  }, [company, checkLimit, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Invite ---
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Informe o email');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-company-user', {
        body: { nome: inviteNome, email: inviteEmail.trim().toLowerCase(), role: inviteRole },
      });
      if (error) { toast.error(error.message || 'Erro ao enviar convite'); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      toast.success('Convite enviado com sucesso!');
      setModalOpen(false);
      setInviteNome('');
      setInviteEmail('');
      setInviteRole('funcionario');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar convite');
    } finally {
      setSending(false);
    }
  };

  // --- Edit Role ---
  const openEditRole = (member: TeamMember) => {
    setEditTarget(member);
    setNewRole(member.role);
    setEditRoleOpen(true);
  };

  const handleEditRole = async () => {
    if (!editTarget) return;
    setSavingRole(true);
    try {
      const { error } = await (supabase as any).rpc('update_company_user_role', {
        _target_user_id: editTarget.user_id,
        _new_role: newRole,
      });
      if (error) { toast.error(error.message || 'Erro ao alterar função'); return; }
      toast.success('Função alterada com sucesso');
      setEditRoleOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar função');
    } finally {
      setSavingRole(false);
    }
  };

  // --- Remove User ---
  const openRemoveUser = (member: TeamMember) => {
    setRemoveTarget(member);
    setRemoveOpen(true);
  };

  const handleRemoveUser = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const { error } = await (supabase as any).rpc('remove_company_user', {
        _target_user_id: removeTarget.user_id,
      });
      if (error) { toast.error(error.message || 'Erro ao remover usuário'); return; }
      toast.success('Usuário removido com sucesso');
      setRemoveOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover usuário');
    } finally {
      setRemoving(false);
    }
  };

  // --- Cancel Invite ---
  const openCancelInvite = (invite: Invite) => {
    setCancelTarget(invite);
    setCancelInviteOpen(true);
  };

  const handleCancelInvite = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { error } = await (supabase as any)
        .from('company_user_invites')
        .update({ status: 'cancelled' })
        .eq('id', cancelTarget.id);
      if (error) { toast.error(error.message || 'Erro ao cancelar convite'); return; }
      toast.success('Convite cancelado');
      setCancelInviteOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cancelar convite');
    } finally {
      setCancelling(false);
    }
  };

  // --- Check if current user is gestor/admin ---
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isManager =
    currentUserRole === 'gestor' ||
    currentUserRole === 'admin' ||
    currentMember?.role === 'gestor' ||
    currentMember?.role === 'admin';

  const LimitCard = ({
    label,
    icon: Icon,
    resource,
  }: {
    label: string;
    icon: any;
    resource: string;
  }) => {
    const data = limits[resource];
    const isUnlimited = plan?.ilimitado || data?.limit === -1;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.current ?? '—'}
            {!isUnlimited && data && (
              <span className="text-sm font-normal text-muted-foreground"> / {data.limit}</span>
            )}
          </div>
          {!isUnlimited && data && data.limit > 0 && data.current >= data.limit && (
            <p className="text-xs text-destructive mt-1">Limite atingido</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Nenhuma empresa vinculada.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie os membros da {company.nome}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <LimitCard label="Gestores" icon={ShieldCheck} resource="gestores" />
        <LimitCard label="Funcionários" icon={HardHat} resource="funcionarios" />
        <LimitCard label="Clientes" icon={UserCheck} resource="clientes" />
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros Atuais
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
                  {isManager && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
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
                    {isManager && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditRole(m)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar função
                            </DropdownMenuItem>
                            {m.user_id !== user?.id && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openRemoveUser(m)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover usuário
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Convites Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum convite pendente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Data</TableHead>
                  {isManager && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.nome || '—'}</TableCell>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[inv.role] || 'outline'}>
                        {roleLabels[inv.role] || inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openCancelInvite(inv)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
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
              <Input id="invite-nome" value={inviteNome} onChange={(e) => setInviteNome(e.target.value)} placeholder="Nome do convidado" />
            </div>
            <div>
              <Label htmlFor="invite-email">Email *</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
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

      {/* Edit Role Modal */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Função</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Alterar função de <strong>{editTarget?.nome || editTarget?.email}</strong>
          </p>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="funcionario">Funcionário</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditRole} disabled={savingRole}>
              {savingRole && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Confirm */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.nome || removeTarget?.email}</strong> da empresa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Confirm */}
      <AlertDialog open={cancelInviteOpen} onOpenChange={setCancelInviteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite</AlertDialogTitle>
            <AlertDialogDescription>
              Cancelar o convite enviado para <strong>{cancelTarget?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvite} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
