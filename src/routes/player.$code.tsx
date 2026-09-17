import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import telahubLogo from "@/assets/telahub-logo.png.asset.json";
import { DynamicMedia } from "@/components/DynamicMedia";
import { LiveInfoFooter } from "@/components/LiveInfoFooter";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPlaylistQueue,
  getSignedUrl,
  isDynamicMedia,
  type MediaRow,
  type PlayableItem,
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
      { title: "TelaHUB — Exibição" },
      { name: "description", content: "Exibição em tela cheia dos anúncios programados para esta tela." },
      { property: "og:title", content: "TelaHUB — Exibição" },
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
  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [previousItem, setPreviousItem] = useState<PlayableItem | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoggedPlayRef = useRef<string | null>(null);

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
    const screenCode = data?.screen?.code;
    if (!screenCode) return;

    let active = true;
    const beat = async () => {
      if (!active) return;
      await supabase.rpc("touch_screen", { p_code: screenCode });
    };
    void beat();
    const id = window.setInterval(() => void beat(), 30_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [data?.screen?.code]);

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

  // Carrega URL do item atual e inicia crossfade quando pronto
  useEffect(() => {
    if (!current) {
      setCurrentItem(null);
      setCurrentUrl(null);
      setPreviousItem(null);
      setPreviousUrl(null);
      return;
    }
    if (currentItem?.itemId === current.itemId) return;

    let alive = true;
    const loadUrl = isDynamicMedia(current.media)
      ? Promise.resolve("dynamic")
      : getSignedUrl(current.media.storage_path);
    loadUrl.then((value) => {
      if (!alive) return;
      setPreviousItem(currentItem);
      setPreviousUrl(currentUrl);
      setCurrentItem(current);
      setCurrentUrl(value);
    });
    return () => {
      alive = false;
    };
  }, [current, currentItem, currentUrl]);

  // Pré-carrega o link do próximo item para evitar espera na transição
  useEffect(() => {
    if (queue.length < 2) return;
    const next = queue[(currentIndex + 1) % queue.length];
    if (next && !isDynamicMedia(next.media)) void getSignedUrl(next.media.storage_path);
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

  // Histórico de exibições: registra quando o conteúdo efetivamente fica pronto.
  // Em uma falha temporária, tenta novamente sem exigir recarregar o player.
  useEffect(() => {
    if (!currentItem || !currentUrl || !data?.screen) return;

    const screenId = data.screen.id;
    const playKey = `${screenId}:${index}:${currentItem.itemId}:${currentItem.media.id}`;
    if (lastLoggedPlayRef.current === playKey) return;
    lastLoggedPlayRef.current = playKey;
    let active = true;
    let retryId: ReturnType<typeof setTimeout> | null = null;
    const recordPlay = async () => {
      const { error } = await supabase.from("play_logs").insert({
        screen_id: screenId,
        media_id: currentItem.media.id,
      });
      if (error && active) {
        retryId = setTimeout(() => void recordPlay(), 5_000);
      }
    };

    void recordPlay();
    return () => {
      active = false;
      if (retryId) clearTimeout(retryId);
    };
  }, [currentItem, currentUrl, data?.screen, index]);

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

  const exitAnimation = settings?.transition === "slide" ? "signage-slide-out" : "signage-fade-out";

  function onExitEnd() {
    setPreviousItem(null);
    setPreviousUrl(null);
  }

  return (
    <div
      onClick={goFullscreen}
      className="fixed inset-0 flex cursor-none items-center justify-center overflow-hidden"
      style={{ backgroundColor: background }}
    >
      <div className="absolute inset-x-0 top-0 bottom-11 overflow-hidden md:bottom-14">
        {previousItem && previousUrl && (
          <MediaElement
            item={previousItem}
            url={previousUrl}
            animation={exitAnimation}
            advance={advance}
            onAnimationEnd={onExitEnd}
          />
        )}
        {currentItem && currentUrl ? (
          <MediaElement
            item={currentItem}
            url={currentUrl}
            animation={animation}
            advance={advance}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-10 text-center">
            {!data || queue.length > 0 ? (
              <img
                src={telahubLogo.url}
                alt="TelaHUB"
                className="max-h-[40vh] max-w-[60vw] object-contain"
              />
            ) : logoUrl ? (
              <img src={logoUrl} alt="" className="max-h-[40vh] max-w-[60vw] object-contain" />
            ) : (
              <p className="font-display text-5xl font-bold text-white/90">
                {settings?.company_name ?? "TelaHUB"}
              </p>
            )}
            <p className="text-2xl text-white/60">
              {!data
                ? "Carregando conteúdo"
                : !data.screen
                  ? "Tela não encontrada"
                  : queue.length === 0
                    ? (settings?.idle_message ?? "Em breve novos conteúdos")
                    : "Carregando conteúdo"}
            </p>
          </div>
        )}
      </div>
      <LiveInfoFooter city={data ? settings?.weather_city?.trim() || "São Paulo" : null} />
    </div>
  );
}

function MediaElement({
  item,
  url,
  animation,
  advance,
  onAnimationEnd,
}: {
  item: PlayableItem;
  url: string;
  animation: string;
  advance: () => void;
  onAnimationEnd?: () => void;
}) {
  if (isDynamicMedia(item.media)) {
    return (
      <div
        key={item.itemId}
        className={`absolute inset-0 h-full w-full ${animation}`}
        onAnimationEnd={onAnimationEnd}
      >
        <DynamicMedia media={item.media} />
      </div>
    );
  }

  return item.media.type === "video" ? (
    <video
      key={item.itemId}
      src={url}
      className={`absolute inset-0 h-full w-full object-cover ${animation}`}
      autoPlay
      muted
      playsInline
      onEnded={advance}
      onError={advance}
      onAnimationEnd={onAnimationEnd}
    />
  ) : (
    <img
      key={item.itemId}
      src={url}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover ${animation}`}
      onError={advance}
      onAnimationEnd={onAnimationEnd}
    />
  );
}
