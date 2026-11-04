import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  MonitorPlay,
  Images,
  ListOrdered,
  CalendarClock,
  FileBarChart,
  Settings,
  Users,
  LogOut,
  Menu,
  Wallet,
  KanbanSquare,
} from "lucide-react";
import { canSeeFinance, canUseSales, canManageUsers, useMyRoles } from "@/lib/my-role";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/painel", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/painel/telas", label: "Telas", icon: MonitorPlay, exact: false },
  { to: "/painel/anuncios", label: "Anúncios", icon: Images, exact: false },
  { to: "/painel/playlists", label: "Playlists", icon: ListOrdered, exact: false },
  { to: "/painel/agendamentos", label: "Agendamentos", icon: CalendarClock, exact: false },
  { to: "/painel/funil", label: "Funil de Vendas", icon: KanbanSquare, exact: false },
  { to: "/painel/relatorios", label: "Relatórios", icon: FileBarChart, exact: false },
  { to: "/painel/financeiro", label: "Financeiro", icon: Wallet, exact: false },
  { to: "/painel/usuarios", label: "Usuários", icon: Users, exact: false },
  { to: "/painel/configuracoes", label: "Configurações", icon: Settings, exact: false },
] as const;

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const roles = useMyRoles().data ?? [];
  const visibleNav = nav.filter((item) =>
    item.to === "/painel/financeiro" ? canSeeFinance(roles)
    : item.to === "/painel/funil" ? canUseSales(roles)
    : item.to === "/painel/usuarios" ? canManageUsers(roles)
    : true,
  );

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: "" }, replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6">
          <BrandLogo className="h-9 w-auto max-w-[10.5rem]" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary",
              }}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-start gap-3 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{title}</h1>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
