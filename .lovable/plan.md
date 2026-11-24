# Cadastro de parceiro: telefone no lugar do CNPJ + e-mail corrigido

## O que muda para você
1. **Formulário "Cadastre seu estabelecimento"** (/parceiro) passa a ter, nesta ordem:
   - Nome da empresa/negócio
   - Endereço
   - Telefone (com máscara (11) 99999-9999, aceita fixo e celular)
   O campo CNPJ sai do formulário.
2. **E-mail de aviso** de novo parceiro (e também o de novo anunciante/indicação) volta a mostrar os dados preenchidos de forma legível, em vez do monte de código.

## Causa do e-mail com código (confirmada no código)
O aviso monta o conteúdo já em HTML, mas a função que aplica o layout da TelaHUB trata o texto como texto simples e "escapa" as tags — por isso o e-mail mostra `<h2>`, `<table>` etc. em vez das informações.

## Detalhes técnicos
- Migração: em `partner_leads`, adicionar coluna `phone text`, tornar `cnpj` opcional (nullable, mantendo os dados antigos) e trocar a política de inserção pública para validar nome (2–200), endereço (5–300) e telefone (10–13 dígitos), sem exigir CNPJ.
- `src/routes/parceiro.tsx`: schema zod com `business_name`, `address`, `phone` (só dígitos, 10–11); reordenar campos; ícone Phone; máscara de telefone.
- `src/lib/email-brand.ts`: adicionar opção para receber HTML pronto (sem escapar), mantendo o comportamento atual para os outros e-mails em texto.
- `src/routes/api/public/lead-notify.ts`: usar o modo HTML pronto; campos do parceiro = Estabelecimento, Endereço, Telefone (formatado).
- Conferir se o funil de vendas/lembretes usam `cnpj` do parceiro e ajustar para telefone onde aparecer.
- Validar: enviar um cadastro de teste e conferir o registro e o HTML gerado.
