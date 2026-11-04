import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET, getSignedUrl, type SettingsRow } from "@/lib/signage";

export const Route = createFileRoute("/_authenticated/painel/configuracoes")({
  head: () => ({
    meta: [
      { title: "TelaHUB — Configurações" },
      {
        name: "description",
        content: "Logo da empresa, cor de fundo do player, transição padrão e duração padrão das imagens.",
      },
      { property: "og:title", content: "TelaHUB — Configurações" },
      { property: "og:description", content: "Ajustes gerais do player e da conta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfiguracoesPage,
});

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
}

function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<SettingsRow>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const [settings, profiles, roles] = await Promise.all([
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("profiles").select("id, name, email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return {
        settings: (settings.data ?? null) as SettingsRow | null,
        profiles: (profiles.data ?? []) as ProfileRow[],
        roles: (roles.data ?? []) as { user_id: string; role: string }[],
      };
    },
  });

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data?.settings]);

  useEffect(() => {
    const path = data?.settings?.logo_url;
    if (!path) {
      setLogoPreview(null);
      return;
    }
    let alive = true;
    getSignedUrl(path).then((url) => {
      if (alive) setLogoPreview(url);
    });
    return () => {
      alive = false;
    };
  }, [data?.settings?.logo_url]);

  const save = useMutation({
    mutationFn: async (values: Partial<SettingsRow>) => {
      const weatherCity = values.weather_city?.trim();
      if (!weatherCity || weatherCity.length < 2) {
        throw new Error("Informe uma cidade válida para a temperatura.");
      }
      const { error } = await supabase
        .from("app_settings")
        .update({ ...values, weather_city: weatherCity, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
    },
    onError: (error: Error) => toast.error("Não foi possível salvar", { description: error.message }),
  });

  async function uploadLogo(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `logo-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    setUploading(false);
    if (error) {
      toast.error("Falha ao enviar a logo", { description: error.message });
      return;
    }
    save.mutate({ ...form, logo_url: path });
  }

  return (
    <AdminShell title="Configurações" description="Identidade e comportamento padrão do player.">
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-4 p-5">
          <h2 className="text-base font-semibold">Empresa e player</h2>

          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da empresa</Label>
            <Input
              id="empresa"
              value={form.company_name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo (aparece quando não há anúncio no ar)</Label>
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo da empresa"
                className="h-20 w-auto rounded border border-border bg-muted object-contain p-2"
              />
            ) : null}
            <Input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem quando não há anúncios</Label>
            <Input
              id="mensagem"
              value={form.idle_message ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, idle_message: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidade-temperatura">Cidade da temperatura</Label>
            <Input
              id="cidade-temperatura"
              value={form.weather_city ?? "São Paulo"}
              placeholder="Ex.: São Paulo"
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, weather_city: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Esta cidade aparecerá no rodapé de todas as telas.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fundo">Cor de fundo do player</Label>
              <Input
                id="fundo"
                type="color"
                className="h-10 p-1"
                value={form.player_bg ?? "#000000"}
                onChange={(e) => setForm((f) => ({ ...f, player_bg: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Transição</Label>
              <Select
                value={form.transition ?? "fade"}
                onValueChange={(value) => setForm((f) => ({ ...f, transition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade suave</SelectItem>
                  <SelectItem value="slide">Slide lateral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracao-padrao">Duração padrão das imagens (segundos)</Label>
            <Input
              id="duracao-padrao"
              type="number"
              min={1}
              value={form.default_duration ?? 10}
              onChange={(e) => setForm((f) => ({ ...f, default_duration: Number(e.target.value) }))}
            />
          </div>

          <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
            Salvar configurações
          </Button>
        </section>

        <section className="panel p-5">
          <h2 className="text-base font-semibold">Usuários do painel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O primeiro cadastro virou admin geral; os seguintes entram como operadores.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {(data?.profiles ?? []).map((profile) => {
              const role = data?.roles.find((r) => r.user_id === profile.id)?.role;
              return (
                <li key={profile.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{profile.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {role === "admin" ? "Administrador" : role === "operacional" ? "Operacional" : role === "operator" ? "Operador" : "Visualizador"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
