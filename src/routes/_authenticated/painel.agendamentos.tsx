import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
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
import { WEEKDAY_LABELS, type MediaRow, type PlaylistRow, type ScheduleRow } from "@/lib/signage";

export const Route = createFileRoute("/_authenticated/painel/agendamentos")({
  head: () => ({
    meta: [
      { title: "Agendamentos — SinalIndoor" },
      {
        name: "description",
        content: "Programe dias da semana e horários em que cada playlist ou anúncio deve aparecer.",
      },
      { property: "og:title", content: "Agendamentos — SinalIndoor" },
      { property: "og:description", content: "Programação semanal das campanhas nas telas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgendamentosPage,
});

type Target = { kind: "playlist" | "media"; id: string };

function AgendamentosPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");

  const { data, isLoading } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: async () => {
      const [schedules, playlists, media] = await Promise.all([
        supabase.from("schedules").select("*").order("created_at", { ascending: false }),
        supabase.from("playlists").select("*").order("name"),
        supabase.from("media").select("*").order("title"),
      ]);
      return {
        schedules: (schedules.data ?? []) as ScheduleRow[],
        playlists: (playlists.data ?? []) as PlaylistRow[],
        media: (media.data ?? []) as MediaRow[],
      };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["agendamentos"] });

  const createSchedule = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Escolha uma playlist ou um anúncio.");
      if (weekdays.length === 0) throw new Error("Selecione ao menos um dia da semana.");
      const { error } = await supabase.from("schedules").insert({
        name: name.trim() || null,
        playlist_id: target.kind === "playlist" ? target.id : null,
        media_id: target.kind === "media" ? target.id : null,
        weekdays,
        start_time: startTime,
        end_time: endTime,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento criado");
      setName("");
      invalidate();
    },
    onError: (error: Error) => toast.error("Não foi possível criar", { description: error.message }),
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ScheduleRow> }) => {
      const { error } = await supabase.from("schedules").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento removido");
      invalidate();
    },
  });

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function targetLabel(schedule: ScheduleRow) {
    if (schedule.playlist_id) {
      const playlist = data?.playlists.find((p) => p.id === schedule.playlist_id);
      return `Playlist: ${playlist?.name ?? "removida"}`;
    }
    const media = data?.media.find((m) => m.id === schedule.media_id);
    return `Anúncio: ${media?.title ?? "removido"}`;
  }

  return (
    <AdminShell
      title="Agendamentos"
      description="Sem agendamento, a playlist ou o anúncio roda em todos os horários."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="panel space-y-4 p-5">
          <h2 className="text-base font-semibold">Novo agendamento</h2>

          <div className="space-y-2">
            <Label htmlFor="nome-agenda">Nome (opcional)</Label>
            <Input
              id="nome-agenda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campanha da manhã"
            />
          </div>

          <div className="space-y-2">
            <Label>Aplicar a</Label>
            <Select
              value={target ? `${target.kind}:${target.id}` : ""}
              onValueChange={(value) => {
                const [kind, id] = value.split(":");
                setTarget({ kind: kind as Target["kind"], id: id ?? "" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolher playlist ou anúncio" />
              </SelectTrigger>
              <SelectContent>
                {(data?.playlists ?? []).map((p) => (
                  <SelectItem key={p.id} value={`playlist:${p.id}`}>
                    Playlist · {p.name}
                  </SelectItem>
                ))}
                {(data?.media ?? []).map((m) => (
                  <SelectItem key={m.id} value={`media:${m.id}`}>
                    Anúncio · {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleWeekday(day)}
                  className={cn(
                    "rounded-md border border-border px-3 py-1.5 text-sm transition-colors",
                    weekdays.includes(day)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora-inicio">Começa às</Label>
              <Input
                id="hora-inicio"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora-fim">Termina às</Label>
              <Input
                id="hora-fim"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <Button className="w-full" onClick={() => createSchedule.mutate()} disabled={!target}>
            <Plus className="mr-2 h-4 w-4" /> Criar agendamento
          </Button>
        </section>

        <section className="panel divide-y divide-border">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : null}
          {(data?.schedules ?? []).map((schedule) => (
            <div key={schedule.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{schedule.name || targetLabel(schedule)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {targetLabel(schedule)} · {schedule.start_time.slice(0, 5)} às{" "}
                  {schedule.end_time.slice(0, 5)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <span
                      key={label}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        schedule.weekdays.includes(day)
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <Switch
                checked={schedule.active}
                onCheckedChange={(checked) =>
                  updateSchedule.mutate({ id: schedule.id, values: { active: checked } })
                }
                aria-label="Ativar agendamento"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Remover agendamento"
                onClick={() => deleteSchedule.mutate(schedule.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {!isLoading && (data?.schedules.length ?? 0) === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nenhum agendamento. Tudo que estiver ativo roda o dia inteiro.
            </p>
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
