export interface AddressForm {
  cep: string;
  street: string;
  address_number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  show_on_map: boolean;
}

export const emptyAddress = (): AddressForm => ({
  cep: "",
  street: "",
  address_number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  show_on_map: false,
});

export async function lookupCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.erro) return null;
  return {
    street: (data.logradouro as string) ?? "",
    neighborhood: (data.bairro as string) ?? "",
    city: (data.localidade as string) ?? "",
    state: (data.uf as string) ?? "",
  };
}

async function nominatim(params: Record<string, string>) {
  const qs = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", ...params });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { "Accept-Language": "pt-BR" },
  });
  if (!res.ok) return null;
  const list = (await res.json()) as { lat: string; lon: string }[];
  if (!list.length) return null;
  return { latitude: Number(list[0].lat), longitude: Number(list[0].lon) };
}

/** Find coordinates for an address, falling back to less precise searches. */
export async function geocodeAddress(a: AddressForm) {
  const street = [a.street, a.address_number].filter(Boolean).join(", ");
  if (street && a.city) {
    const hit = await nominatim({ street, city: a.city, state: a.state });
    if (hit) return hit;
  }
  const cep = a.cep.replace(/\D/g, "");
  if (cep.length === 8) {
    const hit = await nominatim({ postalcode: `${cep.slice(0, 5)}-${cep.slice(5)}` });
    if (hit) return hit;
  }
  if (a.city) {
    const q = [a.neighborhood, a.city, a.state].filter(Boolean).join(", ");
    return nominatim({ q });
  }
  return null;
}

export function addressToRow(a: AddressForm) {
  return {
    cep: a.cep.replace(/\D/g, "") || null,
    street: a.street.trim() || null,
    address_number: a.address_number.trim() || null,
    complement: a.complement.trim() || null,
    neighborhood: a.neighborhood.trim() || null,
    city: a.city.trim() || null,
    state: a.state.trim().toUpperCase() || null,
    show_on_map: a.show_on_map,
  };
}
