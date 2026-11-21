# Tela de Clientes: juntar cada cliente em uma única pasta

## O que está errado hoje
Conferi os dados reais. Hoje a tela agrupa os clientes só pelo nome, e esse nome vem de lugares diferentes:
- O **contato do anúncio** guarda o nome da pessoa (ex.: "Igor Mescole", "Bruna Ramos", "Pablo").
- A **receita** guarda o nome da empresa (ex.: "Salus Design", "Belu Kids", "JP Manutenções").

Por isso o mesmo cliente aparece duas vezes: uma pasta com as artes e outra só com o financeiro.

Muitos anúncios, como Optica SJ, Hype Drink, Vibe Fit e Rogéria Franco, não têm contato cadastrado. Esses anúncios hoje nem aparecem na tela.

## Como vai ficar
Cada cliente passa a ter uma única pasta, montada nesta ordem:
1. **Mesmo e-mail = mesmo cliente.** Por exemplo, a Bruna Ramos fica com Felisberto Assessoria e Belu Kids na mesma pasta.
2. **A receita vai para a pasta do anúncio a que ela está ligada**, mesmo que esteja com o nome da empresa. Assim, o financeiro do Salus Design entra na pasta do Igor Mescole.
3. **Anúncios sem contato** são agrupados pelo nome do anúncio, ignorando "Vertical" e "Horizontal". Por exemplo, "Optica SJ" e "Optica SJ Vertical" ficam em uma pasta só.
4. Anúncios internos, como notícias, clima, Ibovespa e "TelaHUB Anuncie Aqui", ficam de fora da lista.

## Dentro da pasta
- **Cabeçalho:** nome do cliente, e-mails, quantidade de anúncios ativos e total recebido (o total não aparece para o perfil Operacional).
- **Anúncios agrupados:** a versão horizontal e a vertical da mesma arte aparecem juntas como "versões", cada uma com seu status, vigência e telas.
- **Financeiro:** histórico de pagamentos de todas as artes do cliente, com último pagamento e próximo vencimento.
- **Aviso "Sem contato cadastrado"** nas pastas que vieram do nome do anúncio, para você completar o cadastro quando quiser.

Nada muda no banco de dados nem nos relatórios.

## Detalhes técnicos
- Reescrever `groupClients` em `src/lib/clients.ts` com um agrupamento em etapas (união por e-mail, nome do contato, `media_id` da receita e, por último, título normalizado sem sufixo de orientação), incluindo também mídias sem contato.
- Manter uma lista de títulos internos que são ignorados.
- Atualizar `painel.clientes.tsx` para mostrar as versões agrupadas e o aviso de pasta sem contato.
- Atualizar `clients.test.ts` com os casos acima: e-mail comum, receita ligada por anúncio, versões vertical e horizontal, e mídia interna ignorada.
