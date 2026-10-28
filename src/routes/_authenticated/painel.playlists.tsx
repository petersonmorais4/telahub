import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isDynamicMedia, type MediaRow, type PlaylistItemRow, type PlaylistRow, type ScreenRow } from "@/lib/signage";

function mediaKind(media: MediaRow | undefined) {
  if (!media) return "";
  if (media.type === "video") return "Vídeo completo";
  if (media.type === "weather") return `Clima · ${media.duration}s`;
  if (media.type === "market") return `Ibovespa · ${media.duration}s`;
  if (media.type === "news") return `Notícias G1 · ${media.duration}s`;
  return `Imagem · ${media.duration}s`;
}

export const Route = createFileRoute("/_authenticated/painel/playlists")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Playlists" },
      {
        name: "description",
        content: "Monte listas de reprodução ordenáveis, defina loop contínuo e vincule às telas.",
      },
      { property: "og:title", content: "TelaHUB — Playlists" },
      { property: "og:description", content: "Listas de reprodução ordenáveis para as telas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addMediaId, setAddMediaId] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["playlists-page"],
    queryFn: async () => {
      const [playlists, items, media, screens] = await Promise.all([
        supabase.from("playlists").select("*").order("created_at"),
        supabase.from("playlist_items").select("*").order("position"),
        supabase.from("media").select("*").order("created_at", { ascending: false }),
        supabase.from("screens").select("*").order("name"),
      ]);
      return {
        playlists: (playlists.data ?? []) as PlaylistRow[],
        items: (items.data ?? []) as PlaylistItemRow[],
        media: (media.data ?? []) as MediaRow[],
        screens: (screens.data ?? []) as ScreenRow[],
      };
    },
  });

  const playlists = data?.playlists ?? [];
  const current = playlists.find((p) => p.id === selected) ?? playlists[0] ?? null;
  const mediaById = new Map((data?.media ?? []).map((m) => [m.id, m]));
  const items = (data?.items ?? [])
    .filter((item) => item.playlist_id === current?.id)
    .sort((a, b) => a.position - b.position);
  const linkedScreens = (data?.screens ?? []).filter((s) => s.playlist_id === current?.id);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["playlists-page"] });

  const createPlaylist = useMutation({
    mutationFn: async () => {
      const { data: created, error } = await supabase
        .from("playlists")
        .insert({ name: newName.trim() })
        .select("id")
        .single();
      if (error) throw error;
      return created.id as string;
    },
    onSuccess: (id) => {
      setNewName("");
      setSelected(id);
      toast.success("Playlist criada");
      invalidate();
    },
    onError: (error: Error) => toast.error("Não foi possível criar", { description: error.message }),
  });

  const updatePlaylist = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<PlaylistRow> }) => {
      const { error } = await supabase.from("playlists").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deletePlaylist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      toast.success("Playlist removida");
      invalidate();
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!current || !addMediaId) return;
      const { error } = await supabase.from("playlist_items").insert({
        playlist_id: current.id,
        media_id: addMediaId,
        position: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddMediaId("");
      invalidate();
    },
    onError: (error: Error) => toast.error("Não foi possível adicionar", { description: error.message }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (ordered: PlaylistItemRow[]) => {
      await Promise.all(
        ordered.map((item, index) =>
          supabase.from("playlist_items").update({ position: index }).eq("id", item.id),
        ),
      );
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error("Não foi possível reordenar", { description: error.message }),
  });

  const linkScreen = useMutation({
    mutationFn: async ({ screenId, playlistId }: { screenId: string; playlistId: string | null }) => {
      const { error } = await supabase
        .from("screens")
        .update({ playlist_id: playlistId })
        .eq("id", screenId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    if (moved) next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    reorder.mutate(next);
  }

  return (
    <AdminShell
      title="Playlists"
      description="Arraste os itens para definir a ordem de exibição."
    >
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="panel p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Suas playlists
          </h2>
          <ul className="mt-3 space-y-1">
            {playlists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  onClick={() => setSelected(playlist.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    current?.id === playlist.id && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {playlist.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Label htmlFor="nova-playlist">Nova playlist</Label>
            <div className="flex gap-2">
              <Input
                id="nova-playlist"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Campanha de manhã"
              />
              <Button
                size="icon"
                onClick={() => createPlaylist.mutate()}
                disabled={!newName.trim() || createPlaylist.isPending}
                aria-label="Criar playlist"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}

          {current ? (
            <>
              <div className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{current.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {items.length} {items.length === 1 ? "item" : "itens"} · vinculada a{" "}
                      {linkedScreens.length} {linkedScreens.length === 1 ? "tela" : "telas"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      Loop contínuo
                      <Switch
                        checked={current.loop}
                        onCheckedChange={(checked) =>
                          updatePlaylist.mutate({ id: current.id, values: { loop: checked } })
                        }
                        aria-label="Loop contínuo"
                      />
                    </label>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Remover playlist"
                      onClick={() => deletePlaylist.mutate(current.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Select value={addMediaId} onValueChange={setAddMediaId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Escolher anúncio" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.media ?? []).filter((media) => !isDynamicMedia(media)).map((media) => (
                        <SelectItem key={media.id} value={media.id}>
                          {media.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addItem.mutate()} disabled={!addMediaId}>
                    Adicionar à playlist
                  </Button>
                </div>
              </div>

              <ul className="panel divide-y divide-border">
                {items.map((item, index) => {
                  const media = mediaById.get(item.media_id);
                  return (
                    <li
                      key={item.id}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOverIndex(index);
                      }}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4",
                        overIndex === index && dragIndex !== null && "bg-muted",
                      )}
                    >
                      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                      <span className="w-6 text-sm text-muted-foreground">{index + 1}</span>
                      {media ? (
                        <MediaPreview media={media} className="h-14 w-24 rounded" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{media?.title ?? "Anúncio removido"}</p>
                        <p className="text-xs text-muted-foreground">
                           {mediaKind(media)}
                          {media && !media.active ? " · pausado" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Retirar da playlist"
                        onClick={() => removeItem.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  );
                })}
                {items.length === 0 ? (
                  <li className="p-6 text-sm text-muted-foreground">
                    Adicione anúncios para montar a sequência.
                  </li>
                ) : null}
              </ul>

              <div className="panel p-5">
                <h3 className="text-base font-semibold">Telas que exibem esta playlist</h3>
                <ul className="mt-3 space-y-2">
                  {(data?.screens ?? []).map((screen) => {
                    const linked = screen.playlist_id === current.id;
                    return (
                      <li key={screen.id} className="flex items-center justify-between text-sm">
                        <span>
                          {screen.name}
                          <span className="ml-2 text-xs text-muted-foreground">{screen.location}</span>
                        </span>
                        <Switch
                          checked={linked}
                          onCheckedChange={(checked) =>
                            linkScreen.mutate({
                              screenId: screen.id,
                              playlistId: checked ? current.id : null,
                            })
                          }
                          aria-label={`Vincular ${screen.name}`}
                        />
                      </li>
                    );
                  })}
                  {(data?.screens.length ?? 0) === 0 ? (
                    <li className="text-sm text-muted-foreground">Nenhuma tela cadastrada ainda.</li>
                  ) : null}
                </ul>
              </div>
            </>
          ) : (
            !isLoading && (
              <p className="text-sm text-muted-foreground">
                Crie a primeira playlist ao lado para começar.
              </p>
            )
          )}
        </section>
      </div>
    </AdminShell>
  );
}
