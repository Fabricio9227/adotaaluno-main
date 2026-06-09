import { Link, useRouter } from "@tanstack/react-router";
import { Home, LogOut, ListTodo, Bell, Clock, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar, SidebarTrigger,
} from "@/components/ui/sidebar";

type Notification = {
  id: string;
  message: string;
  at: string;
  read: boolean;
};

export function AppSidebar() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const [pendingCount, setPendingCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const hasGoogle = !!user?.identities?.some((i) => i.provider === "google");

  useEffect(() => {
    if (!user || !profile) return;

    const fetchAll = async () => {
      // Tarefas pendentes
      const taskQuery = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "concluida");

      if (profile.role === "adotado") taskQuery.eq("adotado_id", user.id);
      else taskQuery.eq("company_id", user.id);

      const { count } = await taskQuery;
      setPendingCount(count ?? 0);

      // Horas acumuladas (só para adotado)
      if (profile.role === "adotado") {
        const { data: hrs } = await supabase
          .from("volunteer_hours")
          .select("hours")
          .eq("adotado_id", user.id);
        const total = (hrs ?? []).reduce((acc, r) => acc + (r.hours ?? 0), 0);
        setTotalHours(total);
      }

      // Notificações: novas tarefas + tarefas vencendo
      const notifs: Notification[] = [];

      if (profile.role === "adotado") {
        // Tarefas atribuídas nos últimos 7 dias
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const { data: newTasks } = await supabase
          .from("tasks")
          .select("id, title, created_at")
          .eq("adotado_id", user.id)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false });

        (newTasks ?? []).forEach((t) => {
          notifs.push({
            id: `task-${t.id}`,
            message: `Nova tarefa: "${t.title}"`,
            at: t.created_at,
            read: false,
          });
        });

        // Tarefas vencendo nos próximos 2 dias
        const soon = new Date();
        soon.setDate(soon.getDate() + 2);
        const { data: dueTasks } = await supabase
          .from("tasks")
          .select("id, title, due_date")
          .eq("adotado_id", user.id)
          .neq("status", "concluida")
          .lte("due_date", soon.toISOString().split("T")[0])
          .gte("due_date", new Date().toISOString().split("T")[0]);

        (dueTasks ?? []).forEach((t) => {
          notifs.push({
            id: `due-${t.id}`,
            message: `⏰ Vencendo em breve: "${t.title}"`,
            at: t.due_date!,
            read: false,
          });
        });

        // Foi adotado recentemente (company_id preenchido)
        if (profile.company_id) {
  const { data: company } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", profile.company_id)
    .maybeSingle();
  const companyName = company?.full_name ?? "uma empresa";
  notifs.push({
    id: "adopted",
    message: `🎉 Você foi adotado por ${companyName}!`,
    at: new Date().toISOString(),
    read: false,
  });
}
      } else {
        // Empresa: tarefas vencendo nos próximos 2 dias
        const soon = new Date();
        soon.setDate(soon.getDate() + 2);
        const { data: dueTasks } = await supabase
          .from("tasks")
          .select("id, title, due_date")
          .eq("company_id", user.id)
          .neq("status", "concluida")
          .lte("due_date", soon.toISOString().split("T")[0])
          .gte("due_date", new Date().toISOString().split("T")[0]);

        (dueTasks ?? []).forEach((t) => {
          notifs.push({
            id: `due-${t.id}`,
            message: `⏰ Tarefa vencendo: "${t.title}"`,
            at: t.due_date!,
            read: false,
          });
        });
      }

      setNotifications(notifs);
    };

    fetchAll();
  }, [user, profile]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const connectGoogle = async () => {
    if (hasGoogle) return toast.info("Conta Google já conectada");
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin },
      } as any);
      if (error) {
        await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
      }
    } catch {
      toast.error("Não foi possível conectar ao Google");
    }
  };

  return (
    <Sidebar collapsible="icon" className="bg-black text-white h-full">
      {(profile?.role as string) === "admin" && (
  <SidebarMenuItem>
    <SidebarMenuButton asChild>
      <Link to="/admin" className="flex items-center gap-2 hover:text-primary transition-colors">
        <Building2 className="h-4 w-4" />
        <span>Painel Admin</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
      <SidebarHeader className="bg-black text-white">
        {collapsed ? (
          <span className="grid ml-0.5 h-6 w-6 place-items-center rounded-full">
            <SidebarTrigger />
          </span>
        ) : (
          <div className="flex items-center py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full">
              <SidebarTrigger />
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-black text-white">

  {/* PERFIL + HORAS — dentro de um grupo próprio */}
  {!collapsed && profile && (
    <SidebarGroup>
      <SidebarGroupContent>
        {/* card perfil */}
        <div className="mx-1 mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
            {profile.full_name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
            <p className="text-xs text-white/50">{profile.role === "adotado" ? "Aluno adotado" : "Empresa"}</p>
          </div>
        </div>

        {/* card horas — só adotado */}
        {profile.role === "adotado" && (
          <div className="mx-1 mb-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
              <Clock className="h-3 w-3" />
              <span>Horas acumuladas</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {totalHours.toFixed(1)}<span className="text-sm font-normal text-white/50 m-1">h</span>
            </p>
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )}

        {/* NAVEGAÇÃO */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" className="flex items-center gap-2 hover:text-primary transition-colors">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/tarefas" className="flex items-center gap-2 hover:text-primary transition-colors">
                    <span className="relative">
                      <ListTodo className="h-4 w-4" />
                      {pendingCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      )}
                    </span>
                    <span>Tarefas</span>
                    {pendingCount > 0 && !collapsed && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* NOTIFICAÇÕES */}
              <SidebarMenuItem>
                <SidebarMenuButton className="hover:text-primary transition-colors" onClick={() => { setShowNotifs((v) => !v); markAllRead(); }}>
                  <span className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-black leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  <span>Notificações</span>
                  {unreadCount > 0 && !collapsed && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1 text-[10px] font-bold text-black">
                      {unreadCount}
                    </span>
                  )}
                </SidebarMenuButton>

                {/* Dropdown de notificações */}
                {showNotifs && !collapsed && (
                  <div className="mx-2 mt-1 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-white/40">Nenhuma notificação.</p>
                    ) : (
                      <ul>
                        {notifications.map((n) => (
                          <li key={n.id} className="border-b border-white/5 last:border-0 px-3 py-2">
                            <p className="text-xs text-white/80">{n.message}</p>
                            <p className="text-[10px] text-white/30 mt-0.5">
                              {new Date(n.at).toLocaleDateString("pt-BR")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CONTA */}
        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={connectGoogle}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84c.87-2.6 3.3-4.5 6.16-4.5z"/></svg>
                  <span className="hover:text-gray-400 transition-colors">{hasGoogle ? "Google conectado" : "Conectar Google"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="hover:text-destructive transition-colors"
                  onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}
                >
                  <LogOut className="h-4 w-4" /><span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}