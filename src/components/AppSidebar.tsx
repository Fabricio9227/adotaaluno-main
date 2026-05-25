import { Link, useRouter } from "@tanstack/react-router";
import { Home, LogOut, ListTodo, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();

  const hasGoogle = !!user?.identities?.some((i) => i.provider === "google");

  const connectGoogle = async () => {
    if (hasGoogle) return toast.info("Conta Google já conectada");
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: window.location.origin + "/dashboard" },
      } as any);
      if (error) {
        // Fallback: trigger OAuth sign-in via Lovable
        await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin + "/dashboard",
        });
      }
    } catch {
      toast.error("Não foi possível conectar ao Google");
    }
  };

  return (
      <Sidebar collapsible="icon" className="bg-black text-white">
      <SidebarHeader>
        {state === "collapsed" ? (
            <span className="grid h-9 w-9 place-items-center rounded-full ">
              <SidebarTrigger />
            </span>
        ) : (
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full ">
              <SidebarTrigger />
            </span>
          </div>


        )}
      </SidebarHeader>

      <SidebarContent>
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
                    <ListTodo className="h-4 w-4" />
                    <span>Tarefas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                
                onClick={connectGoogle}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84c.87-2.6 3.3-4.5 6.16-4.5z"/></svg>
                  <span className="hover:text-gray-400 transition-colors">{hasGoogle ? "Google conectado" : "Conectar Google"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                className="hover:text-destructive transition-colors" 
                  onClick={async () => {
                    await signOut();
                    router.navigate({ to: "/" });
                    
                  }}
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
