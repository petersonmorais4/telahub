import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { User, Building2, Mail, Phone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/anunciar")({
  head: () => ({
    meta: [
      { title: "Quero Anunciar — TelaHub" },
      {
        name: "description",
        content:
          "Anuncie sua marca em telas de alta circulação. Preencha o formulário e nossa equipe entra em contato com uma proposta.",
      },
      { property: "og:title", content: "Quero Anunciar — TelaHub" },
      {
        property: "og:description",
        content:
          "Anuncie sua marca em telas de alta circulação. Preencha o formulário e nossa equipe entra em contato.",
      },
    ],
  }),
  component: Anunciar,
});

const advertiserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(120, "Nome muito longo"),
  company: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa ou marca")
    .max(150, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido")
    .max(255, "E-mail muito longo"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, "Informe um telefone válido com DDD"),
});

type AdvertiserForm = z.infer<typeof advertiserSchema>;

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function Anunciar() {
  const [form, setForm] = useState<AdvertiserForm>({
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof AdvertiserForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = advertiserSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AdvertiserForm;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const leadId = crypto.randomUUID();
    const { error } = await supabase.from("advertiser_leads").insert({ ...parsed.data, id: leadId });
    if (!error) void fetch("/api/public/lead-notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "advertiser", id: leadId }) }).catch(() => {});
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

      <section className="mx-auto max-w-lg px-6 py-16">
        {sent ? (
          <div className="panel p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold">Pedido recebido!</h1>
            <p className="mt-2 text-muted-foreground">
              Obrigado pelo interesse em anunciar. Nossa equipe vai entrar em
              contato com uma proposta sob medida para a sua marca.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Quero anunciar</h1>
            <p className="mt-3 text-muted-foreground">
              Coloque sua marca em telas de alta circulação. Preencha os dados
              abaixo e nossa equipe entra em contato com uma proposta.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Seu nome</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="name"
                    className="pl-9"
                    placeholder="Ex.: Maria Silva"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa ou marca</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="company"
                    className="pl-9"
                    placeholder="Ex.: Pizzaria do Bairro"
                    value={form.company}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company: e.target.value }))
                    }
                  />
                </div>
                {errors.company && (
                  <p className="text-sm text-destructive">{errors.company}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="voce@empresa.com.br"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    id="phone"
                    className="pl-9"
                    placeholder="(00) 90000-0000"
                    inputMode="numeric"
                    value={phoneDisplay}
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      setPhoneDisplay(masked);
                      setForm((f) => ({ ...f, phone: masked.replace(/\D/g, "") }));
                    }}
                  />
                </div>
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : "Solicitar proposta"}
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
