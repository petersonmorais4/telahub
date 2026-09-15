import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CloudSun, ImageIcon, Plus, TrendingUp, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET, isDynamicMedia, type MediaRow, type MediaType, type SettingsRow } from "@/lib/signage";

export const Route = createFileRoute("/_authenticated/painel/anuncios")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Anúncios" },
      {
        name: "description",
        content: "Envie imagens e vídeos, defina duração, período de veiculação e ative ou pause cada anúncio.",
      },
      { property: "og:title", content: "TelaHUB — Anúncios" },
      { property: "og:description", content: "Biblioteca de anúncios em imagem e vídeo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnunciosPage,
});

function AnunciosPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creationType, setCreationType] = useState<"file" | "weather" | "market">("file");
  const [city, setCity] = useState("São Paulo");

  const { data, isLoading } = useQuery({
    queryKey: ["anuncios"],
    queryFn: async () => {
      const [media, settings] = await Promise.all([
        supabase.from("media").select("*").order("created_at", { ascending: false }),
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      return {
        media: (media.data ?? []) as MediaRow[],
        settings: (settings.data ?? null) as SettingsRow | null,
      };
    },
  });

  const defaultDuration = data?.settings?.default_duration ?? 10;

  const createMedia = useMutation({
    mutationFn: async () => {
      let type: MediaType;
      let path = "";
      let fallbackTitle = "";
      let contentConfig: { city?: string } = {};

      if (creationType === "file") {
        if (!file) throw new Error("Escolha um arquivo de imagem ou vídeo.");
        type = file.type.startsWith("video") ? "video" : "image";
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        path = `${crypto.randomUUID()}.${ext}`;
        fallbackTitle = file.name;
        setUploading(true);
        const upload = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
          cacheControl: "3600",
          contentType: file.type || "application/octet-stream",
        });
        setUploading(false);
        if (upload.error) throw upload.error;
      } else if (creationType === "weather") {
        if (city.trim().length < 2) throw new Error("Informe uma cidade válida.");
        type = "weather";
        path = `dynamic/weather/${crypto.randomUUID()}`;
        fallbackTitle = `Clima — ${city.trim()}`;
        contentConfig = { city: city.trim() };
      } else {
        type = "market";
        path = `dynamic/market/${crypto.randomUUID()}`;
        fallbackTitle = "Ibovespa";
      }

      const { error } = await supabase.from("media").insert({
        title: title.trim() || fallbackTitle,
        type,
        storage_path: path,
        duration: type === "video" ? 0 : Number(duration) || defaultDuration,
        start_date: startDate || null,
        end_date: endDate || null,
        content_config: contentConfig,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio publicado");
      setOpen(false);
      setTitle("");
      setFile(null);
      setDuration(defaultDuration);
      setStartDate("");
      setEndDate("");
      setCreationType("file");
      setCity("São Paulo");
      queryClient.invalidateQueries({ queryKey: ["anuncios"] });
    },
    onError: (error: Error) => {
      setUploading(false);
      toast.error("Não foi possível publicar", { description: error.message });
    },
  });

  const updateMedia = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<MediaRow> }) => {
      const { error } = await supabase.from("media").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anuncios"] }),
    onError: (error: Error) => toast.error("Não foi possível atualizar", { description: error.message }),
  });

  const deleteMedia = useMutation({
    mutationFn: async (media: MediaRow) => {
      if (!isDynamicMedia(media)) {
        await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
      }
      const { error } = await supabase.from("media").delete().eq("id", media.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio removido");
      queryClient.invalidateQueries({ queryKey: ["anuncios"] });
    },
    onError: (error: Error) => toast.error("Não foi possível remover", { description: error.message }),
  });

  const previewUrl = file ? URL.createObjectURL(file) : null;
  const isVideo = file?.type.startsWith("video") ?? false;

  function mediaDescription(media: MediaRow) {
    if (media.type === "video") return "Vídeo · duração do arquivo";
    if (media.type === "weather") return `Clima atualizado · ${media.duration}s`;
    if (media.type === "market") return `Ibovespa atualizado · ${media.duration}s`;
    return `Imagem · ${media.duration}s`;
  }

  return (
    <AdminShell
      title="Anúncios"
      description="Imagens, vídeos, clima e Ibovespa que entram nas playlists."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo anúncio</DialogTitle>
              <DialogDescription>
                Escolha um arquivo ou um conteúdo que se atualiza automaticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Tabs value={creationType} onValueChange={(value) => setCreationType(value as typeof creationType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="file"><ImageIcon className="mr-2 h-4 w-4" />Arquivo</TabsTrigger>
                  <TabsTrigger value="weather"><CloudSun className="mr-2 h-4 w-4" />Clima</TabsTrigger>
                  <TabsTrigger value="market"><TrendingUp className="mr-2 h-4 w-4" />Ibovespa</TabsTrigger>
                </TabsList>
                <TabsContent value="file" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="arquivo">Imagem ou vídeo</Label>
                    <Input id="arquivo" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                  {previewUrl ? (
                    <div className="overflow-hidden rounded-md border border-border bg-background">
                      {isVideo ? <video src={previewUrl} className="h-48 w-full object-contain" controls muted /> : <img src={previewUrl} alt="Pré-visualização" className="h-48 w-full object-contain" />}
                    </div>
                  ) : null}
                </TabsContent>
                <TabsContent value="weather" className="space-y-2">
                  <Label htmlFor="cidade">Cidade exibida</Label>
                  <Input id="cidade" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: São Paulo" />
                  <p className="text-xs text-muted-foreground">Temperatura, sensação, condição do tempo e vento são atualizados automaticamente.</p>
                </TabsContent>
                <TabsContent value="market">
                  <p className="text-sm text-muted-foreground">Exibe pontos e variação diária do Ibovespa. A fonte gratuita pode apresentar atraso.</p>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              {creationType !== "file" || !isVideo ? (
                <div className="space-y-2">
                  <Label htmlFor="duracao">Duração na tela (segundos)</Label>
                  <Input
                    id="duracao"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="inicio">Início da veiculação</Label>
                  <Input
                    id="inicio"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fim">Fim da veiculação</Label>
                  <Input
                    id="fim"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMedia.mutate()} disabled={(creationType === "file" && !file) || (creationType === "weather" && city.trim().length < 2) || uploading || createMedia.isPending}>
                {uploading ? "Enviando…" : "Publicar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(data?.media ?? []).map((media) => (
          <article key={media.id} className="panel overflow-hidden">
            <MediaPreview media={media} className="h-44 w-full" controls={media.type === "video"} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{media.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mediaDescription(media)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {media.start_date || media.end_date
                      ? `${media.start_date ?? "sempre"} → ${media.end_date ?? "sem fim"}`
                      : "Sem período definido"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover anúncio"
                  onClick={() => deleteMedia.mutate(media)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {media.active ? "No ar" : "Pausado"}
                </span>
                <Switch
                  checked={media.active}
                  onCheckedChange={(checked) =>
                    updateMedia.mutate({ id: media.id, values: { active: checked } })
                  }
                  aria-label="Ativar anúncio"
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      {!isLoading && (data?.media.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
           Nenhum anúncio ainda. Publique um arquivo, clima ou Ibovespa.
        </p>
      ) : null}
    </AdminShell>
  );
}
