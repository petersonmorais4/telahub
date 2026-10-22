import { supabase } from "@/integrations/supabase/client";

import type { Json } from "@/integrations/supabase/types";

export type MediaType = "image" | "video" | "weather" | "market";

export interface MediaRow {
  id: string;
  title: string;
  type: MediaType;
  storage_path: string;
  duration: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  content_config: Json;
}

export function isDynamicMedia(media: Pick<MediaRow, "type">): boolean {
  return media.type === "weather" || media.type === "market";
}

export interface PlaylistRow {
  id: string;
  name: string;
  loop: boolean;
  created_at: string;
}

export interface PlaylistItemRow {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
}

export interface ScreenRow {
  id: string;
  name: string;
  code: string;
  location: string | null;
  playlist_id: string | null;
  status: string;
  last_seen: string | null;
  created_at: string;
}

export interface ScheduleRow {
  id: string;
  name: string | null;
  playlist_id: string | null;
  media_id: string | null;
  weekdays: number[];
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface SettingsRow {
  id: number;
  company_name: string;
  logo_url: string | null;
  player_bg: string;
  transition: string;
  default_duration: number;
  idle_message: string;
  weather_city: string;
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const MEDIA_BUCKET = "media";

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/** Links temporários para arquivos do armazenamento privado, com cache. */
export async function getSignedUrl(path: string, ttlSeconds = 60 * 60 * 6): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) return null;

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return data.signedUrl;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function withinDateRange(media: MediaRow, now: Date): boolean {
  const today = now.toISOString().slice(0, 10);
  if (media.start_date && today < media.start_date) return false;
  if (media.end_date && today > media.end_date) return false;
  return true;
}

export function scheduleMatches(schedule: ScheduleRow, now: Date): boolean {
  if (!schedule.active) return false;
  if (!schedule.weekdays?.includes(now.getDay())) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(schedule.start_time);
  const end = toMinutes(schedule.end_time);
  if (start <= end) return minutes >= start && minutes <= end;
  // janela que cruza a meia-noite
  return minutes >= start || minutes <= end;
}

export interface PlayableItem {
  itemId: string;
  media: MediaRow;
}

/** Aplica ativação, período de veiculação e agendamentos. */
export function buildPlaylistQueue(
  items: PlaylistItemRow[],
  mediaById: Map<string, MediaRow>,
  schedules: ScheduleRow[],
  playlistId: string | null,
  now: Date = new Date(),
): PlayableItem[] {
  const playlistSchedules = schedules.filter((s) => s.playlist_id && s.playlist_id === playlistId);
  if (playlistSchedules.length > 0 && !playlistSchedules.some((s) => scheduleMatches(s, now))) {
    return [];
  }

  return [...items]
    .sort((a, b) => a.position - b.position)
    .flatMap<PlayableItem>((item) => {
      const media = mediaById.get(item.media_id);
      if (!media || isDynamicMedia(media) || !media.active || !withinDateRange(media, now)) return [];
      const mediaSchedules = schedules.filter((s) => s.media_id === media.id);
      if (mediaSchedules.length > 0 && !mediaSchedules.some((s) => scheduleMatches(s, now))) return [];
      return [{ itemId: item.id, media }];
    });
}

export function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 45 * 1000;
}
