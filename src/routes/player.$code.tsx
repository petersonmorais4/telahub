import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import {
  buildPlaylistQueue,
  getSignedUrl,
  type MediaRow,
  type PlaylistItemRow,
  type PlaylistRow,
  type ScheduleRow,
  type ScreenRow,
  type SettingsRow,
} from "@/lib/signage";

export const Route = createFileRoute("/player/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Player — SinalIndoor" },
      { name: "description", content: "Exibição em tela cheia dos anúncios programados para esta tela." },
      { property: "og:title", content: "Player — SinalIndoor" },
      { property: "og:description", content: "Exibição em tela cheia dos anúncios desta tela." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayerPage,
});

interface PlayerData {
  screen: ScreenRow | null;
  playlist: PlaylistRow | null;
  items: PlaylistItemRow[];
  media: MediaRow[];
  schedules: ScheduleRow[];
  settings: SettingsRow | null;
}

function PlayerPage() {
  const { code } = Route.useParams();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = useQuery<PlayerData>({
    queryKey: ["player", code],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: true,
    queryFn: async () => {
      const screenRes = await supabase.from("screens").select("*").eq("code", code).maybeSingle();
      const screen = (screenRes.data ?? null) as ScreenRow | null;

      const [playlistRes, itemsRes, mediaRes, schedulesRes, settingsRes] = await Promise.all([
        screen?.playlist_id
          ? supabase.from("playlists").select("*").eq("id", screen.playlist_id).maybeSingle()
          : Promise.resolve({ data: null }),
        screen?.playlist_id
          ? supabase.from("playlist_items").select("*").eq("playlist_id", screen.playlist_id).order("position")
          : Promise.resolve({ data: [] }),
        supabase.from("media").select("*"),
        supabase.from("schedules").select("*"),
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      ]);

      return {
        screen,
        playlist: (playlistRes.data ?? null) as PlaylistRow | null,
        items: (itemsRes.data ?? []) as PlaylistItemRow[],
        media: (mediaRes.data ?? []) as MediaRow[],
        schedules: (schedulesRes.data ?? []) as ScheduleRow[],
        settings: (settingsRes.data ?? null) as SettingsRow | null,
      };
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["player", code] });
  }, [queryClient, code]);

  // Reavalia agendamentos a cada 30s sem recarregar a página
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 100000), 30_000);
    return () => clearInterval(id);
  }, []);

  // Batimento: marca a tela como online
  useEffect(() => {
    let cancelled = false;
    const beat = () => {
      if (!cancelled) void supabase.rpc("touch_screen", { p_code: code });
    };
    beat();
    const id = setInterval(beat, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [code]);

  // Atualização em tempo real quando o admin publica ou reordena
  useEffect(() => {
    const channel = supabase
      .channel(`player-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "media" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_items" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "screens" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [code, refresh]);

  // Reconexão automática após queda de internet
  useEffect(() => {
    const onOnline = () => refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const queue = useMemo(() => {
    if (!data) return [];
    const mediaById = new Map(data.media.map((m) => [m.id, m]));
    return buildPlaylistQueue(
      data.items,
      mediaById,
      data.schedules,
      data.screen?.playlist_id ?? null,
      new Date(),
    );
    // tick força reavaliação periódica dos horários
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tick]);

  const currentIndex = queue.length > 0 ? index % queue.length : 0;
  const current = queue[currentIndex] ?? null;
  const settings = data?.settings ?? null;

  const advance = useCallback(() => {
    setIndex((prev) => prev + 1);
  }, []);

  // Link temporário do arquivo atual
  useEffect(() => {
    if (!current) {
      setUrl(null);
      return;
    }
    let alive = true;
    getSignedUrl(current.media.storage_path).then((value) => {
      if (alive) setUrl(value);
    });
    return () => {
      alive = false;
    };
  }, [current]);

  // Pré-carrega o link do próximo item
  useEffect(() => {
    if (queue.length < 2) return;
    const next = queue[(currentIndex + 1) % queue.length];
    if (next) void getSignedUrl(next.media.storage_path);
  }, [queue, currentIndex]);

  // Tempo de exibição das imagens
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!current || queue.length === 0) return;
    if (current.media.type === "video") return;
    const seconds = current.media.duration || settings?.default_duration || 10;
    timerRef.current = setTimeout(advance, Math.max(1, seconds) * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, queue.length, advance, settings?.default_duration]);

  // Histórico de exibições
  useEffect(() => {
    if (!current || !data?.screen) return;
    void supabase
      .from("play_logs")
      .insert({ screen_id: data.screen.id, media_id: current.media.id });
  }, [current, data?.screen]);

  // Logo para a tela padrão
  useEffect(() => {
    const path = settings?.logo_url;
    if (!path) {
      setLogoUrl(null);
      return;
    }
    let alive = true;
    getSignedUrl(path).then((value) => {
      if (alive) setLogoUrl(value);
    });
    return () => {
      alive = false;
    };
  }, [settings?.logo_url]);

  const background = settings?.player_bg || "#000000";
  const animation = settings?.transition === "slide" ? "signage-slide-in" : "signage-fade-in";

  function goFullscreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
  }

  return (
    <div
      onClick={goFullscreen}
      className="fixed inset-0 flex cursor-none items-center justify-center overflow-hidden"
      style={{ backgroundColor: background }}
    >
      {current && url ? (
        current.media.type === "video" ? (
          <video
            key={`${current.itemId}-${currentIndex}`}
            src={url}
            className={`h-full w-full object-contain ${animation}`}
            autoPlay
            muted
            playsInline
            onEnded={advance}
            onError={advance}
          />
        ) : (
          <img
            key={`${current.itemId}-${currentIndex}`}
            src={url}
            alt=""
            className={`h-full w-full object-contain ${animation}`}
            onError={advance}
          />
        )
      ) : (
        <div className="flex flex-col items-center gap-6 px-10 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="max-h-[40vh] max-w-[60vw] object-contain" />
          ) : (
            <p className="font-display text-5xl font-bold text-white/90">
              {settings?.company_name ?? "SinalIndoor"}
            </p>
          )}
          <p className="text-2xl text-white/60">
            {data && !data.screen
              ? "Tela não encontrada"
              : (settings?.idle_message ?? "Em breve novos conteúdos")}
          </p>
        </div>
      )}
    </div>
  );
}
