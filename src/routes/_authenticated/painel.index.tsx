import { formatScreenAddress } from "@/lib/address";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MonitorPlay, Images, ListOrdered, Radio, Percent } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDateTime,
  isOnline,
  type MediaRow,
  type PlaylistRow,
  type ScreenRow,
} from "@/lib/signage";
import { Button } from "@/components/ui/button";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { useWebMCP } from "use-webmcp-tool";

export const Route = createFileRoute("/_authenticated/painel/")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Dashboard" },
      { name: "description", content: "Visão geral das telas ativas, anúncios no ar e exibições recentes." },
      { property: "og:title", content: "TelaHUB — Dashboard" },
      { property: "og:description", content: "Visão geral das telas, anúncios e exibições." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

interface LogRow {
  id: string;
  played_at: string;
  media: { title: string } | null;
  screens: { name: string } | null;
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [screens, media, playlists, logs] = await Promise.all([
        supabase.from("screens").select("*"),
        supabase.from("media").select("*"),
        supabase.from("playlists").select("*"),
        supabase
          .from("play_logs")
          .select("id, played_at, media(title), screens(name)")
          .order("played_at", { ascending: false })
          .limit(15),
      ]);
      return {
        screens: (screens.data ?? []) as ScreenRow[],
        media: (media.data ?? []) as MediaRow[],
        playlists: (playlists.data ?? []) as PlaylistRow[],
        logs: (logs.data ?? []) as unknown as LogRow[],
      };
    },
  });

  useWebMCP({
    name: "list_screens_status",
    description: "List the screens currently shown on the dashboard with online/offline status.",
    annotations: { readOnlyHint: true },
    execute: () =>
      runWebMCPTool("list_screens_status", () => {
        const items = data?.screens ?? [];
        if (items.length === 0) return "Nenhuma tela cadastrada ainda.";
        return items
          .map((s) => `${s.name} (${formatScreenAddress(s) || "Sem local"}) — ${isOnline(s.last_seen) ? "Online" : "Offline"}`)
          .join("\n");
      }),
  });

  const today = new Date().toISOString().slice(0, 10);
  const activeMedia = (data?.media ?? []).filter(
    (m) =>
      m.active &&
      (!m.start_date || m.start_date <= today) &&
      (!m.end_date || m.end_date >= today),
  );
  const onlineScreens = (data?.screens ?? []).filter((s) => isOnline(s.last_seen));

  const totalScreens = data?.screens.length ?? 0;
  const onlinePct = totalScreens ? Math.round((onlineScreens.length / totalScreens) * 100) : 0;
  const sortedScreens = [...(data?.screens ?? [])].sort(
    (a, b) => Number(isOnline(b.last_seen)) - Number(isOnline(a.last_seen)),
  );

  const cards = [
    { label: "Telas cadastradas", value: data?.screens.length ?? 0, icon: MonitorPlay },
    { label: "Telas online agora", value: onlineScreens.length, icon: Radio },
    { label: "Telas ligadas agora (%)", value: `${onlinePct}%`, icon: Percent },
    { label: "Anúncios no ar", value: activeMedia.length, icon: Images },
    { label: "Playlists", value: data?.playlists.length ?? 0, icon: ListOrdered },
  ];

  return (
    <AdminShell
      title="Dashboard"
      description="Como está a sua rede de telas neste momento."
      actions={
        <Button asChild variant="outline">
          <Link to="/painel/telas">Ver telas</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">
              {isLoading ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-base font-semibold">Telas</h2>
          <ul className="mt-4 divide-y divide-border">
            {sortedScreens.map((screen) => (
              <li key={screen.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{screen.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatScreenAddress(screen) || "Sem local"} · Última sincronização:{" "}
                    {formatDateTime(screen.last_seen)}
                  </p>
                </div>
                <span
                  className={
                    isOnline(screen.last_seen)
                      ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {isOnline(screen.last_seen) ? "Online" : "Offline"}
                </span>
              </li>
            ))}
            {!isLoading && (data?.screens.length ?? 0) === 0 ? (
              <li className="py-6 text-sm text-muted-foreground">
                Nenhuma tela cadastrada ainda.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="text-base font-semibold">Últimas exibições</h2>
          <ul className="mt-4 divide-y divide-border">
            {(data?.logs ?? []).map((log) => (
              <li key={log.id} className="flex items-center justify-between py-3 text-sm">
                <span className="truncate">{log.media?.title ?? "Anúncio removido"}</span>
                <span className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {log.screens?.name ?? "—"} · {formatDateTime(log.played_at)}
                </span>
              </li>
            ))}
            {!isLoading && (data?.logs.length ?? 0) === 0 ? (
              <li className="py-6 text-sm text-muted-foreground">
                As exibições aparecem aqui assim que um player entrar no ar.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
