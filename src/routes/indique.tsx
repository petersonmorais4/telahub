import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Building2,
  CheckCircle2,
  Gift,
  Handshake,
  Mail,
  Phone,
  Send,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/indique")({
  head: () => ({
    meta: [
      { title: "Indique e Ganhe — TelaHub" },
      {
        name: "description",
        content:
          "Indique um negócio para a rede TelaHub e ganhe 1 mês de anúncios grátis em até 10 telas.",
      },
      { property: "og:title", content: "Indique e Ganhe — TelaHub" },
      {
        property: "og:description",
        content:
          "Indique um negócio para a TelaHub e ganhe 1 mês de anúncios grátis em até 10 telas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Indique,
});

const schema = z.object({
  referrer: z.string().trim().min(2, "Informe seu nome").max(100, "Nome muito longo"),
  name: z.string().trim().min(2, "Informe o nome do responsável").max(100, "Nome muito longo"),
  email: z.string().trim().email("Informe um e-mail válido").max(255, "E-mail muito longo"),
  phone: z.string().trim().regex(/^\d{10,11}$/, "Informe um telefone válido com DDD"),
  referred: z
    .string()
    .trim()
    .min(2, "Informe o nome do negócio")
    .max(120, "Nome muito longo"),
});

type Form = z.infer<typeof schema>;

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

const steps = [
  { icon: Send, title: "1. Indique", text: "Conte qual negócio você conhece: academia, mercado, farmácia, barbearia..." },
  { icon: Handshake, title: "2. A gente conversa", text: "Nossa equipe entra em contato e apresenta a TelaHub para a sua indicação." },
  { icon: Gift, title: "3. Você ganha", text: "Fechou parceria? Você ganha 1 mês de anúncios grátis em até 10 telas da TelaHub." },
];

function Indique() {
  const [form, setForm] = useState<Form>({ referrer: "", name: "", email: "", phone: "", referred: "" });
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const i of parsed.error.issues) {
        const f = i.path[0] as keyof Form;
        if (!fe[f]) fe[f] = i.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { referrer, name, email, phone, referred } = parsed.data;
    const { error } = await supabase
      .from("advertiser_leads")
      .insert({ name, email, phone, company: `[Indicação de ${referrer}] ${referred}`.slice(0, 250) });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
      return;
    }
    setSent(true);
  }

  const field = (
    id: keyof Form,
    label: string,
    Icon: typeof User,
    props: React.ComponentProps<typeof Input>,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={id} className="pl-9" {...props} />
      </div>
      {errors[id] && <p className="text-sm text-destructive">{errors[id]}</p>}
    </div>
  );

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
            <h1 className="mt-4 text-2xl font-bold">Indicação recebida!</h1>
            <p className="mt-2 text-muted-foreground">
              Obrigado! Vamos falar com o negócio indicado e avisamos você assim que a parceria fechar.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => {
                  setSent(false);
                  setForm((f) => ({ referrer: f.referrer, name: "", email: "", phone: "", referred: "" }));
                  setPhoneDisplay("");
                }}
              >
                Indicar outro
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_26rem] lg:gap-20">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-primary">
                <Users className="h-4 w-4" aria-hidden /> Indique e Ganhe
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold sm:text-5xl">
                Conhece um negócio que merece uma tela TelaHub?
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Indique estabelecimentos para a nossa rede e, a cada parceria fechada, ganhe{" "}
                <strong className="text-foreground">1 mês de anúncios grátis em até 10 telas</strong> da TelaHub.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
                {steps.map((s) => (
                  <div key={s.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h2 className="font-semibold">{s.title}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-6 sm:p-8">
              <h2 className="text-xl font-bold">Faça sua indicação</h2>
              <p className="mt-2 text-sm text-muted-foreground">Leva menos de 1 minuto.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                {field("referrer", "Seu nome", User, {
                  placeholder: "Quem está indicando",
                  value: form.referrer,
                  onChange: (e) => setForm((f) => ({ ...f, referrer: e.target.value })),
                })}
                {field("referred", "Nome do negócio parceiro", Building2, {
                  placeholder: "Ex.: Mercado Bom Preço, Centro",
                  value: form.referred,
                  onChange: (e) => setForm((f) => ({ ...f, referred: e.target.value })),
                })}
                {field("name", "Responsável pelo negócio", User, {
                  placeholder: "Nome do responsável",
                  value: form.name,
                  onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })),
                })}
                {field("email", "E-mail do parceiro", Mail, {
                  type: "email",
                  placeholder: "contato@negocio.com",
                  value: form.email,
                  onChange: (e) => setForm((f) => ({ ...f, email: e.target.value })),
                })}
                {field("phone", "WhatsApp do parceiro", Phone, {
                  inputMode: "numeric",
                  placeholder: "(00) 00000-0000",
                  value: phoneDisplay,
                  onChange: (e) => {
                    const m = maskPhone(e.target.value);
                    setPhoneDisplay(m);
                    setForm((f) => ({ ...f, phone: m.replace(/\D/g, "") }));
                  },
                })}
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar indicação"}
                </Button>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
