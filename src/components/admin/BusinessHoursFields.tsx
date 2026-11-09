import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DAY_NAMES, emptyBusinessHours, type BusinessHours } from "@/lib/business-hours";

export function BusinessHoursFields({ value, onChange }: { value: BusinessHours | null; onChange: (value: BusinessHours | null) => void }) {
  function updateDay(day: number, intervals: BusinessHours[number]) {
    const next = (value ?? emptyBusinessHours()).map((items) => [...items]);
    next[day] = intervals;
    onChange(next);
  }
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="hours-enabled">Horários de funcionamento</Label>
        <Switch id="hours-enabled" checked={value !== null} onCheckedChange={(enabled) => onChange(enabled ? emptyBusinessHours() : null)} />
      </div>
      {value === null ? <p className="text-sm text-muted-foreground">Não informado</p> : (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const periods = value[day] ?? [];
            return (
            <div key={day} className="space-y-2 border-b border-border pb-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`hours-day-${day}`}>{DAY_NAMES[day]}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{periods.length ? "Aberto" : "Fechado"}</span>
                  <Switch id={`hours-day-${day}`} checked={periods.length > 0} onCheckedChange={(open) => updateDay(day, open ? [{ start: "09:00", end: "18:00" }] : [])} />
                </div>
              </div>
              {periods.map((interval, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input className="min-w-0 flex-1" type="time" aria-label={`${DAY_NAMES[day]} abertura ${index + 1}`} value={interval.start} onChange={(e) => updateDay(day, periods.map((item, i) => i === index ? { ...item, start: e.target.value } : item))} />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input className="min-w-0 flex-1" type="time" aria-label={`${DAY_NAMES[day]} fechamento ${index + 1}`} value={interval.end} onChange={(e) => updateDay(day, periods.map((item, i) => i === index ? { ...item, end: e.target.value } : item))} />
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remover horário de ${DAY_NAMES[day]}`} title="Remover horário" onClick={() => updateDay(day, periods.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {periods.length > 0 && periods.length < 4 ? <Button type="button" size="sm" variant="outline" onClick={() => updateDay(day, [...periods, { start: "14:00", end: "18:00" }])}><Plus className="mr-2 h-3 w-3" />Adicionar período</Button> : null}
            </div>
          ); })}
          <p className="text-xs text-muted-foreground">Fuso: Brasília</p>
        </div>
      )}
    </div>
  );
}