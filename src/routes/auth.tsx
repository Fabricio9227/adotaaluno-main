import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  role: z.enum(["empresa", "adotado"]),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="font-serif text-4xl">Bem-vindo</h1>
        <p className="mt-1 text-muted-foreground">Entre ou crie sua conta para começar.</p>

        <Tabs defaultValue="login" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login"><LoginForm /></TabsContent>
          <TabsContent value="signup"><SignupForm /></TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="underline">Voltar</Link>
        </p>
      </main>
    </div>
  );
}

async function googleSignIn() {
  try {
    // BIZU: Usamos o supabase direto, já que você está rodando local no VS Code!
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Redireciona de volta para a sua Home local limpa
        redirectTo: window.location.origin, 
      },
    });
    
    if (error) {
      toast.error(`Erro no Supabase: ${error.message}`);
    }
  } catch (err) {
    toast.error("Erro inesperado na autenticação local");
  }
}

function GoogleButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button 
      type="button" 
      variant="outline" 
      className="w-full" 
      onClick={async () => {
        if (onClick) {
          onClick();
        } else {
          await googleSignIn();
        }
      }}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84c.87-2.6 3.3-4.5 6.16-4.5z"/>
      </svg>
      {label}
    </Button>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
  };

  return (
    <div className="mt-6 space-y-4">
      <GoogleButton 
      label="Entrar com Google"
      />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

function SignupForm() {
  const [role, setRole] = useState<"empresa" | "adotado">("adotado");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ full_name: fullName, email, password, role });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      role === "adotado"
        ? "Conta criada! Você está na lista de espera para ser adotado."
        : "Conta criada! Verifique seu e-mail para confirmar.",
    );
  };

  return (
    <div className="mt-6 space-y-4">
      <GoogleButton label="Cadastrar com Google" />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Sou</Label>
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="adotado">Aluno Adotado</SelectItem>
              <SelectItem value="empresa">Empresa</SelectItem>
            </SelectContent>
          </Select>
          {role === "adotado" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Você entrará na lista de espera. Uma empresa poderá adotá-lo.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="name">{role === "empresa" ? "Nome da empresa" : "Nome completo"}</Label>
          <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="email2">E-mail</Label>
          <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
        </div>
        <div>
          <Label htmlFor="pwd2">Senha</Label>
          <Input id="pwd2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Criando..." : "Criar conta"}
        </Button>
      </form>
    </div>
  );
}
