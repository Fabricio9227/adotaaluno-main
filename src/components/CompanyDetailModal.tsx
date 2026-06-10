import { 
  Building2, Hash, Phone, MapPin, Globe, 
  ExternalLink, Calendar, Check, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";

// Importe o tipo que acabamos de exportar (ajuste o caminho do arquivo conforme a sua estrutura)
import type { PendingCompany } from "@/routes/_authenticated/admin.tsx"; 

// Recriei o InfoRow aqui para o componente funcionar de forma independente
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  );
}

export function CompanyDetailModal({
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
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-lg font-bold leading-tight text-white">
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
                  className="inline-flex items-center gap-1 text-sm text-white hover:text-gray-300 hover:underline break-all"
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
            <p className="text-sm text-white/70 italic">Nenhuma informação adicional cadastrada.</p>
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