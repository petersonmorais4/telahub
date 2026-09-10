import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, isOnline, randomCode, type PlaylistRow, type ScreenRow } from "@/lib/signage";

export const Route = createFileRoute("/_authenticated/painel/telas")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Telas" },
      { name: "description", content: "Cadastre e acompanhe cada TV: código, local, playlist e status." },
      { property: "og:title", content: "TelaHUB — Telas" },
      { property: "og:description", content: "Gestão das telas físicas da rede de mídia indoor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TelasPage,
});

const NONE = "__none__";

function TelasPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [code, setCode] = useState(randomCode());
  const [playlistId, setPlaylistId] = useState<string>(NONE);

  const { data, isLoading } = useQuery({
    queryKey: ["telas"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [screens, playlists] = await Promise.all([
        supabase.from("screens").select("*").order("created_at", { ascending: false }),
        supabase.from("playlists").select("*").order("name"),
      ]);
      return {
        screens: (screens.data ?? []) as ScreenRow[],
        playlists: (playlists.data ?? []) as PlaylistRow[],
      };
    },
  });

  const createScreen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("screens").insert({
        name,
        location: location || null,
        code: code.trim().toUpperCase(),
        playlist_id: playlistId === NONE ? null : playlistId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tela cadastrada");
      setOpen(false);
      setName("");
      setLocation("");
      setCode(randomCode());
      setPlaylistId(NONE);
      queryClient.invalidateQueries({ queryKey: ["telas"] });
    },
    onError: (error: Error) => toast.error("Não foi possível salvar", { description: error.message }),
  });

  const updateScreen = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ScreenRow> }) => {
      const { error } = await supabase.from("screens").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["telas"] }),
    onError: (error: Error) => toast.error("Não foi possível atualizar", { description: error.message }),
  });

  const deleteScreen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("screens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tela removida");
      queryClient.invalidateQueries({ queryKey: ["telas"] });
    },
  });

  function playerUrl(screenCode: string) {
    if (typeof window === "undefined") return `/player/${screenCode}`;
    return `${window.location.origin}/player/${screenCode}`;
  }

  return (
    <AdminShell
      title="Telas"
      description="Cada tela tem um link público próprio para abrir na TV."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova tela
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova tela</DialogTitle>
              <DialogDescription>
                O código faz parte do link que você abre na TV.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-tela">Nome</Label>
                <Input
                  id="nome-tela"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Recepção principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="local-tela">Localização</Label>
                <Input
                  id="local-tela"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Térreo, hall de entrada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo-tela">Código único</Label>
                <div className="flex gap-2">
                  <Input
                    id="codigo-tela"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                  <Button type="button" variant="outline" onClick={() => setCode(randomCode())}>
                    Gerar
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Playlist</Label>
                <Select value={playlistId} onValueChange={setPlaylistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem playlist</SelectItem>
                    {(data?.playlists ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createScreen.mutate()}
                disabled={!name.trim() || !code.trim() || createScreen.isPending}
              >
                Salvar tela
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="panel divide-y divide-border">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : null}
        {(data?.screens ?? []).map((screen) => (
          <div key={screen.id} className="flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-48 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{screen.name}</p>
                <span
                  className={
                    isOnline(screen.last_seen)
                      ? "rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {isOnline(screen.last_seen) ? "Online" : "Offline"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {screen.location || "Sem local"} · Código{" "}
                <span className="font-mono font-medium text-foreground">{screen.code}</span> ·
                Sincronizou: {formatDateTime(screen.last_seen)}
              </p>
            </div>

            <div className="w-52">
              <Select
                value={screen.playlist_id ?? NONE}
                onValueChange={(value) =>
                  updateScreen.mutate({
                    id: screen.id,
                    values: { playlist_id: value === NONE ? null : value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem playlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem playlist</SelectItem>
                  {(data?.playlists ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Copiar link do player"
                onClick={() => {
                  navigator.clipboard.writeText(playerUrl(screen.code));
                  toast.success("Link copiado", { description: playerUrl(screen.code) });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild aria-label="Abrir player">
                <a href={`/player/${screen.code}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Remover tela"
                onClick={() => deleteScreen.mutate(screen.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && (data?.screens.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Cadastre a primeira tela para gerar o link do player.
          </p>
        ) : null}
      </div>
    </AdminShell>
  );
}
