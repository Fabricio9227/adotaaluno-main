import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TierBadge, TIER_META, type Tier } from "@/components/TierBadge";
import { Clock, DollarSign, Users, FileText, Check, X, Paperclip, Camera, MessageSquare, Send, Lock, HandHeart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const MONTHLY_HOURS_GOAL = 24;

type SubmissionStatus = "pendente" | "aprovado" | "rejeitado";

const ACCEPTED_EXT = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
const ACCEPT_ATTR = ".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILE_MB = 5;

function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return <div className="mx-auto max-w-6xl px-6 py-10 text-muted-foreground">Carregando perfil...</div>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          {profile.role === "empresa" ? "Painel da Empresa" : "Painel do Adotado"}
        </p>
        <h1 className="font-serif text-4xl">Olá, {profile.full_name}</h1>
      </div>
      {profile.role === "empresa" ? <EmpresaView /> : <AdotadoView />}
    </main>
  );
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map = {
    pendente: { label: "Pendente", className: "bg-muted text-foreground" },
    aprovado: { label: "Aprovado", className: "bg-primary text-primary-foreground" },
    rejeitado: { label: "Rejeitado", className: "bg-destructive text-destructive-foreground" },
  } as const;
  return <Badge className={map[status].className}>{map[status].label}</Badge>;
}

/* ---------------- Adotado ---------------- */

