# Clientes: tipo Parceiro ou Pagante, com painel de resumo

## Botão de tipo
- Dentro da pasta de cada cliente, um seletor com duas opções: **Pagante** ou **Parceiro**.
- No cartão de cada cliente na lista, uma etiqueta colorida mostrando o tipo.
- Clientes que você ainda não classificou aparecem assim:
  - **Pagante**, se já tiverem algum pagamento lançado;
  - **Sem tipo**, se não tiverem nenhum pagamento.
- Só Administrador e Operacional podem alterar o tipo.

## Painel no topo da tela de Clientes
- **Cartões:** total de clientes, pagantes, parceiros e sem tipo.
- **Artes em exibição agora**, separadas entre pagantes e parceiros.
- **Receita dos pagantes no mês** e **média por pagante**. Esses dois números ficam escondidos para o perfil Operacional, como já acontece com o resto do financeiro.
- **Gráfico de pizza** mostrando a proporção entre pagantes, parceiros e sem tipo.
- **Filtro rápido** acima da lista: Todos, Pagantes, Parceiros e Sem tipo.

## Detalhes técnicos
- Nova coluna opcional `client_type` (pagante/parceiro) em `media_contacts`, gravada em todos os anúncios da pasta, como já fazemos com nome, e-mail e telefone. As regras de acesso atuais já cobrem.
- `groupClients` passa a calcular `type` (explícito → senão pagante se houver receita → senão nulo), com teste.
- O painel é calculado no navegador a partir dos dados que a tela já carrega, sem consultas novas. O gráfico usa o componente de gráfico que o projeto já tem.
