import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Hash,
  MapPin,
  Network,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parceiro")({
  head: () => ({
    meta: [
      { title: "Seja Parceiro — TelaHub" },
      {
        name: "description",
        content:
          "Seja parceiro TelaHub e divulgue seus produtos ou serviços gratuitamente em diversos pontos da rede.",
      },
      { property: "og:title", content: "Seja Parceiro — TelaHub" },
      {
        property: "og:description",
        content:
          "Divulgue seus produtos ou serviços gratuitamente em diversos estabelecimentos parceiros TelaHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const partnerBenefits = [
  {
    icon: Network,
    title: "Divulgação em toda a rede",
    text: "Seus produtos e serviços podem aparecer nas telas de diversos estabelecimentos parceiros.",
  },
  {
    icon: BadgeDollarSign,
    title: "Sem custo de divulgação",
    text: "Você ganha espaço para apresentar seu negócio em outros pontos parceiros sem pagar pela mídia.",
  },
  {
    icon: Store,
    title: "Mais alcance para o seu negócio",
    text: "Sua marca chega a novos públicos enquanto a tela do seu estabelecimento também valoriza a rede.",
  },
];

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
    const leadId = crypto.randomUUID();
    const { error } = await supabase.from("partner_leads").insert({ ...parsed.data, id: leadId });
    if (!error) void fetch("/api/public/lead-notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "partner", id: leadId }) }).catch(() => {});
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-background">
      <WhatsAppButton />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" aria-label="Voltar para a página inicial">
            <BrandLogo className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        {sent ? (
          <div className="panel mx-auto max-w-lg p-10 text-center">
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
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_26rem] lg:gap-20">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                Rede de parceiros TelaHub
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
                Seu negócio divulgado em diversos pontos parceiros, sem custo
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Ao receber uma tela TelaHub, seus produtos ou serviços também ganham
                espaço de divulgação em outros estabelecimentos da nossa rede.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
                {partnerBenefits.map((benefit) => (
                  <div key={benefit.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <benefit.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h2 className="font-semibold">{benefit.title}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {benefit.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6 sm:p-8">
              <h2 className="text-xl font-bold">Cadastre seu estabelecimento</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Preencha os dados e nossa equipe entrará em contato.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
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
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
