import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ListTodo, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tarefas")({
  component: TasksPage,
});

type TaskStatus = "pendente" | "em_andamento" | "concluida";
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
  adotado_id: string;
  company_id: string;
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const STATUS_CLS: Record<TaskStatus, string> = {
  pendente: "bg-muted text-card-foreground",
  em_andamento: "bg-primary/30 text-primary-foreground",
  concluida: "bg-primary text-primary-foreground",
};

function TasksPage() {
  const { profile, loading } = useAuth();
  if (loading || !profile) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Carregando...</div>;
  }
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ListTodo className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tarefas</p>
          <h1 className="font-serif text-3xl">{profile.role === "empresa" ? "Tarefas atribuídas" : "Minhas tarefas"}</h1>
        </div>
      </div>
      {profile.role === "empresa" ? <EmpresaTasks /> : <AdotadoTasks />}
    </main>
  );
}

function AdotadoTasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("adotado_id", user.id).order("created_at", { ascending: false });
    setTasks((data ?? []) as Task[]);
  };
  useEffect(() => { load(); }, [user]);

  if (!profile?.company_id) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-10 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted text-card-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <p className="mt-4 font-serif text-2xl text-card-foreground">Adoção pendente</p>
        <p className="mt-1 text-sm text-card-foreground/70">As tarefas ficarão disponíveis após uma empresa adotar você.</p>
      </div>
    );
  }

  const setStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      {tasks.length === 0 ? (
        <p className="text-sm text-card-foreground/70">Nenhuma tarefa atribuída ainda.</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{t.title}</p>
                    <Badge className={STATUS_CLS[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                  {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <Select value={t.status} onValueChange={(v) => setStatus(t.id, v as TaskStatus)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmpresaTasks() {
  const { user } = useAuth();
  const [adotados, setAdotados] = useState<{ id: string; full_name: string }[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [adotado, setAdotado] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: profs }, { data: ts }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("company_id", user.id).order("full_name"),
      supabase.from("tasks").select("*").eq("company_id", user.id).order("created_at", { ascending: false }),
    ]);
    setAdotados((profs ?? []) as any);
    setTasks((ts ?? []) as Task[]);
  };
  useEffect(() => { load(); }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.object({
      title: z.string().min(2).max(160),
      adotado: z.string().uuid(),
    }).safeParse({ title: title.trim(), adotado });
    if (!parsed.success) return toast.error("Preencha aluno e título");
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      company_id: user!.id,
      adotado_id: adotado,
      title: title.trim(),
      description: description.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada");
    setTitle(""); setDescription("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const nameMap = new Map(adotados.map((a) => [a.id, a.full_name]));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-medium text-card-foreground">Nova tarefa</h2>
        <form onSubmit={create} className="mt-4 space-y-3">
          <div className="text-card-foreground">
            <Label >Aluno</Label>
            <Select value={adotado} onValueChange={setAdotado}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {adotados.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-card-foreground">
            <Label htmlFor="t" >Título</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
          </div>
          <div className="text-card-foreground">
            <Label htmlFor="d" >Descrição</Label>
            <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
          </div>
          <Button type="submit" disabled={busy || adotados.length === 0} className="w-full">
            {busy ? "Criando..." : "Criar tarefa"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-medium text-card-foreground">Tarefas ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p className="mt-4 text-sm text-card-foreground/70">Nenhuma tarefa ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tasks.map((t) => (
              <li key={t.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{t.title}</p>
                      <Badge className={STATUS_CLS[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Para: {nameMap.get(t.adotado_id) ?? "—"} · {new Date(t.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    {t.description && <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(t.id)}>Excluir</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
