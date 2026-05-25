import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="border-b border-border bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-serif text-xl">Adota Aluno</span>
        </Link>
        <nav className="flex items-center gap-3">
          {user && profile ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile.full_name} · {profile.role === "empresa" ? "Empresa" : "Adotado"}
              </span>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Painel</Button>
              </Link>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/" });
                }}
              >
                Sair
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Entrar</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
