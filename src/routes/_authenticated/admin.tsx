import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, Building2, ExternalLink, Eye, Phone, MapPin, Hash, Calendar, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type PendingCompany = {
  id: string;
  full_name: string;
  cnpj: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  created_at: string;
};

function CompanyDetailModal({
  company,
  open,
  onClose,
  onDecide,
  busy,
  showActions,
}: {
  company: PendingCompany | null;
  open: boolean;
  onClose: () => void;
  onDecide: (id: string, approve: boolean) => Promise<void>;
  busy: string | null;
  showActions: boolean;
}) {
  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-0 overflow-hidden">
        {/* Header colorido */}
        <div className="bg-primary/10 border-b border-border px-6 py-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground shrink-0">
            <Building2 className="h-5 w-5" />
          </span>
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-bold leading-tight text-foreground">
              {company.full_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Detalhes da empresa</p>
          </DialogHeader>
        </div>

        {/* Corpo com informações */}
        <div className="px-6 py-5 space-y-3">
          {company.cnpj && (
            <InfoRow icon={<Hash className="h-4 w-4" />} label="CNPJ" value={company.cnpj} />
          )}
          {company.phone && (
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={company.phone} />
          )}
          {company.address && (
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Endereço" value={company.address} />
          )}
          {company.website && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-muted-foreground shrink-0">
                <Globe className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Site</p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                >
                  {company.website}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>
          )}
          <InfoRow
            icon={<Calendar className="h-4 w-4" />}
            label="Data de cadastro"
            value={new Date(company.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />

          {/* Campos ausentes */}
          {!company.cnpj && !company.phone && !company.address && !company.website && (
            <p className="text-sm text-muted-foreground italic">Nenhuma informação adicional cadastrada.</p>
          )}
        </div>

        {/* Ações */}
        {showActions && (
          <div className="flex gap-2 border-t border-border px-6 py-4 bg-background">
            <Button
              className="flex-1"
              onClick={async () => {
                await onDecide(company.id, true);
                onClose();
              }}
              disabled={busy === company.id}
            >
              <Check className="mr-1.5 h-4 w-4" /> Aprovar empresa
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={async () => {
                await onDecide(company.id, false);
                onClose();
              }}
              disabled={busy === company.id}
            >
              <X className="mr-1.5 h-4 w-4" /> Rejeitar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function AdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && (profile as any).role !== "admin") navigate({ to: "/dashboard" });
  }, [profile]);

  const [pending, setPending] = useState<PendingCompany[]>([]);
  const [approved, setApproved] = useState<PendingCompany[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Modal state
  const [selectedCompany, setSelectedCompany] = useState<PendingCompany | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalShowActions, setModalShowActions] = useState(false);

  const openModal = (company: PendingCompany, showActions: boolean) => {
    setSelectedCompany(company);
    setModalShowActions(showActions);
    setModalOpen(true);
  };

  const load = async () => {
    const [{ data: pend }, { data: appr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, cnpj, phone, website, address, created_at")
        .eq("role", "empresa")
        .eq("approved", false)
        .order("created_at"),
      supabase
        .from("profiles")
        .select("id, full_name, cnpj, phone, website, address, created_at")
        .eq("role", "empresa")
        .eq("approved", true)
        .order("created_at", { ascending: false }),
    ]);
    setPending((pend ?? []) as PendingCompany[]);
    setApproved((appr ?? []) as PendingCompany[]);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, approve: boolean): Promise<void> => {
    setBusy(id);
    const { error } = await supabase
      .from("profiles")
      .update({ approved: approve })
      .eq("id", id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approve ? "Empresa aprovada!" : "Empresa rejeitada.");
    load();
  };

  if ((profile as any)?.role !== "admin") return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      {/* Título */}
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="font-bold text-3xl">Painel de aprovação</h1>
        </div>
      </div>

      {/* Empresas aguardando aprovação */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-medium text-white">
            Empresas aguardando aprovação ({pending.length})
          </h2>
          {pending.length > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-400">
              {pending.length} pendente{pending.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa aguardando aprovação.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-foreground">{c.full_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.cnpj && <span>🏢 {c.cnpj}</span>}
                      {c.phone && <span>📞 {c.phone}</span>}
                      {c.address && <span>📍 {c.address}</span>}
                    </div>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> {c.website}
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Cadastro:{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {/* Botão Ver detalhes */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openModal(c, true)}
                    >
                      <Eye className="mr-1 h-4 w-4" /> Ver
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => decide(c.id, true)}
                      disabled={busy === c.id}
                    >
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => decide(c.id, false)}
                      disabled={busy === c.id}
                    >
                      <X className="mr-1 h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Empresas já aprovadas */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-medium mb-4 text-white">
          Empresas aprovadas ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-white">Nenhuma empresa aprovada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {approved.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{c.full_name}</p>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {c.cnpj && <span>{c.cnpj}</span>}
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Botão Ver detalhes (aprovadas - sem ações de aprovar/rejeitar) */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openModal(c, false)}
                  >
                    <Eye className="mr-1 h-3 w-3" /> Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => decide(c.id, false)}
                    disabled={busy === c.id}
                  >
                    <X className="mr-1 h-3 w-3" /> Revogar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal de detalhes */}
      <CompanyDetailModal
        company={selectedCompany}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDecide={decide}
        busy={busy}
        showActions={modalShowActions}
      />
    </main>
  );
}