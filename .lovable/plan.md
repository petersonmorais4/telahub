# Tela de Clientes: campanhas agrupadas e informações editáveis

## O problema
As artes "hamburguer 1", "hamburgueria 2", "hamburgueria 3" e "hamburgueria4" pertencem à mesma campanha, mas aparecem em pastas separadas. Isso acontece porque não têm contato cadastrado e os nomes são diferentes entre si. A regra automática não consegue adivinhar todos os casos, então você poderá juntar as artes à mão.

## O que muda

### 1. Agrupamento automático mais esperto
- Os números no fim do nome passam a ser ignorados. Por exemplo, "hamburgueria 2", "hamburgueria 3" e "hamburgueria4" viram uma única campanha.
- Também passam a ser ignorados "Vertical", "Horizontal" e a extensão do arquivo (.png, .jpg).

### 2. Juntar e separar à mão
- Dentro da pasta, o botão **"Adicionar anúncio a este cliente"** abre uma lista de busca com todos os anúncios. Ao escolher um, ele passa a pertencer a este cliente. Isso resolve casos como "hamburguer 1".
- Em cada anúncio da pasta, a opção **"Remover deste cliente"** o tira dali.
- Ao juntar anúncios, eles recebem o mesmo nome de cliente, e por isso continuam juntos daí em diante.

### 3. Tudo editável na pasta
O botão **"Editar cliente"** abre um formulário com:
- Nome do cliente
- E-mail
- Telefone
- Receber relatório semanal (sim ou não)
- Observações

Ao salvar, os dados valem para todos os anúncios da pasta. As informações de cada arte, como o período de exibição e se está ativa, também podem ser editadas ali dentro.

O financeiro continua sendo editado na tela de Receitas. Na pasta haverá um link "Ver em Receitas".

### 4. Permissões
- Somente Administrador e Operacional podem editar.
- O perfil de visualização só pode ver.

## Detalhes técnicos
- `artKey` passa a remover dígitos finais e a separação entre palavra e número ("hamburgueria4"). A regra ganha um teste para hamburguer/hamburgueria com números.
- Junção manual: gravar `client_name`, `client_email` e `client_phone` do grupo em `media_contacts` (upsert por `media_id`) do anúncio adicionado. Remover zera esses campos.
- Nova coluna opcional `client_notes` em `media_contacts`. As regras de acesso atuais já cobrem a edição.
- Período e status da arte são gravados em `media.start_date`, `end_date` e `active`.