type Income = {
  id: string;
  amount: number;
  tier: Tier;
  submitted_at: string;
  status: SubmissionStatus;
  document_url: string | null;
};
type Hour = { id: string; hours: number; description: string | null; logged_at: string };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Message = {
  id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

function AdotadoView() {
  const { user, profile, refreshProfile } = useAuth();
  const isAdopted = !!profile?.company_id;
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: inc }, { data: hrs }, { data: msgs }] = await Promise.all([
      supabase.from("income_submissions").select("id, amount, tier, submitted_at, status, document_url").eq("user_id", user.id).order("submitted_at", { ascending: false }),
      supabase.from("volunteer_hours").select("*").eq("adotado_id", user.id).order("logged_at", { ascending: false }),
      supabase.from("messages").select("id, content, created_at, read_at").eq("adotado_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setIncomes((inc ?? []) as Income[]);
    setHours((hrs ?? []) as Hour[]);
    setMessages((msgs ?? []) as Message[]);

    const unread = (msgs ?? []).filter((m: any) => !m.read_at).map((m: any) => m.id);
    if (unread.length) {
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
    }
  };

  useEffect(() => { load(); }, [user]);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) {
      toast.error("Use uma imagem PNG, JPEG ou WEBP.");
      return;
    }
    if (f.size > 3 * 1024 * 1024) return toast.error("Imagem maior que 3MB.");
    setUploadingAvatar(true);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, f, { contentType: f.type, upsert: true });
    if (upErr) { setUploadingAvatar(false); return toast.error("Falha no upload: " + upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploadingAvatar(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Foto atualizada!");
  };

  const currentMonth = monthKey(new Date());
  const thisMonthSubmission = incomes.find(
    (i) => monthKey(new Date(i.submitted_at)) === currentMonth,
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return setFile(null);
    const ok = ACCEPTED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      toast.error("Tipo inválido. Use PDF, DOC, PNG ou JPEG.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_FILE_MB}MB.`);
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const submitIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (thisMonthSubmission) return toast.error("Você já enviou sua renda deste mês.");
    const parsed = z.coerce.number().positive().max(10_000_000).safeParse(amount);
    if (!parsed.success) return toast.error("Informe um valor válido");
    if (!file) return toast.error("Anexe o comprovante de renda");

    setBusy(true);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("income-proofs")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });

    if (upErr) {
      setBusy(false);
      return toast.error("Falha no upload: " + upErr.message);
    }

    const { error } = await supabase.from("income_submissions").insert({
      user_id: user!.id,
      amount: parsed.data,
      tier: "bronze",
      document_url: path,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") return toast.error("Você já enviou sua renda deste mês.");
      return toast.error(error.message);
    }
    toast.success("Renda enviada para aprovação!");
    setAmount(""); setFile(null);
    (document.getElementById("proof-file") as HTMLInputElement | null)?.value &&
      ((document.getElementById("proof-file") as HTMLInputElement).value = "");
    load();
  };

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("income-proofs").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo.");
    window.open(data.signedUrl, "_blank");
  };

  const approvedTier = incomes.find((i) => i.status === "aprovado")?.tier;
  const totalHours = hours.reduce((s, h) => s + Number(h.hours), 0);
  const monthHours = hours
    .filter((h) => monthKey(new Date(h.logged_at)) === currentMonth)
    .reduce((s, h) => s + Number(h.hours), 0);
  const monthPct = Math.min(100, (monthHours / MONTHLY_HOURS_GOAL) * 100);
  const initials = (profile?.full_name ?? "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  if (!isAdopted) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-primary">
            <HandHeart className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-serif text-3xl text-card-foreground">Você está na lista de espera</h2>
          <p className="mt-2 text-card-foreground/70 max-w-md mx-auto">
            Seu perfil está visível para todas as empresas. Assim que uma empresa adotar você,
            seu painel completo será liberado com envio de renda, horas de estágio, recados e tarefas.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-card-foreground">
            <Lock className="h-4 w-4" /> Adoção pendente
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 opacity-60">
          <p className="text-sm text-card-foreground/70">
            Recursos bloqueados: envio de renda, categoria, horas mensais, recados e tarefas.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary/30">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name} />
              <AvatarFallback className="text-2xl font-serif bg-muted">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card transition hover:scale-105 disabled:opacity-60"
              aria-label="Trocar foto"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp"
              className="hidden" onChange={onAvatarChange}
            />
          </div>

          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Aluno adotado</p>
            <h2 className="font-serif text-3xl text-white">{profile?.full_name}</h2>
            <div className="mt-2">
              {approvedTier ? (
                <TierBadge tier={approvedTier} size="lg" />
              ) : (
                <span className="text-sm text-muted-foreground">— aguardando aprovação de categoria —</span>
              )}
            </div>
          </div>

          <div className="min-w-55 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground p-2">
                <Clock className="h-4 w-4" /> Estágio mensal
              </span>
              <span className="font-mono">{monthHours.toFixed(1)} / {MONTHLY_HOURS_GOAL}h</span>
            </div>
            <Progress value={monthPct} className="mt-3 h-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {monthPct >= 100 ? "Meta do mês concluída 🎉" : `Faltam ${(MONTHLY_HOURS_GOAL - monthHours).toFixed(1)}h para a meta`}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <h2 className="font-medium">Enviar renda mensal</h2>
        </div>

        {thisMonthSubmission ? (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Envio deste mês</p>
              <StatusBadge status={thisMonthSubmission.status} />
            </div>
            <p className="mt-2 text-2xl font-serif">R$ {Number(thisMonthSubmission.amount).toFixed(2)}</p>
            {thisMonthSubmission.document_url && (
              <Button
                type="button" variant="outline" size="sm" className="mt-3"
                onClick={() => openProof(thisMonthSubmission.document_url!)}
              >
                <FileText className="mr-2 h-4 w-4" /> Ver comprovante
              </Button>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Você poderá enviar uma nova renda no próximo mês.
            </p>
          </div>
        ) : (
          <form onSubmit={submitIncome} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="amt">Valor (R$)</Label>
              <Input
                id="amt" type="number" step="0.01" min="0" required
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="proof-file">Comprovante de renda</Label>
              <Input
                id="proof-file" type="file" required
                accept={ACCEPT_ATTR}
                onChange={onFileChange}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                <Paperclip className="mr-1 inline h-3 w-3" />
                PDF, DOC, PNG ou JPEG · até {MAX_FILE_MB}MB
              </p>
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Enviando..." : "Enviar para aprovação"}
            </Button>
          </form>
        )}

        <div className="mt-6 rounded-xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">Categoria aprovada</p>
          <div className="mt-2">
            {approvedTier ? <TierBadge tier={approvedTier} size="lg" /> : <span className="text-muted-foreground">— aguardando aprovação —</span>}
          </div>
          {approvedTier && (
            <p className="mt-3 text-xs text-muted-foreground">{TIER_META[approvedTier].range}</p>
          )}
        </div>

        {incomes.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Histórico</p>
            <ul className="space-y-2">
              {incomes.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <span>R$ {Number(i.amount).toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    {i.status === "aprovado" ? <TierBadge tier={i.tier} size="sm" /> : <StatusBadge status={i.status} />}
                    <span className="text-xs text-muted-foreground">{new Date(i.submitted_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <h2 className="font-medium">Horas de estágio voluntário</h2>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">Total acumulado</p>
          <p className="mt-2 font-serif text-5xl">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Registros recentes</p>
          {hours.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sua empresa ainda não registrou horas.</p>
          ) : (
            <ul className="space-y-2">
              {hours.slice(0, 6).map((h) => (
                <li key={h.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{Number(h.hours).toFixed(1)}h</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.logged_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {h.description && <p className="mt-1 text-xs text-muted-foreground">{h.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      </div>

    </div>
  );
}

/* ---------------- Empresa ---------------- */

type Adotado = { id: string; full_name: string };
type AdotadoStats = Adotado & { tier?: Tier; totalHours: number };
type PendingSubmission = {
  id: string;
  user_id: string;
  amount: number;
  tier: Tier;
  submitted_at: string;
  status: SubmissionStatus;
  document_url: string | null;
  full_name: string;
};

function EmpresaView() {
  const { user } = useAuth();
  const [adotados, setAdotados] = useState<AdotadoStats[]>([]);
  const [waiting, setWaiting] = useState<Adotado[]>([]);
  const [pending, setPending] = useState<PendingSubmission[]>([]);
  const [selected, setSelected] = useState("");
  const [hours, setHours] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgTo, setMsgTo] = useState("");
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: profs }, { data: wait }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("company_id", user.id),
      supabase.from("profiles").select("id, full_name").eq("role", "adotado").is("company_id", null).order("full_name"),
    ]);
    const list = (profs ?? []) as Adotado[];
    setWaiting((wait ?? []) as Adotado[]);

    const stats = await Promise.all(
      list.map(async (a) => {
        const [{ data: inc }, { data: hrs }] = await Promise.all([
          supabase.from("income_submissions").select("tier, submitted_at")
            .eq("user_id", a.id).eq("status", "aprovado")
            .order("submitted_at", { ascending: false }).limit(1),
          supabase.from("volunteer_hours").select("hours").eq("adotado_id", a.id),
        ]);
        return {
          ...a,
          tier: (inc?.[0]?.tier as Tier | undefined),
          totalHours: (hrs ?? []).reduce((s, h) => s + Number(h.hours), 0),
        };
      })
    );
    setAdotados(stats);

    const ids = list.map((a) => a.id);
    if (ids.length) {
      const { data: subs } = await supabase
        .from("income_submissions")
        .select("id, user_id, amount, tier, submitted_at, status, document_url")
        .in("user_id", ids)
        .eq("status", "pendente")
        .order("submitted_at", { ascending: false });
      const nameMap = new Map(list.map((a) => [a.id, a.full_name]));
      setPending(
        (subs ?? []).map((s: any) => ({ ...s, full_name: nameMap.get(s.user_id) ?? "—" }))
      );
    } else {
      setPending([]);
    }
  };

  useEffect(() => { load(); }, [user]);

  const decide = async (id: string, status: "aprovado" | "rejeitado") => {
    const { error } = await supabase
      .from("income_submissions")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "aprovado" ? "Renda aprovada" : "Renda rejeitada");
    load();
  };

  const openProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("income-proofs").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo.");
    window.open(data.signedUrl, "_blank");
  };

  const logHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return toast.error("Selecione um adotado");
    const parsed = z.coerce.number().positive().max(999).safeParse(hours);
    if (!parsed.success) return toast.error("Horas inválidas");
    setBusy(true);
    const { error } = await supabase.from("volunteer_hours").insert({
      adotado_id: selected,
      company_id: user!.id,
      hours: parsed.data,
      description: desc.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Horas registradas!");
    setHours(""); setDesc("");
    load();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTo) return toast.error("Selecione um adotado");
    const text = msgText.trim();
    if (text.length < 1 || text.length > 1000) return toast.error("Mensagem entre 1 e 1000 caracteres");
    setMsgBusy(true);
    const { error } = await supabase.from("messages").insert({
      company_id: user!.id, adotado_id: msgTo, content: text,
    });
    setMsgBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Recado enviado!");
    setMsgText("");
  };

  const adopt = async (adotadoId: string) => {
    if (!user) return;
    setAdopting(adotadoId);
    const { data, error } = await supabase
      .from("profiles")
      .update({ company_id: user.id })
      .eq("id", adotadoId)
      .is("company_id", null)
      .select("id");
    setAdopting(null);
    if (error) return toast.error(error.message);
    if (!data || data.length === 0) return toast.error("Outra empresa já adotou esse aluno.");
    toast.success("Aluno adotado!");
    load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-card-foreground/70">
          <HandHeart className="h-4 w-4" />
          <h2 className="font-medium">Lista de espera ({waiting.length})</h2>
        </div>
        {waiting.length === 0 ? (
          <p className="text-sm text-card-foreground/70">Nenhum aluno aguardando adoção no momento.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {waiting.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <span className="font-medium text-foreground">{a.full_name}</span>
                <Button size="sm" onClick={() => adopt(a.id)} disabled={adopting === a.id}>
                  <HandHeart className="mr-1 h-4 w-4" />
                  {adopting === a.id ? "Adotando..." : "Adotar"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <h2 className="font-medium">Aprovações de renda pendentes ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum envio aguardando aprovação.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {Number(p.amount).toFixed(2)} · sugestão <TierBadge tier={p.tier} size="sm" />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(p.submitted_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.document_url && (
                      <Button variant="outline" size="sm" onClick={() => openProof(p.document_url!)}>
                        <FileText className="mr-1 h-4 w-4" /> Comprovante
                      </Button>
                    )}
                    <Button size="sm" onClick={() => decide(p.id, "aprovado")}>
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decide(p.id, "rejeitado")}>
                      <X className="mr-1 h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <h2 className="font-medium">Alunos adotados ({adotados.length})</h2>
          </div>
          {adotados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum aluno se vinculou à sua empresa ainda.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-background text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Aluno</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3 text-right">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {adotados.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-white">{a.full_name}</td>
                      <td className="px-4 py-3">
                        {a.tier ? <TierBadge tier={a.tier} size="sm" /> : <span className="text-xs text-muted-foreground">sem categoria</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">{a.totalHours.toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <h2 className="font-medium">Registrar horas</h2>
          </div>
          <form onSubmit={logHours} className="space-y-3">
            <div className="text-muted-foreground">
              <Label>Adotado</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {adotados.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-muted-foreground">
              <Label htmlFor="h">Horas</Label>
              <Input id="h" type="number" step="0.5" min="0" required value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="text-muted-foreground">
              <Label htmlFor="d">Feedback (opcional)</Label>
              <Textarea id="d" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={3} />
            </div>
            <Button type="submit" disabled={busy || adotados.length === 0} className="w-full">
              {busy ? "Salvando..." : "Registrar horas"}
            </Button>
          </form>
        </section>
      </div>

      
    </div>
  );
}
