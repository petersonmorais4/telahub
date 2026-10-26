import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { lookupCep, type AddressForm } from "@/lib/address";

export function AddressFields({
  value,
  onChange,
}: {
  value: AddressForm;
  onChange: (next: AddressForm) => void;
}) {
  const [loadingCep, setLoadingCep] = useState(false);
  const set = (patch: Partial<AddressForm>) => onChange({ ...value, ...patch });

  async function onCepBlur() {
    setLoadingCep(true);
    try {
      const found = await lookupCep(value.cep);
      if (found) onChange({ ...value, ...found });
    } finally {
      setLoadingCep(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 space-y-1">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            inputMode="numeric"
            value={value.cep}
            onChange={(e) => set({ cep: e.target.value })}
            onBlur={onCepBlur}
            placeholder="00000-000"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="rua">Rua {loadingCep ? "(buscando…)" : ""}</Label>
          <Input id="rua" value={value.street} onChange={(e) => set({ street: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" value={value.address_number} onChange={(e) => set({ address_number: e.target.value })} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" value={value.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" value={value.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" maxLength={2} value={value.state} onChange={(e) => set({ state: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Label htmlFor="mapa">Mostrar no mapa da página inicial</Label>
        <Switch id="mapa" checked={value.show_on_map} onCheckedChange={(v) => set({ show_on_map: v })} />
      </div>
    </div>
  );
}
