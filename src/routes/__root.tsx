import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Adota Aluno — Sistema de Adoção" },
      { name: "description", content: "Plataforma de adoção de alunos: empresas apoiam, alunos crescem." },
      { property: "og:title", content: "Adota Aluno — Sistema de Adoção" },
      { name: "twitter:title", content: "Adota Aluno — Sistema de Adoção" },
      { property: "og:description", content: "Plataforma de adoção de alunos: empresas apoiam, alunos crescem." },
      { name: "twitter:description", content: "Plataforma de adoção de alunos: empresas apoiam, alunos crescem." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/233132d4-fe51-49b7-be73-66b9cc8a4f5a/id-preview-9f1668c9--3025ac93-4ba6-4ef8-8154-e80b72f66172.lovable.app-1779203955683.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/233132d4-fe51-49b7-be73-66b9cc8a4f5a/id-preview-9f1668c9--3025ac93-4ba6-4ef8-8154-e80b72f66172.lovable.app-1779203955683.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
links: [
  { rel: "stylesheet", href: appCss },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Poppins:wght@400;500;600;700&display=swap",
  },
  { rel: "icon", href: "/logo-adote-colleger.png" },
],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            const t = localStorage.getItem('theme');
            if (t === 'light') document.documentElement.classList.remove('dark');
            else document.documentElement.classList.add('dark');
          })();
        `}} />
      </head>
      <body suppressHydrationWarning={true}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const router = useRouter();
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved !== "light";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
          aria-label="Alternar tema"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}