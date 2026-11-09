import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import telahubLogo from "@/assets/telahub-logo-oficial.png.asset.json";
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
  head: ({ params }) => ({
    meta: [
      { title: "TelaHUB — Exibição" },
      { name: "description", content: "Exibição em tela cheia dos anúncios programados para esta tela." },
      { property: "og:title", content: "TelaHUB — Exibição" },
      { property: "og:description", content: "Exibição em tela cheia dos anúncios desta tela." },
      { name: "theme-color", content: "#040c0b" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
      { name: "apple-mobile-web-app-title", content: "TelaHUB" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      {
        rel: "manifest",
        href: `/api/public/player-manifest?code=${encodeURIComponent(params.code)}`,
      },
      { rel: "apple-touch-icon", href: "/icons/telahub-192.png" },
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
  const [currentPlayKey, setCurrentPlayKey] = useState<string | null>(null);
  const [previousItem, setPreviousItem] = useState<PlayableItem | null>(null);
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const [previousPlayKey, setPreviousPlayKey] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPlayLogsRef = useRef<Array<{ screenId: string; mediaId: string }>>([]);
  const isFlushingLogsRef = useRef(false);
  const logRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparedPlayRef = useRef<string | null>(null);

  const { data } = useQuery<PlayerData>({
    queryKey: ["player", code],
    // TV boxes (WebView) podem reportar a página como oculta/offline;
    // força a atualização periódica mesmo assim.
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    networkMode: "always",
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
    const id = window.setInterval(() => void beat(), 15_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [data?.screen?.code]);

  // Atualização em tempo real quando o admin publica ou reordena
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    const subscribe = () => {
      if (!alive) return;
      channel = supabase
        .channel(`player-${code}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "media" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "playlist_items" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "screens" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, refresh)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") refresh();
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") && alive && !retry) {
            const old = channel;
            channel = null;
            if (old) void supabase.removeChannel(old);
            retry = setTimeout(() => {
              retry = null;
              subscribe();
            }, 5_000);
          }
        });
    };
    subscribe();
    // Recarrega a página a cada 6 h para pegar novas versões do player
    const reload = setTimeout(() => window.location.reload(), 6 * 60 * 60 * 1000);
    return () => {
      alive = false;
      if (retry) clearTimeout(retry);
      clearTimeout(reload);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [code, refresh]);

  // Reconexão automática após queda de internet
  useEffect(() => {
    const onOnline = () => refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  // Detecta nova versão publicada e recarrega sozinho (evita rodar código antigo em cache)
  useEffect(() => {
    const collectAssets = (doc: Document) =>
      Array.from(doc.querySelectorAll("script[src], link[rel=stylesheet]"))
        .map((el) => el.getAttribute("src") ?? el.getAttribute("href"))
        .filter(Boolean)
        .sort()
        .join("|");

    const checkForUpdate = async () => {
      try {
        const res = await fetch(window.location.href, { cache: "no-store" });
        if (!res.ok) return;
        const html = await res.text();
        const incoming = collectAssets(new DOMParser().parseFromString(html, "text/html"));
        const current = collectAssets(document);
        if (incoming && current && incoming !== current) window.location.reload();
      } catch {
        // sem rede agora — tenta de novo no próximo ciclo
      }
    };

    const interval = window.setInterval(checkForUpdate, 10 * 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
      setCurrentPlayKey(null);
      setPreviousItem(null);
      setPreviousUrl(null);
      setPreviousPlayKey(null);
      preparedPlayRef.current = null;
      return;
    }
    const playKey = `${index}:${current.itemId}:${current.media.id}`;
    if (preparedPlayRef.current === playKey) return;
    preparedPlayRef.current = playKey;

    const loadUrl = isDynamicMedia(current.media)
      ? Promise.resolve<string | null>("dynamic")
      : current.media.type === "image"
        ? loadCachedImage(current.media.storage_path)
        : getSignedUrl(current.media.storage_path);
    loadUrl.then((value) => {
      // Ignora apenas se outro item já assumiu; refetch não cancela o carregamento
      if (preparedPlayRef.current !== playKey) return;
      setPreviousItem(currentItem);
      setPreviousUrl(currentUrl);
      setPreviousPlayKey(currentPlayKey);
      setCurrentItem(current);
      setCurrentUrl(value);
      setCurrentPlayKey(playKey);
    });
  }, [current, currentItem, currentPlayKey, currentUrl, index]);

  // Pré-carrega o próximo item (link + arquivo da imagem) para a troca ser imediata
  useEffect(() => {
    if (queue.length < 2) return;
    // Próximo primeiro, depois o restante da grade em segundo plano
    let cancelled = false;
    void (async () => {
      for (let i = 1; i <= queue.length && !cancelled; i++) {
        const item = queue[(currentIndex + i) % queue.length];
        if (!item || isDynamicMedia(item.media)) continue;
        if (item.media.type === "image") await loadCachedImage(item.media.storage_path);
        else await getSignedUrl(item.media.storage_path);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queue, currentIndex]);

  // Tempo de exibição: começa só quando o item está carregado e visível,
  // e depende apenas da chave estável (refetch não reinicia o cronômetro)
  const visibleType = currentItem?.media.type;
  const visibleDuration = currentItem?.media.duration;
  const defaultDuration = settings?.default_duration;
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!currentPlayKey || !visibleType) return;
    if (visibleType === "video") return;
    const seconds = visibleDuration || defaultDuration || 10;
    timerRef.current = setTimeout(advance, Math.max(1, seconds) * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayKey, advance]);

  const flushPlayLogs = useCallback(async () => {
    if (isFlushingLogsRef.current || pendingPlayLogsRef.current.length === 0) return;
    isFlushingLogsRef.current = true;

    while (pendingPlayLogsRef.current.length > 0) {
      const pending = pendingPlayLogsRef.current[0];
      if (!pending) break;
      const { error } = await supabase.from("play_logs").insert({
        screen_id: pending.screenId,
        media_id: pending.mediaId,
      });
      if (error) break;
      pendingPlayLogsRef.current.shift();
    }

    isFlushingLogsRef.current = false;
    if (pendingPlayLogsRef.current.length > 0 && !logRetryRef.current) {
      logRetryRef.current = setTimeout(() => {
        logRetryRef.current = null;
        void flushPlayLogs();
      }, 5_000);
    }
  }, []);

  // Registra somente quando a imagem carregou ou o vídeo começou a tocar.
  // Falhas ficam na fila e continuam sendo reenviadas mesmo após a troca do anúncio.
  const recordPresentedMedia = useCallback((mediaId: string) => {
    const screenId = data?.screen?.id;
    if (!screenId) return;
    pendingPlayLogsRef.current.push({ screenId, mediaId });
    void flushPlayLogs();
  }, [data?.screen?.id, flushPlayLogs]);

  useEffect(() => () => {
    if (logRetryRef.current) clearTimeout(logRetryRef.current);
  }, []);

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

  const [viewportLandscape, setViewportLandscape] = useState(false);
  useEffect(() => {
    const update = () => setViewportLandscape(window.innerWidth > window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
    setPreviousPlayKey(null);
  }

  const manualRotation = data?.screen?.rotation;
  const degrees =
    manualRotation ?? (data?.screen?.orientation === "vertical" && viewportLandscape ? 90 : 0);
  const sideways = degrees === 90 || degrees === 270;
  const rotate = degrees !== 0;
  return (
    <div
      onClick={goFullscreen}
      className={`fixed flex cursor-none items-center justify-center overflow-hidden ${sideways ? "" : "inset-0"}`}
      style={
        sideways
          ? {
              backgroundColor: background,
              top: "50%",
              left: "50%",
              width: "100vh",
              height: "100vw",
              transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
            }
          : rotate
            ? { backgroundColor: background, transform: `rotate(${degrees}deg)` }
            : { backgroundColor: background }
      }
    >
      <div className="absolute inset-x-0 top-0 bottom-11 overflow-hidden md:bottom-14">
        {previousItem && previousUrl && previousPlayKey && (
          <MediaElement
            key={`previous-${previousPlayKey}`}
            item={previousItem}
            url={previousUrl}
            animation={exitAnimation}
            advance={advance}
            fill={data?.screen?.orientation === "vertical"}
            onAnimationEnd={onExitEnd}
          />
        )}
        {currentItem && currentUrl && currentPlayKey ? (
          <MediaElement
            key={`current-${currentPlayKey}`}
            item={currentItem}
            url={currentUrl}
            animation={animation}
            advance={advance}
            fill={data?.screen?.orientation === "vertical"}
            onPresented={recordPresentedMedia}
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

const MEDIA_CACHE = "telahub-media-v1";
const blobUrls = new Map<string, Promise<string | null>>();

/**
 * Baixa a imagem por completo (com cache persistente no aparelho, chaveado pelo
 * caminho do arquivo), decodifica e devolve um endereço local. Assim a imagem
 * nunca aparece "aos poucos" e as próximas voltas não dependem da internet.
 */
function loadCachedImage(path: string): Promise<string | null> {
  const existing = blobUrls.get(path);
  if (existing) return existing;
  const promise = (async () => {
    const key = `https://cache.telahub.local/${encodeURIComponent(path)}`;
    let blob: Blob | null = null;
    let cache: Cache | null = null;
    try {
      if (typeof caches !== "undefined") {
        cache = await caches.open(MEDIA_CACHE);
        const hit = await cache.match(key);
        if (hit) blob = await hit.blob();
      }
    } catch {
      cache = null;
    }
    if (!blob) {
      const signed = await getSignedUrl(path);
      if (!signed) return null;
      try {
        const res = await fetch(signed);
        if (!res.ok) return signed;
        blob = await res.blob();
        if (cache) void cache.put(key, new Response(blob)).catch(() => undefined);
      } catch {
        await preloadImage(signed);
        return signed;
      }
    }
    const local = URL.createObjectURL(blob);
    await preloadImage(local);
    return local;
  })();
  blobUrls.set(path, promise);
  promise.then((v) => {
    if (!v) blobUrls.delete(path);
  });
  return promise;
}

const preloadedImages = new Map<string, Promise<void>>();

/** Baixa e decodifica a imagem antes de exibi-la (máx. 4 s de espera). */
function preloadImage(url: string): Promise<void> {
  const cached = preloadedImages.get(url);
  if (cached) return cached;
  const promise = new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    const timeout = setTimeout(done, 20_000);
    img.onload = () => {
      clearTimeout(timeout);
      if (img.decode) img.decode().then(done, done);
      else done();
    };
    img.onerror = () => {
      clearTimeout(timeout);
      preloadedImages.delete(url);
      done();
    };
    img.src = url;
  });
  preloadedImages.set(url, promise);
  if (preloadedImages.size > 50) {
    const first = preloadedImages.keys().next().value;
    if (first) preloadedImages.delete(first);
  }
  return promise;
}

function MediaElement({
  item,
  url,
  animation,
  advance,
  onAnimationEnd,
  onPresented,
  fill = false,
}: {
  fill?: boolean;
  item: PlayableItem;
  url: string;
  animation: string;
  advance: () => void;
  onAnimationEnd?: () => void;
  onPresented?: (mediaId: string) => void;
}) {
  const hasReportedRef = useRef(false);
  const reportPresented = () => {
    if (hasReportedRef.current || !onPresented) return;
    hasReportedRef.current = true;
    onPresented(item.media.id);
  };

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

  const isVideo = item.media.type === "video";
  return (
    <div
      key={item.itemId}
      className={`absolute inset-0 h-full w-full overflow-hidden bg-black ${animation}`}
      onAnimationEnd={onAnimationEnd}
    >
      {!isVideo && (
        <img
          src={url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
        />
      )}
      {isVideo ? (
        <video
          src={url}
          className={`absolute inset-0 h-full w-full ${fill ? "object-cover" : "object-contain"}`}
          autoPlay
          muted
          playsInline
          onPlaying={reportPresented}
          onEnded={advance}
          onError={advance}
        />
      ) : (
        <img
          src={url}
          alt=""
          decoding="async"
          className={`absolute inset-0 h-full w-full ${fill ? "object-cover" : "object-contain"}`}
          onLoad={reportPresented}
          onError={advance}
        />
      )}
    </div>
  );
}
