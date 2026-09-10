import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Building2, MapPin, Hash, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parceiro")({
  head: () => ({
    meta: [
      { title: "Seja Parceiro — TelaHub" },
      {
        name: "description",
        content:
          "Tenha uma tela TelaHub no seu estabelecimento. Cadastre seu negócio e nossa equipe entra em contato.",
      },
      { property: "og:title", content: "Seja Parceiro — TelaHub" },
      {
        property: "og:description",
        content:
          "Cadastre seu negócio e tenha uma tela de anúncios no seu estabelecimento.",
      },
    ],
  }),
  component: Parceiro,
});

const partnerSchema = z.object({
  cnpj: z
    .string()
    .trim()
    .regex(/^\d{14}$/, "CNPJ deve ter 14 números (somente dígitos)"),
  business_name: z
    .string()
    .trim()
    .min(2, "Informe o nome do negócio")
    .max(150, "Nome muito longo"),
  address: z
    .string()
    .trim()
    .min(5, "Informe o endereço completo")
    .max(300, "Endereço muito longo"),
});

type PartnerForm = z.infer<typeof partnerSchema>;

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function Parceiro() {
  const [form, setForm] = useState<PartnerForm>({
    cnpj: "",
    business_name: "",
    address: "",
  });
  const [cnpjDisplay, setCnpjDisplay] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof PartnerForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = partnerSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof PartnerForm;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.from("partner_leads").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Voltar para a página inicial">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-lg px-6 py-16">
        {sent ? (
          <div className="panel p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold">Cadastro recebido!</h1>
            <p className="mt-2 text-muted-foreground">
              Obrigado pelo interesse. Nossa equipe vai analisar o seu negócio e
              entrar em contato em breve.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Seja Parceiro</h1>
            <p className="mt-3 text-muted-foreground">
              Tem um estabelecimento com circulação de pessoas? Tenha uma tela
              TelaHub no seu local. Preencha os dados abaixo e nossa equipe
              entra em contato.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="cnpj"
                    className="pl-9"
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                    value={cnpjDisplay}
                    onChange={(e) => {
                      const masked = maskCnpj(e.target.value);
                      setCnpjDisplay(masked);
                      setForm((f) => ({ ...f, cnpj: masked.replace(/\D/g, "") }));
                    }}
                  />
                </div>
                {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_name">Nome do negócio</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="business_name"
                    className="pl-9"
                    placeholder="Ex.: Academia Prime Fit"
                    value={form.business_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, business_name: e.target.value }))
                    }
                  />
                </div>
                {errors.business_name && (
                  <p className="text-sm text-destructive">{errors.business_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="address"
                    className="pl-9"
                    placeholder="Rua, número, bairro, cidade"
                    value={form.address}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar cadastro"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
