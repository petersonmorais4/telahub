# Cidade do clima no rodapé

## Objetivo
Permitir escolher, nas configurações do painel, qual cidade terá a temperatura exibida no rodapé de todas as telas.

## Alterações
- Adicionar o campo **Cidade da temperatura** em **Configurações**, preenchido inicialmente com **São Paulo**.
- Salvar a cidade junto às configurações gerais da conta.
- Fazer o rodapé das TVs buscar e mostrar automaticamente a temperatura e o nome da cidade escolhida.
- Manter a alternância atual entre clima e Ibovespa.
- Caso a cidade não seja encontrada, manter a última informação válida e indicar atualização sem interromper os anúncios.

## Detalhes técnicos
- Acrescentar `weather_city` às configurações existentes, com padrão `São Paulo`.
- Passar a configuração carregada pelo player ao rodapé informativo.
- Usar a cidade como parte da consulta e do cache do serviço meteorológico.
- Validar salvamento no painel e exibição no player.
