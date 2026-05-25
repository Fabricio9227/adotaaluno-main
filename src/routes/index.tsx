import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { TIER_META } from "@/components/TierBadge";
import { Clock, HandHeart, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
              Plataforma de impacto educacional
            </span>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-6xl">
              Empresas que adotam.
              <br />
              Alunos que florescem.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Conecte sua empresa a estudantes, classifique apoios em níveis
              Bronze, Prata, Ouro e Diamante, e acompanhe horas de estágio
              voluntário em um só lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Começar agora</Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline">Como funciona</Button>
              </a>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <p className="mb-4 text-sm font-medium text-muted-foreground">Níveis de apoio</p>
            <div className="grid gap-3">
              {(Object.keys(TIER_META) as Array<keyof typeof TIER_META>).map((k) => {
                const m = TIER_META[k];
                const Icon = m.icon;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${m.color}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.range}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { icon: HandHeart, title: "Cadastre-se", text: "Empresa ou aluno adotado — escolha seu perfil ao criar a conta." },
            { icon: TrendingUp, title: "Envie sua renda", text: "O aluno informa a renda e o sistema classifica automaticamente." },
            { icon: Clock, title: "Conte as horas", text: "A empresa registra horas de estágio voluntário dos seus adotados." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-serif text-2xl text-white">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground bg-black">
        © {new Date().getFullYear()} Adota Aluno
      </footer>
    </div>
  );
}
