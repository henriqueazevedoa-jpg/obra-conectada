import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, CreditCard, Puzzle, Shield, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const adminLinks = [
  { to: '/admin/companies', label: 'Empresas', icon: Building2 },
  { to: '/admin/plans', label: 'Planos', icon: CreditCard },
  { to: '/admin/addons', label: 'Add-ons', icon: Puzzle },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Admin Sidebar */}
      <aside className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <Shield className="h-5 w-5 text-sidebar-primary" />
          <span className="text-sm font-bold text-sidebar-primary-foreground">Admin</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {adminLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === link.to
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/painel"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Sistema
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8 max-w-6xl overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
